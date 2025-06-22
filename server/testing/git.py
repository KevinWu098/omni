#!/usr/bin/env python3
"""
Minimal GitHub repo puller
"""

import os
import requests
import subprocess
import zipfile
from pathlib import Path
import dotenv

dotenv.load_dotenv()

# Configuration
GITHUB_TOKEN = os.getenv('GITHUB_API_KEY')
REPOS_DIR = Path('repos')

def setup():
    """Create repos directory"""
    REPOS_DIR.mkdir(exist_ok=True)

def clone_repo(repo_url, destination=None):
    """Clone repository using git"""
    if not destination:
        repo_name = repo_url.split('/')[-1].replace('.git', '')
        destination = REPOS_DIR / repo_name
    
    if destination.exists():
        print(f"Repository already exists at {destination}")
        return str(destination)
    
    # Clone with token authentication
    auth_url = repo_url.replace('https://', f'https://{GITHUB_TOKEN}@')
    cmd = ['git', 'clone', auth_url, str(destination)]
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode == 0:
        print(f"✓ Cloned to {destination}")
        return str(destination)
    else:
        print(f"❌ Clone failed: {result.stderr}")
        return None

def download_repo_archive(repo_path, destination=None):
    """Download repository as ZIP archive"""
    if not destination:
        destination = REPOS_DIR / repo_path.replace('/', '_')
    
    if destination.exists():
        print(f"Repository already exists at {destination}")
        return str(destination)
    
    headers = {'Authorization': f'token {GITHUB_TOKEN}'}
    archive_url = f'https://api.github.com/repos/{repo_path}/zipball/main'
    
    response = requests.get(archive_url, headers=headers, stream=True)
    if response.status_code == 200:
        zip_path = destination.with_suffix('.zip')
        
        with open(zip_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        destination.mkdir(exist_ok=True)
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(destination)
        
        zip_path.unlink()  # Remove zip file
        print(f"✓ Downloaded to {destination}")
        return str(destination)
    else:
        print(f"❌ Download failed: {response.status_code}")
        return None

def pull_repo(repo_path_or_url, method='clone'):
    """Pull a repository by path or URL"""
    setup()
    
    if not GITHUB_TOKEN:
        print("❌ GITHUB_API_KEY environment variable not set")
        return None
    
    # Handle both URLs and repo paths
    if repo_path_or_url.startswith('https://github.com/'):
        repo_url = repo_path_or_url
        repo_path = repo_path_or_url.replace('https://github.com/', '')
    else:
        repo_path = repo_path_or_url
        repo_url = f'https://github.com/{repo_path}'
    
    if method == 'clone':
        return clone_repo(repo_url)
    elif method == 'download':
        return download_repo_archive(repo_path)
    else:
        print("❌ Method must be 'clone' or 'download'")
        return None

if __name__ == "__main__":
    # Example usage
    repo = "uno-p-5/krazy-vibe-coded-website"
    
    print("🚀 Pulling repository...")
    result = pull_repo(repo, method='clone')
    
    if result:
        print(f"📁 Repository available at: {result}")
    else:
        print("❌ Failed to pull repository")
