from flask import Flask, request, jsonify  
import asyncio  
import base64  
import os  
from dotenv import load_dotenv  
  
from browser_use import BrowserSession, BrowserProfile, Agent  
from langchain_openai import ChatOpenAI  
  
# Load environment variables  
load_dotenv()  
  
app = Flask(__name__)  
  
async def _run_nl_command(command: str):  
    # Create browser session with CDP connection  
    session = BrowserSession(  
        cdp_url="http://localhost:9222",  
        browser_profile=BrowserProfile(headless=True, disable_security=True)  
    )  
      
    # Initialize LLM  
    llm = ChatOpenAI(  
        model="gpt-4o",  
        temperature=0.0,  
        api_key=os.getenv("OPENAI_API_KEY")  
    )  
      
    # Create agent with the browser session and LLM  
    agent = Agent(  
        task=command,  
        llm=llm,  
        browser_session=session 
    )  
      
    try:  
        # Run the agent  
        result = await agent.run()  
        return str(result)  
    finally:  
        await session.stop()  
  
async def _take_screenshot(full_page: bool):    
    session = BrowserSession(    
        cdp_url="http://localhost:9222",  
        browser_profile=BrowserProfile(headless=True, disable_security=True)    
    )    
    await session.start()    
    try:              
        # Take screenshot of current page content  
        img_b64 = await session.take_screenshot(full_page=full_page)    
        return img_b64    
    finally:    
        await session.stop()
  
@app.route("/run_command", methods=["POST"])  
def run_command():  
    data = request.get_json(force=True)  
    command = data.get("command", "")  
    if not command:  
        return jsonify({"error": "Missing 'command' in JSON body"}), 400  
  
    try:  
        result = asyncio.run(_run_nl_command(command))  
        return jsonify({"result": result})  
    except Exception as e:  
        return jsonify({"error": str(e)}), 500  
  
@app.route("/screenshot", methods=["GET"])  
def screenshot():  
    full_page = request.args.get("full_page", "false").lower() == "true"  
    try:  
        img_b64 = asyncio.run(_take_screenshot(full_page))  
        return jsonify({"screenshot": img_b64})  
    except Exception as e:  
        return jsonify({"error": str(e)}), 500  
  
if __name__ == "__main__":  
    app.run(host="0.0.0.0", port=5000, debug=True)