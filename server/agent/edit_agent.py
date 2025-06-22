#!/usr/bin/env python3
"""AI agent for editing code repositories and creating PRs"""

import os
import stat
import shutil
from pathlib import Path
from fetch import FetchAIAgent
from git import clone_repo, make_pr, REPOS_DIR


def call_fetch_agent(prompt, repo_path):
    """Call Fetch.ai agent with a custom prompt and return results"""
    print(f"🤖 Calling Fetch.ai agent with prompt: '{prompt}'")
    
    try:
        # Initialize the Fetch.ai agent
        agent = FetchAIAgent()
        
        # Run the agent loop with the custom prompt
        result = agent.agent_loop(prompt, workspace_path=repo_path, max_iterations=50)
        
        if result["success"]:
            print(f"✓ Fetch.ai agent completed task successfully")
            return {
                "success": True,
                "agent": agent,
                "actions": result["actions_taken"],
                "iterations": result.get("iterations", 0)
            }
        else:
            print(f"❌ Fetch.ai agent failed: {result.get('error', 'Unknown error')}")
            return {"success": False, "error": result.get("error", "Unknown error")}
            
    except Exception as e:
        print(f"❌ Error with Fetch.ai agent: {str(e)}")
        return {"success": False, "error": str(e)}


def call_fetch_agent_streaming_generator(prompt, repo_path):
    """Call Fetch.ai agent with streaming progress updates (generator version)"""
    import json
    from fetch import FetchAIAgent
    from pathlib import Path
    import requests
    
    def stream_progress(message, step=None, data_type="progress"):
        """Helper function to yield SSE formatted progress updates"""
        progress_data = {
            'type': data_type,
            'message': message,
            'step': step or 'unknown'
        }
        return f"data: {json.dumps(progress_data)}\n\n"
    
    yield stream_progress(f"🤖 Calling Fetch.ai agent with prompt: '{prompt}'", "agent_start")
    
    try:
        # Initialize the Fetch.ai agent
        agent = FetchAIAgent()
        yield stream_progress("✓ Fetch.ai agent initialized", "agent_initialized")
        
        # Run agent loop with manual iterations for streaming
        workspace_path = Path(repo_path)
        actions_taken = []
        max_iterations = 50
        
        for iteration in range(max_iterations):
            yield stream_progress(f"🔄 Agent iteration {iteration + 1}/{max_iterations}", f"iteration_{iteration + 1}")
            
            # Get current workspace state
            workspace_info = agent.view(workspace_path)
            
            # Build conversation context
            context = {
                "task": prompt,
                "workspace": str(workspace_path),
                "workspace_contents": workspace_info,
                "actions_taken": actions_taken,
                "iteration": iteration + 1
            }
            
            # System prompt for the agent
            system_prompt = """You are an autonomous AI agent with file management capabilities. You can:

1. view(path) - Read files or list directories  
2. str_replace(path, old_str, new_str) - Replace text in files
3. insert(path, line_num, text) - Insert text at specific lines
4. create(path, content) - Create new files

IMPORTANT: You must respond with a JSON object containing:
- "action": one of ["view", "str_replace", "insert", "create", "complete", "abort"]
- "parameters": object with the parameters for the action
- "reasoning": string explaining why you're taking this action
- "status": "continue" or "complete" or "abort"

If action is "complete", you're done. If "abort", you're stopping due to an error.
For file operations, check if files exist first using "view" before modifying them."""

            # Build user prompt with context
            user_prompt = f"""Task: {prompt}

Current workspace: {workspace_path}
Workspace contents: {json.dumps(workspace_info, indent=2)}

Actions taken so far: {json.dumps(actions_taken, indent=2)}

What should I do next to complete this task? Respond with JSON only."""

            try:
                # Make API call
                yield stream_progress(f"🧠 AI thinking (iteration {iteration + 1})...", f"thinking_{iteration + 1}")
                
                response = requests.post(
                    f"{agent.base_url}/chat/completions",
                    headers=agent.headers,
                    json={
                        "model": agent.model,
                        "max_tokens": 2000,
                        "messages": [
                            {
                                "role": "system",
                                "content": system_prompt
                            },
                            {
                                "role": "user", 
                                "content": user_prompt
                            }
                        ]
                    },
                    timeout=30
                )
                
                if response.status_code != 200:
                    yield stream_progress(f"❌ API request failed: {response.status_code}", "error")
                    yield {
                        "success": False,
                        "error": f"API request failed: {response.status_code}",
                        "actions": actions_taken
                    }
                    return
                
                ai_response = response.json()
                content = ai_response.get("choices", [{}])[0].get("message", {}).get("content", "")
                
                # Parse AI response
                try:
                    decision = json.loads(content)
                except json.JSONDecodeError:
                    # Try to extract JSON from response
                    import re
                    json_match = re.search(r'\{.*\}', content, re.DOTALL)
                    if json_match:
                        decision = json.loads(json_match.group())
                    else:
                        yield stream_progress("❌ Could not parse AI response as JSON", "error")
                        yield {
                            "success": False,
                            "error": "Could not parse AI response as JSON",
                            "actions": actions_taken,
                            "raw_response": content
                        }
                        return
                
                action = decision.get("action", "abort")
                parameters = decision.get("parameters", {})
                reasoning = decision.get("reasoning", "No reasoning provided")
                status = decision.get("status", "abort")
                
                yield stream_progress(f"🧠 Agent reasoning: {reasoning}", f"reasoning_{iteration + 1}")
                yield stream_progress(f"⚡ Agent action: {action}", f"action_{iteration + 1}")
                
                # Execute the action
                if action == "complete":
                    yield stream_progress("✅ Agent completed task successfully", "completed")
                    yield {
                        "success": True,
                        "message": "Task completed successfully",
                        "agent": agent,
                        "actions": actions_taken,
                        "iterations": iteration + 1
                    }
                    return
                elif action == "abort":
                    yield stream_progress(f"🛑 Agent aborted: {reasoning}", "aborted")
                    yield {
                        "success": False,
                        "message": "Agent decided to abort",
                        "reason": reasoning,
                        "actions": actions_taken,
                        "iterations": iteration + 1
                    }
                    return
                elif action == "view":
                    result = agent.view(parameters.get("path", "."))
                    actions_taken.append({
                        "type": "view",
                        "parameters": parameters,
                        "result": result,
                        "reasoning": reasoning
                    })
                    if result.get("success"):
                        yield stream_progress(f"📄 Viewed: {parameters.get('path', '.')}", f"viewed_{iteration + 1}")
                elif action == "create":
                    result = agent.create(parameters.get("path"), parameters.get("content", ""))
                    actions_taken.append({
                        "type": "create",
                        "parameters": parameters,
                        "result": result,
                        "reasoning": reasoning
                    })
                    if result.get("success"):
                        yield stream_progress(f"📝 Created file: {parameters.get('path')}", f"created_{iteration + 1}")
                elif action == "str_replace":
                    result = agent.str_replace(
                        parameters.get("path"), 
                        parameters.get("old_str"), 
                        parameters.get("new_str")
                    )
                    actions_taken.append({
                        "type": "str_replace",
                        "parameters": parameters,
                        "result": result,
                        "reasoning": reasoning
                    })
                    if result.get("success"):
                        yield stream_progress(f"✏️ Updated file: {parameters.get('path')}", f"updated_{iteration + 1}")
                elif action == "insert":
                    result = agent.insert(
                        parameters.get("path"),
                        parameters.get("line_num", 1),
                        parameters.get("text", "")
                    )
                    actions_taken.append({
                        "type": "insert", 
                        "parameters": parameters,
                        "result": result,
                        "reasoning": reasoning
                    })
                    if result.get("success"):
                        yield stream_progress(f"📝 Inserted into file: {parameters.get('path')}", f"inserted_{iteration + 1}")
                else:
                    yield stream_progress(f"❓ Unknown action: {action}", f"unknown_{iteration + 1}")
                    
            except Exception as e:
                yield stream_progress(f"❌ Error in iteration {iteration + 1}: {str(e)}", "error")
                yield {
                    "success": False,
                    "error": f"Error in iteration {iteration + 1}: {str(e)}",
                    "actions": actions_taken
                }
                return
        
        # If we've reached max iterations
        yield stream_progress(f"⏰ Agent exceeded maximum iterations ({max_iterations})", "timeout")
        yield {
            "success": False,
            "error": f"Agent exceeded maximum iterations ({max_iterations})",
            "actions": actions_taken
        }
        
    except Exception as e:
        yield stream_progress(f"❌ Error with Fetch.ai agent: {str(e)}", "error")
        yield {"success": False, "error": str(e)}


