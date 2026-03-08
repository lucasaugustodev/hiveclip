"""Fix launcher scheduled task to include full PATH for CLI detection"""
import winrm
import os
import time

ip = "216.238.115.143"
pw = r"y)7Mtvp97m%(}dAx"

print(f"Connecting to {ip}...")
s = winrm.Session(ip, auth=("Administrator", pw), transport="ntlm")

# Get the full system + user PATH
r = s.run_ps('[Environment]::GetEnvironmentVariable("Path","Machine")')
machine_path = r.std_out.decode().strip()
r = s.run_ps('[Environment]::GetEnvironmentVariable("Path","User")')
user_path = r.std_out.decode().strip()

# Ensure npm global bin is there
npm_bin = r"C:\Users\Administrator\AppData\Roaming\npm"
full_path = machine_path
if npm_bin.lower() not in full_path.lower():
    full_path = full_path.rstrip(";") + ";" + npm_bin

print(f"Full PATH includes npm bin: {npm_bin.lower() in full_path.lower()}")

# Delete old task
print("Removing old scheduled task...")
s.run_cmd('schtasks /delete /tn "ClaudeLauncherWeb" /f')

# Kill existing node
print("Stopping existing launcher...")
s.run_cmd('taskkill /f /im node.exe')
time.sleep(2)

# Create a batch file that sets the PATH and starts the server
# This way SYSTEM user gets the right PATH
print("Creating launcher start script...")
bat_content = f"""@echo off
set PATH={full_path};%PATH%
set PORT=3001
cd /d C:\\claude-launcher-web
node server.js
"""
# Write bat file via PowerShell
escaped_bat = bat_content.replace("'", "''")
r = s.run_ps(f"Set-Content -Path 'C:\\claude-launcher-web\\start.bat' -Value '{escaped_bat}' -Encoding ASCII")
print(f"  Write bat: RC={r.status_code}")

# Create task as SYSTEM but running the bat file with full PATH
print("Creating scheduled task...")
r = s.run_cmd(
    'schtasks /create /tn "ClaudeLauncherWeb" /tr '
    '"cmd /c C:\\claude-launcher-web\\start.bat" '
    '/sc onstart /ru SYSTEM /rl HIGHEST /f'
)
print(f"  Task create RC: {r.status_code}")

# Start it
print("Starting launcher...")
r = s.run_cmd('schtasks /run /tn "ClaudeLauncherWeb"')
print(f"  Task run RC: {r.status_code}")

time.sleep(5)

# Verify port 3001
r = s.run_cmd('powershell -c "Test-NetConnection -ComputerName localhost -Port 3001 | Select-Object -ExpandProperty TcpTestSucceeded"')
print(f"Port 3001: {r.std_out.decode().strip()}")

# Test CLI status via API
import urllib.request, json
try:
    # Login first
    login_data = json.dumps({"username": "admin", "password": "Test1234"}).encode()
    req = urllib.request.Request(f"http://{ip}:3001/api/auth/login", data=login_data, headers={"Content-Type": "application/json"})
    resp = json.loads(urllib.request.urlopen(req, timeout=10).read())
    token = resp["token"]

    for cli in ["claude-cli", "github-cli", "gemini-cli", "cline-cli"]:
        req = urllib.request.Request(f"http://{ip}:3001/api/{cli}/status", headers={"Authorization": f"Bearer {token}"})
        data = json.loads(urllib.request.urlopen(req, timeout=10).read())
        print(f"  {cli}: installed={data.get('installed')}, version={data.get('version')}")
except Exception as e:
    print(f"  API check error: {e}")

print("Done!")
