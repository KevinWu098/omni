#!/usr/bin/env python3
"""Basic Claude Code version of git.py - POC for AI agent editing code"""

import os
import subprocess
from pathlib import Path
import dotenv
import requests
import re
import time
import anyio
from claude_code_sdk import query, ClaudeCodeOptions

dotenv.load_dotenv()

GITHUB_TOKEN = os.getenv('GITHUB_API_KEY')
REPOS_DIR = Path('repos')

def clone_repo(repo_url, destination=None):
    """Clone repository using git"""
    if not destination:
        repo_name = repo_url.split('/')[-1].replace('.git', '')
        destination = REPOS_DIR / repo_name

    if destination.exists():
        print(f"Repository already exists at {destination}")
        return str(destination)

    auth_url = repo_url.replace('https://', f'https://{GITHUB_TOKEN}@')
    cmd = ['git', 'clone', auth_url, str(destination)]
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode == 0:
        print(f"✓ Cloned to {destination}")
        return str(destination)
    else:
        print(f"❌ Clone failed: {result.stderr}")
        return None

async def claude_create_file(repo_path):
    """Use Claude Code to create balls.txt file"""
    print("🤖 Using Claude Code to create balls.txt file...")
    
    # Change to repo directory for Claude Code
    options = ClaudeCodeOptions(
        max_turns=3,
        cwd=Path(repo_path),
        allowed_tools=["Write", "Read"],
        permission_mode="acceptEdits"
    )
    
    prompt = """Please create a file called 'balls.txt' in the current directory with the content 'fart'. This is for testing purposes."""
    
    messages = []
    async for message in query(prompt=prompt, options=options):
        messages.append(message)
        print("🤖 Claude: message received")
    
    # Check if file was created
    balls_file = Path(repo_path) / "balls.txt"
    if balls_file.exists():
        content = balls_file.read_text().strip()
        print(f"✓ Claude successfully created {balls_file} with content: '{content}'")
        return True
    else:
        print("❌ Claude failed to create the file")
        return False

def make_pr(path, title, body='', head=None, base='main'):
    """Create a pull request for changes in the repo at path."""
    if not GITHUB_TOKEN:
        print("❌ GITHUB_API_KEY environment variable not set")
        return None

    path = Path(path)
    if not path.exists():
        print(f"❌ Path {path} does not exist")
        return None

    head_branch = head or f"claude-pr-{int(time.time())}"
    
    # Configure git user for this repo (use funny-ai-pipeline account)
    subprocess.run(['git', 'config', 'user.name', 'funny-ai-pipeline'], cwd=str(path), capture_output=True, text=True)
    subprocess.run(['git', 'config', 'user.email', 'funny-ai-pipeline@users.noreply.github.com'], cwd=str(path), capture_output=True, text=True)
    
    # Check if there are any changes to commit
    result = subprocess.run(['git', 'status', '--porcelain'], cwd=str(path), capture_output=True, text=True)
    if not result.stdout.strip():
        print("ℹ️ No changes detected, aborting PR creation")
        return None
    
    # Create new branch
    result = subprocess.run(['git', 'checkout', '-b', head_branch], cwd=str(path), capture_output=True, text=True)
    if result.returncode != 0:
        print(f"❌ Failed to create branch {head_branch}: {result.stderr}")
        return None

    # Stage and commit changes
    result = subprocess.run(['git', 'add', '.'], cwd=str(path), capture_output=True, text=True)
    if result.returncode != 0:
        print(f"❌ Failed to stage changes: {result.stderr}")
        return None

    result = subprocess.run(['git', 'commit', '-m', title], cwd=str(path), capture_output=True, text=True)
    if result.returncode != 0:
        print(f"❌ Failed to commit changes: {result.stderr}")
        return None

    # Push branch
    result = subprocess.run(['git', 'push', '-u', 'origin', head_branch], cwd=str(path), capture_output=True, text=True)
    if result.returncode != 0:
        print(f"❌ Failed to push branch {head_branch}: {result.stderr}")
        return None

    # Get remote URL
    result = subprocess.run(['git', 'config', '--get', 'remote.origin.url'], cwd=str(path), capture_output=True, text=True)
    remote_url = result.stdout.strip()
    
    # Normalize remote URL - remove authentication token
    if remote_url.startswith('https://'):
        # Remove token from URL: https://token@github.com/owner/repo -> https://github.com/owner/repo
        remote_url = re.sub(r'https://[^@]*@github\.com/', 'https://github.com/', remote_url)
    elif remote_url.startswith('git@github.com:'):
        remote_url = remote_url.replace('git@github.com:', 'https://github.com/')
    
    # Remove .git suffix
    if remote_url.endswith('.git'):
        remote_url = remote_url[:-4]
    
    # Extract owner and repo name
    if 'github.com/' in remote_url:
        owner_repo = remote_url.split('github.com/')[-1]
        parts = owner_repo.split('/')
        owner, repo_name = parts[0], parts[1]
    else:
        print(f"❌ Could not parse GitHub URL: {remote_url}")
        return None

    # Create PR
    api_url = f'https://api.github.com/repos/{owner}/{repo_name}/pulls'
    headers = {'Authorization': f'token {GITHUB_TOKEN}', 'Accept': 'application/vnd.github.v3+json'}
    data = {'title': title, 'head': head_branch, 'base': base, 'body': body}
    
    print(f"🔍 Debug: API URL: {api_url}")
    print(f"🔍 Debug: Owner: {owner}, Repo: {repo_name}")
    print(f"🔍 Debug: Head branch: {head_branch}")
    
    response = requests.post(api_url, json=data, headers=headers)
    if response.status_code in (200, 201):
        pr = response.json()
        pr_url = pr.get('html_url')
        print(f"✓ Pull request created: {pr_url}")
        return pr_url
    else:
        print(f"❌ Failed to create PR: {response.status_code}")
        print(f"Response: {response.text}")
        return None

async def main():
    """Main function to orchestrate the Claude Code workflow"""
    repo_url = "https://github.com/uno-p-5/krazy-vibe-coded-website"
    REPOS_DIR.mkdir(exist_ok=True)
    
    # Clone repository
    result = clone_repo(repo_url)
    if not result:
        print("❌ Failed to clone repository")
        return

    print(f"📁 Repository available at: {result}")
    
    # Use Claude Code to create the file
    file_created = await claude_create_file(result)
    if not file_created:
        print("❌ Claude failed to create the file")
        return
    
    # Make PR with Claude Code generated content
    pr_url = make_pr(result, "Claude Code: create balls.txt", 
                     body="This file was created by Claude Code as a POC for AI agent editing code.")
    
    if pr_url:
        print(f"🎉 PR created successfully with Claude Code!")
        
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
    anyio.run(main)