def call_fetch_agent_streaming(prompt, repo_path, stream_callback=None):
    """Call Fetch.ai agent with streaming progress updates"""
    import json
    from fetch import FetchAIAgent
    from pathlib import Path
    import requests
    
    def stream_update(message, step=None, data_type="progress"):
        """Helper to send streaming updates"""
        if stream_callback:
            stream_callback(message, step, data_type)
    
    stream_update(f"🤖 Calling Fetch.ai agent with prompt: '{prompt}'", "agent_start")
    
    try:
        # Initialize the Fetch.ai agent
        agent = FetchAIAgent()
        stream_update("✓ Fetch.ai agent initialized", "agent_initialized")
        
        # Run agent loop with manual iterations for streaming
        workspace_path = Path(repo_path)
        actions_taken = []
        max_iterations = 50
        
        for iteration in range(max_iterations):
            stream_update(f"🔄 Agent iteration {iteration + 1}/{max_iterations}", f"iteration_{iteration + 1}")
            
            # Get current workspace state
            workspace_info = agent.view(workspace_path)
            
            # Build conversation context
            context = {
                "task": prompt,
                "workspace": str(workspace_path),
                "workspace_contents": workspace_info,
                "actions_taken": actions_taken,
                "iteration": iteration + 1
            }
            
            # System prompt for the agent
            system_prompt = """You are an autonomous AI agent with file management capabilities. You can:

1. view(path) - Read files or list directories  
2. str_replace(path, old_str, new_str) - Replace text in files
3. insert(path, line_num, text) - Insert text at specific lines
4. create(path, content) - Create new files

IMPORTANT: You must respond with a JSON object containing:
- "action": one of ["view", "str_replace", "insert", "create", "complete", "abort"]
- "parameters": object with the parameters for the action
- "reasoning": string explaining why you're taking this action
- "status": "continue" or "complete" or "abort"

If action is "complete", you're done. If "abort", you're stopping due to an error.
For file operations, check if files exist first using "view" before modifying them."""

            # Build user prompt with context
            user_prompt = f"""Task: {prompt}

Current workspace: {workspace_path}
Workspace contents: {json.dumps(workspace_info, indent=2)}

Actions taken so far: {json.dumps(actions_taken, indent=2)}

What should I do next to complete this task? Respond with JSON only."""

            try:
                # Make API call
                stream_update(f"🧠 AI thinking (iteration {iteration + 1})...", f"thinking_{iteration + 1}")
                
                response = requests.post(
                    f"{agent.base_url}/chat/completions",
                    headers=agent.headers,
                    json={
                        "model": agent.model,
                        "max_tokens": 2000,
                        "messages": [
                            {
                                "role": "system",
                                "content": system_prompt
                            },
                            {
                                "role": "user", 
                                "content": user_prompt
                            }
                        ]
                    },
                    timeout=30
                )
                
                if response.status_code != 200:
                    stream_update(f"❌ API request failed: {response.status_code}", "error")
                    return {
                        "success": False,
                        "error": f"API request failed: {response.status_code}",
                        "actions_taken": actions_taken
                    }
                
                ai_response = response.json()
                content = ai_response.get("choices", [{}])[0].get("message", {}).get("content", "")
                
                # Parse AI response
                try:
                    decision = json.loads(content)
                except json.JSONDecodeError:
                    # Try to extract JSON from response
                    import re
                    json_match = re.search(r'\{.*\}', content, re.DOTALL)
                    if json_match:
                        decision = json.loads(json_match.group())
                    else:
                        stream_update("❌ Could not parse AI response as JSON", "error")
                        return {
                            "success": False,
                            "error": "Could not parse AI response as JSON",
                            "actions_taken": actions_taken,
                            "raw_response": content
                        }
                
                action = decision.get("action", "abort")
                parameters = decision.get("parameters", {})
                reasoning = decision.get("reasoning", "No reasoning provided")
                status = decision.get("status", "abort")
                
                stream_update(f"🧠 Agent reasoning: {reasoning}", f"reasoning_{iteration + 1}")
                stream_update(f"⚡ Agent action: {action}", f"action_{iteration + 1}")
                
                # Execute the action
                if action == "complete":
                    stream_update("✅ Agent completed task successfully", "completed")
                    return {
                        "success": True,
                        "message": "Task completed successfully",
                        "agent": agent,
                        "actions": actions_taken,
                        "iterations": iteration + 1
                    }
                elif action == "abort":
                    stream_update(f"🛑 Agent aborted: {reasoning}", "aborted")
                    return {
                        "success": False,
                        "message": "Agent decided to abort",
                        "reason": reasoning,
                        "actions": actions_taken,
                        "iterations": iteration + 1
                    }
                elif action == "view":
                    result = agent.view(parameters.get("path", "."))
                    actions_taken.append({
                        "type": "view",
                        "parameters": parameters,
                        "result": result,
                        "reasoning": reasoning
                    })
                    if result.get("success"):
                        stream_update(f"📄 Viewed: {parameters.get('path', '.')}", f"viewed_{iteration + 1}")
                elif action == "create":
                    result = agent.create(parameters.get("path"), parameters.get("content", ""))
                    actions_taken.append({
                        "type": "create",
                        "parameters": parameters,
                        "result": result,
                        "reasoning": reasoning
                    })
                    if result.get("success"):
                        stream_update(f"📝 Created file: {parameters.get('path')}", f"created_{iteration + 1}")
                elif action == "str_replace":
                    result = agent.str_replace(
                        parameters.get("path"), 
                        parameters.get("old_str"), 
                        parameters.get("new_str")
                    )
                    actions_taken.append({
                        "type": "str_replace",
                        "parameters": parameters,
                        "result": result,
                        "reasoning": reasoning
                    })
                    if result.get("success"):
                        stream_update(f"✏️ Updated file: {parameters.get('path')}", f"updated_{iteration + 1}")
                elif action == "insert":
                    result = agent.insert(
                        parameters.get("path"),
                        parameters.get("line_num", 1),
                        parameters.get("text", "")
                    )
                    actions_taken.append({
                        "type": "insert", 
                        "parameters": parameters,
                        "result": result,
                        "reasoning": reasoning
                    })
                    if result.get("success"):
                        stream_update(f"📝 Inserted into file: {parameters.get('path')}", f"inserted_{iteration + 1}")
                else:
                    stream_update(f"❓ Unknown action: {action}", f"unknown_{iteration + 1}")
                    
            except Exception as e:
                stream_update(f"❌ Error in iteration {iteration + 1}: {str(e)}", "error")
                return {
                    "success": False,
                    "error": f"Error in iteration {iteration + 1}: {str(e)}",
                    "actions": actions_taken
                }
        
        # If we've reached max iterations
        stream_update(f"⏰ Agent exceeded maximum iterations ({max_iterations})", "timeout")
        return {
            "success": False,
            "error": f"Agent exceeded maximum iterations ({max_iterations})",
            "actions": actions_taken
        }
        
    except Exception as e:
        stream_update(f"❌ Error with Fetch.ai agent: {str(e)}", "error")
        return {"success": False, "error": str(e)}


