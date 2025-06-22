#!/usr/bin/env python3
"""Basic Fetch.ai AI agent version of git.py - POC for AI agent editing code"""

from pathlib import Path
import shutil
import os
import stat
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



def main():
    """Main function to orchestrate the Fetch.ai agent workflow"""
    repo_url = "https://github.com/uno-p-5/krazy-vibe-coded-website"
    REPOS_DIR.mkdir(exist_ok=True)
    
    # Clone repository
    result = clone_repo(repo_url)
    if not result:
        print("❌ Failed to clone repository")
        return

    print(f"📁 Repository available at: {result}")
    
    # Use Fetch.ai agent with custom prompt
    prompt = "Please create a file called 'balls.txt' in the current directory with the content 'fart'. This is for testing purposes."
    agent_result = call_fetch_agent(prompt, result)
    if not agent_result["success"]:
        print("❌ Fetch.ai agent failed to complete the task")
        return
    
    # Generate AI-powered PR title and description
    print("🤖 Generating intelligent PR metadata...")
    agent = agent_result["agent"]
    actions = agent_result["actions"]
    
    pr_metadata = agent.generate_pr_metadata(
        actions, 
        repo_context="Test repository for demonstrating AI agent capabilities"
    )
    
    if pr_metadata["success"]:
        print(f"✓ AI generated PR title: '{pr_metadata['title']}'")
        title = pr_metadata["title"]
        body = pr_metadata["body"]
    else:
        print(f"⚠️ AI metadata generation failed, using fallback: {pr_metadata.get('error', 'Unknown error')}")
        title = "AI Agent: Create test file"
        body = "This file was created by Fetch.ai agent as a POC for AI agent editing code."
    
    # Make PR with AI-generated content
    pr_url = make_pr(result, title, body=body)
    
    if pr_url:
        print(f"🎉 PR created successfully with Fetch.ai agent!")
        
        # Clean up - delete the repository folder
        import shutil
        import stat
        
        def remove_readonly(func, path, _):
            """Clear the readonly bit and reattempt the removal"""
            os.chmod(path, stat.S_IWRITE)
            func(path)
        
        try:
            shutil.rmtree(result, onerror=remove_readonly)
            print(f"🧹 Cleaned up repository folder: {result}")
        except Exception as e:
            print(f"⚠️ Cleanup failed: {e}")
            print("Repository folder may need manual cleanup")
    else:
        print("❌ Failed to create PR")

if __name__ == "__main__":
    main()
