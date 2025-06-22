#!/usr/bin/env python3
"""Fetch.ai SDK for AI-powered file operations and code editing"""

import os
import json
from pathlib import Path
from typing import Dict, List, Any, Optional, Union
import requests
from datetime import datetime


class FetchAIError(Exception):
    """Custom exception for Fetch.ai operations"""
    pass


class FetchAIAgent:
    """AI agent for automated code editing and file operations"""
    
    def __init__(self, api_key: Optional[str] = None, model: str = "claude-3-5-sonnet-20241022"):
        """Initialize the Fetch.ai agent with API configuration"""
        self.api_key = api_key or os.getenv('ANTHROPIC_API_KEY')
        self.model = model
        self.base_url = "https://api.anthropic.com/v1"
        self.headers = {
            "Content-Type": "application/json",
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01"
        }
        
        if not self.api_key:
            raise FetchAIError("API key not provided. Set ANTHROPIC_API_KEY environment variable.")
    
    def view(self, path: Union[str, Path]) -> Dict[str, Any]:
        """Read files or list directory contents"""
        path = Path(path)
        
        try:
            if not path.exists():
                return {
                    "success": False,
                    "error": f"Path does not exist: {path}",
                    "content": None
                }
            
            if path.is_file():
                # Read file content
                with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                
                return {
                    "success": True,
                    "type": "file",
                    "path": str(path),
                    "content": content,
                    "size": len(content),
                    "lines": len(content.splitlines())
                }
            
            elif path.is_dir():
                # List directory contents
                items = []
                for item in path.iterdir():
                    items.append({
                        "name": item.name,
                        "type": "directory" if item.is_dir() else "file",
                        "path": str(item)
                    })
                
                return {
                    "success": True,
                    "type": "directory",
                    "path": str(path),
                    "items": items,
                    "count": len(items)
                }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to read {path}: {str(e)}",
                "content": None
            }
    
    def str_replace(self, path: Union[str, Path], old_str: str, new_str: str) -> Dict[str, Any]:
        """Replace string in file with new string"""
        path = Path(path)
        
        try:
            if not path.exists() or not path.is_file():
                return {
                    "success": False,
                    "error": f"File does not exist: {path}"
                }
            
            # Read current content
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Check if old_str exists
            if old_str not in content:
                return {
                    "success": False,
                    "error": f"String not found in {path}: '{old_str[:50]}...'"
                }
            
            # Replace and write back
            new_content = content.replace(old_str, new_str)
            
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            
            return {
                "success": True,
                "path": str(path),
                "replacements": content.count(old_str),
                "old_length": len(content),
                "new_length": len(new_content)
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to replace string in {path}: {str(e)}"
            }
    
    def insert(self, path: Union[str, Path], insert_line: int, new_str: str) -> Dict[str, Any]:
        """Insert new string at specified line number (1-indexed)"""
        path = Path(path)
        
        try:
            if not path.exists() or not path.is_file():
                return {
                    "success": False,
                    "error": f"File does not exist: {path}"
                }
            
            # Read current content
            with open(path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            # Validate line number
            if insert_line < 1 or insert_line > len(lines) + 1:
                return {
                    "success": False,
                    "error": f"Invalid line number {insert_line}. File has {len(lines)} lines."
                }
            
            # Insert new content (convert to 0-indexed)
            lines.insert(insert_line - 1, new_str + '\n' if not new_str.endswith('\n') else new_str)
            
            # Write back
            with open(path, 'w', encoding='utf-8') as f:
                f.writelines(lines)
            
            return {
                "success": True,
                "path": str(path),
                "inserted_at_line": insert_line,
                "total_lines": len(lines)
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to insert into {path}: {str(e)}"
            }
    
    def create(self, path: Union[str, Path], file_text: str) -> Dict[str, Any]:
        """Create new file with specified content"""
        path = Path(path)
        
        try:
            # Create parent directories if they don't exist
            path.parent.mkdir(parents=True, exist_ok=True)
            
            # Check if file already exists
            if path.exists():
                return {
                    "success": False,
                    "error": f"File already exists: {path}"
                }
            
            # Create file
            with open(path, 'w', encoding='utf-8') as f:
                f.write(file_text)
            
            return {
                "success": True,
                "path": str(path),
                "size": len(file_text),
                "lines": len(file_text.splitlines())
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to create {path}: {str(e)}"
            }
    
    def agent_loop(self, task_description: str, workspace_path: Union[str, Path] = ".", max_iterations: int = 50) -> Dict[str, Any]:
        """Run an agent loop where AI can make multiple tool calls until task completion"""
        workspace_path = Path(workspace_path)
        actions_taken = []
        conversation_history = []
        
        print(f"🤖 Starting agent loop for task: {task_description}")
        
        for iteration in range(max_iterations):
            print(f"🔄 Agent iteration {iteration + 1}/{max_iterations}")
            
            # Get current workspace state
            workspace_info = self.view(workspace_path)
            
            # Build conversation context
            context = {
                "task": task_description,
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
            user_prompt = f"""Task: {task_description}

Current workspace: {workspace_path}
Workspace contents: {json.dumps(workspace_info, indent=2)}

Actions taken so far: {json.dumps(actions_taken, indent=2)}

What should I do next to complete this task? Respond with JSON only."""

            try:
                # Make API call
                response = requests.post(
                    f"{self.base_url}/messages",
                    headers=self.headers,
                    json={
                        "model": self.model,
                        "max_tokens": 2000,
                        "system": system_prompt,
                        "messages": [
                            {
                                "role": "user", 
                                "content": user_prompt
                            }
                        ]
                    }
                )
                
                if response.status_code != 200:
                    return {
                        "success": False,
                        "error": f"API request failed: {response.status_code}",
                        "actions_taken": actions_taken
                    }
                
                ai_response = response.json()
                content = ai_response.get("content", [{}])[0].get("text", "")
                
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
                
                print(f"🧠 Agent reasoning: {reasoning}")
                print(f"⚡ Agent action: {action}")
                
                # Execute the action
                if action == "complete":
                    return {
                        "success": True,
                        "message": "Task completed successfully",
                        "actions_taken": actions_taken,
                        "iterations": iteration + 1
                    }
                elif action == "abort":
                    return {
                        "success": False,
                        "message": "Agent decided to abort",
                        "reason": reasoning,
                        "actions_taken": actions_taken,
                        "iterations": iteration + 1
                    }
                elif action == "view":
                    result = self.view(parameters.get("path", "."))
                    actions_taken.append({
                        "type": "view",
                        "parameters": parameters,
                        "result": result,
                        "reasoning": reasoning
                    })
                elif action == "create":
                    result = self.create(parameters.get("path"), parameters.get("content", ""))
                    actions_taken.append({
                        "type": "create",
                        "parameters": parameters,
                        "result": result,
                        "reasoning": reasoning
                    })
                    if result["success"]:
                        print(f"✅ Created file: {parameters.get('path')}")
                elif action == "str_replace":
                    result = self.str_replace(
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
                    if result["success"]:
                        print(f"✅ Updated file: {parameters.get('path')}")
                elif action == "insert":
                    result = self.insert(
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
                    if result["success"]:
                        print(f"✅ Inserted into file: {parameters.get('path')}")
                else:
                    print(f"❓ Unknown action: {action}")
                    
            except Exception as e:
                return {
                    "success": False,
                    "error": f"Error in iteration {iteration + 1}: {str(e)}",
                    "actions_taken": actions_taken
                }
        
        # If we've reached max iterations
        return {
            "success": False,
            "error": f"Agent exceeded maximum iterations ({max_iterations})",
            "actions_taken": actions_taken
        }
    
    def apply_fixes(self, files_to_fix: List[str], fix_description: str) -> Dict[str, Any]:
        """Apply automated fixes to specified files"""
        results = []
        
        for file_path in files_to_fix:
            # Read the file first
            file_info = self.view(file_path)
            
            if not file_info["success"]:
                results.append({
                    "file": file_path,
                    "success": False,
                    "error": file_info["error"]
                })
                continue
            
            # Let AI analyze and suggest fixes
            fix_prompt = f"""Analyze this file and apply the requested fix: {fix_description}

File: {file_path}
Content:
{file_info['content']}

Please provide specific file operations to fix the issue."""
            
            ai_result = self.agent_loop(fix_prompt, workspace_path=Path(file_path).parent)
            results.append({
                "file": file_path,
                "success": ai_result["success"],
                "result": ai_result
            })
        
        return {
            "success": all(r["success"] for r in results),
            "results": results,
            "total_files": len(files_to_fix)
        }
    
    def generate_pr_metadata(self, actions_taken: List[Dict[str, Any]], repo_context: str = "") -> Dict[str, Any]:
        """Generate intelligent PR title and description based on actions taken"""
        
        # Build detailed summary of actions
        actions_summary = []
        files_created = []
        files_modified = []
        detailed_actions = []
        
        for action in actions_taken:
            action_type = action.get("type", "unknown")
            parameters = action.get("parameters", {})
            reasoning = action.get("reasoning", "")
            
            if action_type == "create":
                file_path = parameters.get("path", "unknown")
                content = parameters.get("content", "")
                files_created.append(file_path)
                actions_summary.append(f"Created {file_path}")
                detailed_actions.append(f"Created file '{file_path}' with content: '{content[:50]}{'...' if len(content) > 50 else ''}'")
            elif action_type == "str_replace":
                file_path = parameters.get("path", "unknown")
                old_str = parameters.get("old_str", "")
                new_str = parameters.get("new_str", "")
                files_modified.append(file_path)
                actions_summary.append(f"Updated content in {file_path}")
                detailed_actions.append(f"Replaced '{old_str[:30]}...' with '{new_str[:30]}...' in {file_path}")
            elif action_type == "insert":
                file_path = parameters.get("path", "unknown")
                text = parameters.get("text", "")
                line_num = parameters.get("line_num", 0)
                files_modified.append(file_path)
                actions_summary.append(f"Added lines to {file_path}")
                detailed_actions.append(f"Inserted '{text[:30]}...' at line {line_num} in {file_path}")
            elif action_type == "view":
                # Skip view actions in PR description as they're just for analysis
                continue
        
        # Create prompt for AI to generate PR metadata
        system_prompt = """You are an AI assistant that generates professional pull request titles and descriptions.
Based on the specific file operations performed, generate:
1. A concise, specific title (under 60 characters) describing exactly what was changed
2. A clear description explaining what files were created/modified and their actual content/purpose

Be SPECIFIC about what was actually done, not generic. Use the actual file names and content mentioned.
The title should be in imperative mood (e.g., "Add balls.txt test file", "Update configuration file", "Create Python module").
Avoid generic phrases like "initial setup" or "repository structure" unless that's literally what happened."""

        user_prompt = f"""Generate a specific PR title and description for these exact changes:

Repository context: {repo_context}

Specific actions performed:
{chr(10).join(detailed_actions)}

Files created: {files_created}
Files modified: {files_modified}

IMPORTANT: Be specific about what was actually done. If a test file was created, mention it's a test file. If content is unusual (like "fart"), acknowledge it's for testing. Don't be generic.

Respond with JSON: {{"title": "specific title here", "body": "detailed description here"}}"""

        try:
            # Make API call to generate PR metadata
            response = requests.post(
                f"{self.base_url}/messages",
                headers=self.headers,
                json={
                    "model": self.model,
                    "max_tokens": 1000,
                    "system": system_prompt,
                    "messages": [
                        {
                            "role": "user",
                            "content": user_prompt
                        }
                    ]
                }
            )
            
            if response.status_code != 200:
                return {
                    "success": False,
                    "error": f"API request failed: {response.status_code}",
                    "title": "AI-generated changes",
                    "body": "Changes made by Fetch.ai agent"
                }
            
            ai_response = response.json()
            content = ai_response.get("content", [{}])[0].get("text", "")
            
            # Try to parse JSON response
            try:
                pr_data = json.loads(content)
                return {
                    "success": True,
                    "title": pr_data.get("title", "AI-generated changes"),
                    "body": pr_data.get("body", "Changes made by Fetch.ai agent"),
                    "ai_response": content
                }
            except json.JSONDecodeError:
                # Fallback if JSON parsing fails
                return {
                    "success": False,
                    "title": "AI-generated changes",
                    "body": f"Changes made by Fetch.ai agent:\n\n{chr(10).join(actions_summary)}",
                    "ai_response": content
                }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to generate PR metadata: {str(e)}",
                "title": "AI-generated changes",
                "body": "Changes made by Fetch.ai agent"
            }


# Convenience functions for direct usage
def create_agent(api_key: Optional[str] = None) -> FetchAIAgent:
    """Create a new Fetch.ai agent instance"""
    return FetchAIAgent(api_key=api_key)


def quick_edit(task: str, workspace: str = ".") -> Dict[str, Any]:
    """Quick single-task editing"""
    agent = create_agent()
    return agent.agent_loop(task, workspace)


def batch_fix(files: List[str], description: str) -> Dict[str, Any]:
    """Apply fixes to multiple files"""
    agent = create_agent()
    return agent.apply_fixes(files, description) 