def cleanup_repo(repo_path):
    """Clean up repository folder after processing"""
    def remove_readonly(func, path, _):
        """Clear the readonly bit and reattempt the removal"""
        os.chmod(path, stat.S_IWRITE)
        func(path)
    
    try:
        shutil.rmtree(repo_path, onerror=remove_readonly)
        print(f"🧹 Cleaned up repository folder: {repo_path}")
        return True
    except Exception as e:
        print(f"⚠️ Cleanup failed: {e}")
        print("Repository folder may need manual cleanup")
        return False


def pull_edit_pr(prompt, git_url, cleanup=True, pr_title=None, pr_body=None, progress_callback=None, source_branch=None, target_branch=None):
    """
    Pull a repository, edit it using AI agent, and create a PR
    
    Args:
        prompt (str): The prompt to give to the AI agent for editing
        git_url (str): The URL of the git repository to clone
        cleanup (bool): Whether to clean up the repo folder after creating PR (default: True)
        pr_title (str): Custom PR title (if None, AI will generate one)
        pr_body (str): Custom PR body (if None, AI will generate one)
        progress_callback (callable): Optional callback function for progress updates
        source_branch (str): Branch to clone from (default: main/master)
        target_branch (str): Branch to create PR against (default: main)
    
    Returns:
        dict: Result containing success status, PR URL, and other metadata
    """
    def log_progress(message, step=None):
        """Helper function to log progress"""
        print(message)
        if progress_callback:
            progress_callback(message, step)
    
    log_progress("🚀 Starting pull_edit_pr workflow...", "init")
    log_progress(f"📋 Prompt: {prompt}", "prompt")
    log_progress(f"🔗 Repository: {git_url}", "repo")
    
    # Ensure repos directory exists
    REPOS_DIR.mkdir(exist_ok=True)
    
    # Clone repository
    if source_branch:
        log_progress(f"📥 Cloning repository from branch: {source_branch}...", "clone")
    else:
        log_progress("📥 Cloning repository...", "clone")
    
    repo_path = clone_repo(git_url, branch=source_branch)
    if not repo_path:
        return {
            "success": False,
            "error": "Failed to clone repository",
            "pr_url": None
        }

    log_progress(f"📁 Repository cloned to: {repo_path}", "cloned")
    
    try:
        # Use Fetch.ai agent with the provided prompt
        log_progress("🤖 Initializing AI agent for code editing...", "agent_init")
        agent_result = call_fetch_agent(prompt, repo_path)
        if not agent_result["success"]:
            return {
                "success": False,
                "error": f"AI agent failed: {agent_result.get('error', 'Unknown error')}",
                "pr_url": None,
                "repo_path": repo_path
            }
        
        log_progress("✓ AI agent completed code changes successfully", "agent_complete")
        
        # Generate AI-powered PR metadata if not provided
        if pr_title is None or pr_body is None:
            log_progress("🤖 Generating intelligent PR metadata...", "pr_metadata")
            agent = agent_result["agent"]
            actions = agent_result["actions"]
            
            pr_metadata = agent.generate_pr_metadata(
                actions, 
                repo_context=f"Repository: {git_url}"
            )
            
            if pr_metadata["success"]:
                log_progress(f"✓ AI generated PR title: '{pr_metadata['title']}'", "pr_title")
                if pr_title is None:
                    pr_title = pr_metadata["title"]
                if pr_body is None:
                    pr_body = pr_metadata["body"]
            else:
                log_progress(f"⚠️ AI metadata generation failed, using fallback: {pr_metadata.get('error', 'Unknown error')}", "pr_fallback")
                if pr_title is None:
                    pr_title = "AI Agent: Automated code changes"
                if pr_body is None:
                    pr_body = f"This PR was created by an AI agent.\n\nPrompt used: {prompt}"
        
        # Make PR with the metadata
        if target_branch:
            log_progress(f"📤 Creating pull request against {target_branch}...", "pr_create")
        else:
            log_progress("📤 Creating pull request...", "pr_create")
        
        pr_url = make_pr(repo_path, pr_title, body=pr_body, base=target_branch or 'main')
        
        if pr_url:
            log_progress("🎉 PR created successfully!", "pr_success")
            log_progress(f"🔗 PR URL: {pr_url}", "pr_url")
            
            result = {
                "success": True,
                "pr_url": pr_url,
                "pr_title": pr_title,
                "pr_body": pr_body,
                "actions": agent_result["actions"],
                "iterations": agent_result["iterations"],
                "repo_path": repo_path
            }
            
            # Clean up if requested
            if cleanup:
                log_progress("🧹 Cleaning up repository folder...", "cleanup")
                cleanup_success = cleanup_repo(repo_path)
                result["cleanup_success"] = cleanup_success
                if cleanup_success:
                    log_progress("✓ Repository folder cleaned up successfully", "cleanup_complete")
            
            return result
        else:
            return {
                "success": False,
                "error": "Failed to create PR",
                "pr_url": None,
                "repo_path": repo_path
            }
            
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        log_progress(f"❌ {error_msg}", "error")
        return {
            "success": False,
            "error": error_msg,
            "pr_url": None,
            "repo_path": repo_path
        }


