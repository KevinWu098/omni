#!/usr/bin/env python3
"""Minimal GitHub repo cloner"""

import os
import subprocess
from pathlib import Path
import dotenv
import requests
import re
import time

dotenv.load_dotenv()

GITHUB_TOKEN = os.getenv('GITHUB_API_KEY')
REPOS_DIR = Path('repos')

def clone_repo(repo_url, destination=None, branch=None):
    """Clone repository using git, optionally from a specific branch"""
    if not destination:
        repo_name = repo_url.split('/')[-1].replace('.git', '')
        destination = REPOS_DIR / repo_name

    if destination.exists():
        print(f"Repository already exists at {destination}")
        return str(destination)

    auth_url = repo_url.replace('https://', f'https://{GITHUB_TOKEN}@')
    
    # Build clone command with optional branch
    cmd = ['git', 'clone', auth_url, str(destination)]
    if branch:
        cmd.extend(['--branch', branch])
        print(f"🌿 Cloning branch: {branch}")
    
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode == 0:
        print(f"✓ Cloned to {destination}")
        return str(destination)
    else:
        print(f"❌ Clone failed: {result.stderr}")
        return None

def make_pr(path, title, body='', head=None, base='main'):
    """Create a pull request for changes in the repo at path."""
    if not GITHUB_TOKEN:
        print("❌ GITHUB_API_KEY environment variable not set")
        return None

    path = Path(path)
    if not path.exists():
        print(f"❌ Path {path} does not exist")
        return None

    head_branch = head or f"pr-{int(time.time())}"
    
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

if __name__ == "__main__":
    repo_url = "https://github.com/uno-p-5/krazy-vibe-coded-website"
    REPOS_DIR.mkdir(exist_ok=True)
    result = clone_repo(repo_url)
    if result:
        print(f"📁 Repository available at: {result}")
        
        # Create balls.txt with "fart" content
        balls_file = Path(result) / "balls.txt"
        balls_file.write_text("fart")
        print(f"✓ Created {balls_file}")
        
        # Make PR
        pr_url = make_pr(result, "create balls.txt")
        if pr_url:
            print(f"🎉 PR created successfully!")
            
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
    else:
        print("❌ Failed to clone repository")
