
import os
import sys
import subprocess
import json
import datetime
import asyncio
import httpx
from pathlib import Path

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Constants
QA_REPORT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../docs/qa_reports"))
QA_SUITE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../tests/qa_suite"))
STATUS_FILE = os.path.join(QA_REPORT_DIR, "status.html")

# ASCII Art Assets
LOGO = r"""
   ______                                        ______                                __
  / ____/____   ____ ___   ____ ___   _____     / ____/_____ ____   __  __   ____     / /
 / /    / __ \ / __ `__ \ / __ `__ \ / __ \    / / __ / ___// __ \ / / / /  / __ \   / / 
/ /___ / /_/ // / / / / // / / / / // /_/ /   / /_/ // /   / /_/ // /_/ /  / / / /  / /_ 
\____/ \____//_/ /_/ /_//_/ /_/ /_/ \____/    \____//_/    \____/ \__,_/  /_/ /_/  /___/ 
                                                                                         
"""

def generate_timestamp():
    return datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

def run_tests():
    """Runs the QA test suite and returns the output and exit code."""
    print("Running QA Suite...")
    try:
        # Run pytest on the qa_suite directory
        # Using sys.executable ensures we use the same python interpreter (hopefully the venv one if running from venv)
        # But we should rely on the specific venv path if possible, or assume this script is run with the venv python
        result = subprocess.run(
            [sys.executable, "-m", "pytest", "-v", QA_SUITE_DIR],
            capture_output=True,
            text=True,
            env={**os.environ, "PYTHONPATH": os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))}
        )
        return result
    except Exception as e:
        print(f"Error running tests: {e}")
        return None

async def check_health():
    """Checks the health of the running application."""
    try:
        async with httpx.AsyncClient() as client:
            # Assuming app is running on localhost:8000
            res = await client.get("http://localhost:8000/health", timeout=5.0)
            if res.status_code == 200:
                return "ONLINE", res.json()
            else:
                return "DEGRADED", {"detail": f"Status {res.status_code}", "body": res.text}
    except Exception as e:
        return "OFFLINE", {"detail": f"Connection failed: {str(e)}"}

def generate_html(test_result, health_status, health_details):
    """Generates the static HTML status page."""
    
    timestamp = generate_timestamp()
    
    # Process Test Results
    if test_result:
        test_output = test_result.stdout + "\n" + test_result.stderr
        tests_passed = test_result.returncode == 0
        status_color = "#00ff00" if tests_passed else "#ff0000" # Green or Red
        test_status_text = "PASSED" if tests_passed else "FAILED"
    else:
        test_output = "No tests run or critical error."
        tests_passed = False
        status_color = "#ff0000"
        test_status_text = "ERROR"

    # API Status Color
    if health_status == "ONLINE":
        health_color = "#00ff00"
    elif health_status == "DEGRADED":
        health_color = "#ffff00" # Yellow
    else:
        health_color = "#ff0000"

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CommonGround QA Command Center</title>
    <style>
        body {{
            background-color: #0d1117;
            color: #00ff00;
            font-family: 'Courier New', Courier, monospace;
            padding: 20px;
            margin: 0;
            line-height: 1.2;
        }}
        pre {{
            white-space: pre-wrap;
            word-wrap: break-word;
        }}
        .header {{
            text-align: center;
            margin-bottom: 20px;
            color: #00ff00;
            text-shadow: 0 0 5px #00ff00;
        }}
        .status-bar {{
            border: 2px solid #333;
            padding: 10px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            background-color: #161b22;
        }}
        .section {{
            border: 1px solid #30363d;
            padding: 15px;
            margin-bottom: 20px;
            background-color: #0d1117;
        }}
        .section-title {{
            border-bottom: 1px solid #30363d;
            padding-bottom: 5px;
            margin-bottom: 10px;
            font-weight: bold;
            font-size: 1.2em;
        }}
        .log-output {{
            background-color: #000;
            padding: 10px;
            border: 1px solid #333;
            max-height: 600px;
            overflow-y: scroll;
            color: #ccc;
            font-size: 0.9em;
        }}
        
        /* Scanline effect */
        body::before {{
            content: " ";
            display: block;
            position: absolute;
            top: 0;
            left: 0;
            bottom: 0;
            right: 0;
            background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
            z-index: 2;
            background-size: 100% 2px, 3px 100%;
            pointer-events: none;
        }}
    </style>
</head>
<body>
    <div class="header">
        <pre>{LOGO}</pre>
        <h1>QA COMMAND CENTER</h1>
        <p>Last Updated: {timestamp}</p>
    </div>

    <div class="status-bar">
        <div>
            TEST SUITE STATUS: <span style="color: {status_color}; font-weight: bold;">{test_status_text}</span>
        </div>
        <div>
            API SYSTEM HEALTH: <span style="color: {health_color}; font-weight: bold;">{health_status}</span>
        </div>
    </div>

    <div class="section">
        <div class="section-title">SYSTEM HEALTH DETAILS</div>
        <pre>{json.dumps(health_details, indent=2)}</pre>
    </div>

    <div class="section">
        <div class="section-title">TEST EXECUTION LOGS</div>
        <div class="log-output">
<pre>{test_output}</pre>
        </div>
    </div>
    
    <div class="section">
        <div class="section-title">COMMANDS</div>
        <p>> Re-run: <span style="color: #fff">python3 mvp/backend/scripts/qa_dashboard.py</span></p>
    </div>
</body>
</html>
"""
    return html

async def main():
    print("----------------------------------------------------------------")
    print("   COMMON GROUND QA COMMAND CENTER - INITIALIZING")
    print("----------------------------------------------------------------")
    
    # 1. Run Tests
    print("[1/3] Running Extended QA Suite...")
    test_result = run_tests()
    if test_result.returncode == 0:
        print("      >> Tests PASSED")
    else:
        print("      >> Tests FAILED")
    
    # 2. Check Health
    print("[2/3] Checking System API Health...")
    health_status, health_details = await check_health()
    print(f"      >> Status: {health_status}")
    
    # 3. Generate Report
    print(f"[3/3] Generating Status Report at {STATUS_FILE}...")
    html_content = generate_html(test_result, health_status, health_details)
    
    os.makedirs(QA_REPORT_DIR, exist_ok=True)
    with open(STATUS_FILE, "w") as f:
        f.write(html_content)
    
    print("\n[SUCCESS] QA Command Center Update Complete.")
    print(f"Status Page: file://{STATUS_FILE}")

if __name__ == "__main__":
    asyncio.run(main())
