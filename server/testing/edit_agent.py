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
        result = agent.agent_loop(prompt, workspace_path=repo_path, max_iterations=5)
        
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


def pull_edit_pr(prompt, git_url, cleanup=True, pr_title=None, pr_body=None):
    """
    Pull a repository, edit it using AI agent, and create a PR
    
    Args:
        prompt (str): The prompt to give to the AI agent for editing
        git_url (str): The URL of the git repository to clone
        cleanup (bool): Whether to clean up the repo folder after creating PR (default: True)
        pr_title (str): Custom PR title (if None, AI will generate one)
        pr_body (str): Custom PR body (if None, AI will generate one)
    
    Returns:
        dict: Result containing success status, PR URL, and other metadata
    """
    print(f"🚀 Starting pull_edit_pr workflow...")
    print(f"📋 Prompt: {prompt}")
    print(f"🔗 Repository: {git_url}")
    
    # Ensure repos directory exists
    REPOS_DIR.mkdir(exist_ok=True)
    
    # Clone repository
    print("📥 Cloning repository...")
    repo_path = clone_repo(git_url)
    if not repo_path:
        return {
            "success": False,
            "error": "Failed to clone repository",
            "pr_url": None
        }

    print(f"📁 Repository cloned to: {repo_path}")
    
    try:
        # Use Fetch.ai agent with the provided prompt
        agent_result = call_fetch_agent(prompt, repo_path)
        if not agent_result["success"]:
            return {
                "success": False,
                "error": f"AI agent failed: {agent_result.get('error', 'Unknown error')}",
                "pr_url": None,
                "repo_path": repo_path
            }
        
        # Generate AI-powered PR metadata if not provided
        if pr_title is None or pr_body is None:
            print("🤖 Generating intelligent PR metadata...")
            agent = agent_result["agent"]
            actions = agent_result["actions"]
            
            pr_metadata = agent.generate_pr_metadata(
                actions, 
                repo_context=f"Repository: {git_url}"
            )
            
            if pr_metadata["success"]:
                print(f"✓ AI generated PR title: '{pr_metadata['title']}'")
                if pr_title is None:
                    pr_title = pr_metadata["title"]
                if pr_body is None:
                    pr_body = pr_metadata["body"]
            else:
                print(f"⚠️ AI metadata generation failed, using fallback: {pr_metadata.get('error', 'Unknown error')}")
                if pr_title is None:
                    pr_title = "AI Agent: Automated code changes"
                if pr_body is None:
                    pr_body = f"This PR was created by an AI agent.\n\nPrompt used: {prompt}"
        
        # Make PR with the metadata
        print("📤 Creating pull request...")
        pr_url = make_pr(repo_path, pr_title, body=pr_body)
        
        if pr_url:
            print(f"🎉 PR created successfully!")
            print(f"🔗 PR URL: {pr_url}")
            
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
                cleanup_success = cleanup_repo(repo_path)
                result["cleanup_success"] = cleanup_success
            
            return result
        else:
            return {
                "success": False,
                "error": "Failed to create PR",
                "pr_url": None,
                "repo_path": repo_path
            }
            
    except Exception as e:
        return {
            "success": False,
            "error": f"Unexpected error: {str(e)}",
            "pr_url": None,
            "repo_path": repo_path
        }


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