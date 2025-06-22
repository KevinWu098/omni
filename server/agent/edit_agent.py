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


def pull_edit_pr_streaming(prompt, git_url, cleanup=True, pr_title=None, pr_body=None, source_branch=None, target_branch=None):
    """
    Streaming version of pull_edit_pr that yields progress updates
    
    Args:
        prompt (str): The prompt to give to the AI agent for editing
        git_url (str): The URL of the git repository to clone
        cleanup (bool): Whether to clean up the repo folder after creating PR (default: True)
        pr_title (str): Custom PR title (if None, AI will generate one)
        pr_body (str): Custom PR body (if None, AI will generate one)
        source_branch (str): Branch to clone from (default: main/master)
        target_branch (str): Branch to create PR against (default: main)
    
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
        if source_branch:
            yield stream_progress(f"📥 Cloning repository from branch: {source_branch}...", "clone")
        else:
            yield stream_progress("📥 Cloning repository...", "clone")
        
        repo_path = clone_repo(git_url, branch=source_branch)
        if not repo_path:
            yield stream_progress("❌ Failed to clone repository", "error", "error")
            return
        
        yield stream_progress(f"📁 Repository cloned to: {repo_path}", "cloned")
        
        # Use Fetch.ai agent with the provided prompt
        yield stream_progress("🤖 Initializing AI agent for code editing...", "agent_init")
        agent_result = call_fetch_agent(prompt, repo_path)
        if not agent_result["success"]:
            error_msg = f"AI agent failed: {agent_result.get('error', 'Unknown error')}"
            yield stream_progress(f"❌ {error_msg}", "error", "error")
            return
        
        yield stream_progress("✓ AI agent completed code changes successfully", "agent_complete")
        
        # Generate AI-powered PR metadata if not provided
        if pr_title is None or pr_body is None:
            yield stream_progress("🤖 Generating intelligent PR metadata...", "pr_metadata")
            agent = agent_result["agent"]
            actions = agent_result["actions"]
            
            pr_metadata = agent.generate_pr_metadata(
                actions, 
                repo_context=f"Repository: {git_url}"
            )
            
            if pr_metadata["success"]:
                yield stream_progress(f"✓ AI generated PR title: '{pr_metadata['title']}'", "pr_title")
                if pr_title is None:
                    pr_title = pr_metadata["title"]
                if pr_body is None:
                    pr_body = pr_metadata["body"]
            else:
                yield stream_progress(f"⚠️ AI metadata generation failed, using fallback: {pr_metadata.get('error', 'Unknown error')}", "pr_fallback")
                if pr_title is None:
                    pr_title = "AI Agent: Automated code changes"
                if pr_body is None:
                    pr_body = f"This PR was created by an AI agent.\n\nPrompt used: {prompt}"
        
        # Make PR with the metadata
        if target_branch:
            yield stream_progress(f"📤 Creating pull request against {target_branch}...", "pr_create")
        else:
            yield stream_progress("📤 Creating pull request...", "pr_create")
        
        pr_url = make_pr(repo_path, pr_title, body=pr_body, base=target_branch or 'main')
        
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