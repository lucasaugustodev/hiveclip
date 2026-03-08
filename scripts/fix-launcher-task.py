"""Fix launcher scheduled task to run as Administrator instead of SYSTEM"""
import winrm
import os
import time

ip = "216.238.115.143"
pw = r"y)7Mtvp97m%(}dAx"

print(f"Connecting to {ip}...")
s = winrm.Session(ip, auth=("Administrator", pw), transport="ntlm")

# Delete old task
print("Removing old scheduled task...")
r = s.run_cmd('schtasks /delete /tn "ClaudeLauncherWeb" /f')
print(f"  Delete RC: {r.status_code}")

# Kill existing node processes
print("Stopping existing launcher...")
s.run_cmd('taskkill /f /im node.exe')
time.sleep(2)

# Create new task running as Administrator
# Use PowerShell to create the task to avoid password escaping issues with schtasks
print("Creating new scheduled task as Administrator...")
ps_cmd = r"""
$action = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument '/c cd /d C:\claude-launcher-web && set PORT=3001 && node server.js' -WorkingDirectory 'C:\claude-launcher-web'
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId 'Administrator' -LogonType Password -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval ([TimeSpan]::FromMinutes(1))
Register-ScheduledTask -TaskName 'ClaudeLauncherWeb' -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force
"""
r = s.run_ps(ps_cmd)
print(f"  Create output: {r.std_out.decode().strip()[:200]}")
if r.status_code != 0:
    print(f"  Create error: {r.std_err.decode()[:200]}")

# Start the task
print("Starting launcher...")
r = s.run_cmd('schtasks /run /tn "ClaudeLauncherWeb"')
print(f"  Start RC: {r.status_code}")

time.sleep(5)

# Verify port 3001
r = s.run_cmd('powershell -c "Test-NetConnection -ComputerName localhost -Port 3001 | Select-Object -ExpandProperty TcpTestSucceeded"')
print(f"Port 3001: {r.std_out.decode().strip()}")

# Now test CLI detection
r = s.run_cmd('whoami')
print(f"Current user: {r.std_out.decode().strip()}")

# Check if claude is in path for Administrator
r = s.run_cmd('where claude')
print(f"Claude location: {r.std_out.decode().strip()}")

r = s.run_cmd('claude --version')
print(f"Claude version: {r.std_out.decode().strip()}")

print("Done!")