def pull_edit_pr_streaming(prompt, git_url, cleanup=True, branch=None):
    """
    Streaming version of pull_edit_pr that yields progress updates
    
    Args:
        prompt (str): The prompt to give to the AI agent for editing
        git_url (str): The URL of the git repository to clone
        cleanup (bool): Whether to clean up the repo folder after creating PR (default: True)
        branch (str): Branch to clone from and create PR against (default: main)
    
    Yields:
        str: Server-sent event formatted progress updates
    """
    import json
    
    def stream_progress(message, step=None, data_type="progress"):
        """Helper function to yield SSE formatted progress updates"""
        progress_data = {
            'type': data_type,
            'message': message,
            'step': step or 'unknown'
        }
        return f"data: {json.dumps(progress_data)}\n\n"
    
    try:
        yield stream_progress("🚀 Starting pull_edit_pr workflow...", "init")
        yield stream_progress(f"📋 Prompt: {prompt}", "prompt")
        yield stream_progress(f"🔗 Repository: {git_url}", "repo")
        
        # Ensure repos directory exists
        REPOS_DIR.mkdir(exist_ok=True)
        
        # Clone repository
        if branch:
            yield stream_progress(f"📥 Cloning repository from branch: {branch}...", "clone")
        else:
            yield stream_progress("📥 Cloning repository...", "clone")
        
        repo_path = clone_repo(git_url, branch=branch)
        if not repo_path:
            yield stream_progress("❌ Failed to clone repository", "error", "error")
            return
        
        yield stream_progress(f"📁 Repository cloned to: {repo_path}", "cloned")
        
        # Use Fetch.ai agent with the provided prompt (streaming version)  
        yield stream_progress("🤖 Initializing AI agent for code editing...", "agent_init")
        
        # Use generator-based streaming for agent
        agent_generator = call_fetch_agent_streaming_generator(prompt, repo_path)
        agent_result = None
        
        for update in agent_generator:
            if isinstance(update, dict) and "success" in update:
                # This is the final result
                agent_result = update
                break
            else:
                # This is a streaming progress update
                yield update
        
        if not agent_result or not agent_result["success"]:
            error_msg = f"AI agent failed: {agent_result.get('error', 'Unknown error') if agent_result else 'No result returned'}"
            yield stream_progress(f"❌ {error_msg}", "error", "error")
            return
        
        yield stream_progress("✓ AI agent completed code changes successfully", "agent_complete")
        
        # Generate AI-powered PR metadata
        yield stream_progress("🤖 Generating intelligent PR metadata...", "pr_metadata")
        agent = agent_result["agent"]
        actions = agent_result["actions"]
        
        pr_metadata = agent.generate_pr_metadata(
            actions, 
            repo_context=f"Repository: {git_url}"
        )
        
        if pr_metadata["success"]:
            yield stream_progress(f"✓ AI generated PR title: '{pr_metadata['title']}'", "pr_title")
            pr_title = pr_metadata["title"]
            pr_body = pr_metadata["body"]
        else:
            error_msg = pr_metadata.get('error', 'Unknown error')
            yield stream_progress(f"⚠️ AI metadata generation failed: {error_msg}", "pr_fallback")
            yield stream_progress(f"📋 Full metadata response: {pr_metadata}", "debug")
            pr_title = "AI Agent: Automated code changes"
            pr_body = f"This PR was created by an AI agent.\n\nPrompt used: {prompt}"
        
        # Make PR with the metadata
        if branch:
            yield stream_progress(f"📤 Creating pull request against {branch}...", "pr_create")
        else:
            yield stream_progress("📤 Creating pull request...", "pr_create")
        
        pr_url = make_pr(repo_path, pr_title, body=pr_body, base=branch or 'main')
        
        if pr_url:
            yield stream_progress("🎉 PR created successfully!", "pr_success")
            yield stream_progress(f"🔗 PR URL: {pr_url}", "pr_url")
            
            # Stream success result
            success_data = {
                'type': 'success',
                'pr_url': pr_url,
                'pr_title': pr_title,
                'pr_body': pr_body,
                'actions': agent_result["actions"],
                'iterations': agent_result["iterations"],
                'repo_path': repo_path
            }
            
            yield f"data: {json.dumps(success_data)}\n\n"
            
            # Clean up if requested
            if cleanup:
                yield stream_progress("🧹 Cleaning up repository folder...", "cleanup")
                cleanup_success = cleanup_repo(repo_path)
                if cleanup_success:
                    yield stream_progress("✓ Repository folder cleaned up successfully", "cleanup_complete")
                    success_data["cleanup_success"] = True
                else:
                    yield stream_progress("⚠️ Repository cleanup failed", "cleanup_failed")
                    success_data["cleanup_success"] = False
            
        else:
            yield stream_progress("❌ Failed to create PR", "error", "error")
            
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        yield stream_progress(f"❌ {error_msg}", "error", "error")


def main():
    """Example usage of pull_edit_pr function"""
    # Example from the original fetch_ai_edit_test.py
    result = pull_edit_pr(
        prompt="Please create a file called 'balls.txt' in the current directory with the content 'fart'. This is for testing purposes.",
        git_url="https://github.com/uno-p-5/krazy-vibe-coded-website"
    )
    
    if result["success"]:
        print(f"✅ Workflow completed successfully!")
        print(f"🔗 PR URL: {result['pr_url']}")
    else:
        print(f"❌ Workflow failed: {result['error']}")


if __name__ == "__main__":
    main() 