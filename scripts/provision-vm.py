"""
HiveClip VM Provisioner
Installs TightVNC + claude-launcher-web on a Windows VM via WinRM.
"""
import winrm
import sys
import os
import time

# Read credentials from args or env vars
ip = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("VM_IP", "")
pw = sys.argv[2] if len(sys.argv) > 2 else os.environ.get("VM_PASS", "")

if not ip or not pw:
    print("Usage: provision-vm.py <ip> <password>")
    sys.exit(1)

GITHUB_VNC_URL = "https://github.com/lucasaugustodev/hiveclip/releases/download/vnc-installer/tightvnc.msi"
TIGHTVNC_URL = "https://www.tightvnc.com/download/2.8.84/tightvnc-2.8.84-gpl-setup-64bit.msi"
LAUNCHER_REPO = "https://github.com/lucasaugustodev/claude-launcher-web.git"

print(f"Connecting to {ip}...")
s = winrm.Session(ip, auth=("Administrator", pw), transport="ntlm")

r = s.run_cmd("hostname")
print(f"Hostname: {r.std_out.decode().strip()}")

# ========== STEP 1: Install TightVNC ==========
print("\n=== Step 1: TightVNC ===")
r = s.run_ps("Get-Service tvnserver -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Status")
vnc_status = r.std_out.decode().strip()
print(f"TightVNC status: {vnc_status or 'NOT INSTALLED'}")

if "Running" not in vnc_status:
    msi_path = r"C:\Users\Administrator\vnc.msi"
    downloaded = False
    for url in [GITHUB_VNC_URL, TIGHTVNC_URL]:
        print(f"Downloading from {url[:60]}...")
        r = s.run_cmd(f'curl.exe -L -o "{msi_path}" "{url}" --connect-timeout 15 --max-time 180')
        if r.status_code == 0:
            r2 = s.run_cmd(f'powershell -c "(Get-Item \'{msi_path}\').Length"')
            size = int(r2.std_out.decode().strip() or "0")
            if size > 1000000:
                print(f"  Downloaded OK ({size} bytes)")
                downloaded = True
                break
            print(f"  File too small ({size} bytes)")
        else:
            print(f"  Failed (RC={r.status_code})")

    if not downloaded:
        print("ERROR: Could not download TightVNC MSI")
        sys.exit(1)

    print("Installing TightVNC...")
    r = s.run_cmd(
        f'msiexec /i "{msi_path}" /quiet /norestart '
        'ADDLOCAL=Server SET_USEVNCAUTHENTICATION=1 VALUE_OF_USEVNCAUTHENTICATION=1 '
        'SET_PASSWORD=1 VALUE_OF_PASSWORD=hiveclip123 '
        'SET_USECONTROLAUTHENTICATION=1 VALUE_OF_USECONTROLAUTHENTICATION=1 '
        'SET_CONTROLPASSWORD=1 VALUE_OF_CONTROLPASSWORD=hiveclip123'
    )
    print(f"  Install RC: {r.status_code}")

    r = s.run_cmd('netsh advfirewall firewall add rule name=VNC-5900 dir=in action=allow protocol=TCP localport=5900')
    print(f"  Firewall RC: {r.status_code}")

    time.sleep(5)
    r = s.run_cmd('net start tvnserver')
    print(f"  Start RC: {r.status_code}")

r = s.run_cmd('sc query tvnserver')
if "RUNNING" in r.std_out.decode():
    print("TightVNC: OK")
else:
    print("WARNING: TightVNC not running")

# ========== STEP 2: Install claude-launcher-web ==========
print("\n=== Step 2: claude-launcher-web ===")

# Check if already installed
r = s.run_cmd(r'dir C:\claude-launcher-web\server.js')
launcher_exists = r.status_code == 0

if not launcher_exists:
    # Install Node.js if not present
    r = s.run_cmd('node --version')
    if r.status_code != 0:
        print("Installing Node.js...")
        r = s.run_cmd(
            'curl.exe -L -o C:/Users/Administrator/node-setup.msi '
            '"https://nodejs.org/dist/v22.14.0/node-v22.14.0-x64.msi" '
            '--connect-timeout 15 --max-time 300'
        )
        if r.status_code == 0:
            r2 = s.run_cmd(r'msiexec /i C:\Users\Administrator\node-setup.msi /quiet /norestart')
            print(f"  Node.js install RC: {r2.status_code}")
            time.sleep(5)
        else:
            print("  WARNING: Node.js download failed")
    else:
        print(f"Node.js: {r.std_out.decode().strip()}")

    # Install Git if not present
    r = s.run_cmd('git --version')
    if r.status_code != 0:
        print("Installing Git...")
        r = s.run_cmd(
            'curl.exe -L -o C:/Users/Administrator/git-setup.exe '
            '"https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.2/Git-2.47.1.2-64-bit.exe" '
            '--connect-timeout 15 --max-time 300'
        )
        if r.status_code == 0:
            r2 = s.run_cmd(r'C:\Users\Administrator\git-setup.exe /VERYSILENT /NORESTART /NOCANCEL /SP- /CLOSEAPPLICATIONS /RESTARTAPPLICATIONS /COMPONENTS="icons,ext\reg\shellhere,assoc,assoc_sh"')
            print(f"  Git install RC: {r2.status_code}")
            time.sleep(5)
        else:
            print("  WARNING: Git download failed")
    else:
        print(f"Git: {r.std_out.decode().strip()}")

    # Clone claude-launcher-web
    print("Cloning claude-launcher-web...")
    r = s.run_cmd(f'git clone {LAUNCHER_REPO} C:\\claude-launcher-web')
    print(f"  Clone RC: {r.status_code}")
    if r.status_code != 0:
        print(f"  stderr: {r.std_err.decode()[:200]}")

    # Install npm dependencies
    print("Installing dependencies...")
    r = s.run_cmd(r'cd C:\claude-launcher-web && npm install --production')
    print(f"  npm install RC: {r.status_code}")

else:
    print("claude-launcher-web already installed, pulling latest...")
    r = s.run_cmd(r'cd C:\claude-launcher-web && git pull')
    print(f"  git pull: {r.std_out.decode().strip()[:100]}")

# Open firewall port 3001
r = s.run_cmd('netsh advfirewall firewall add rule name=ClaudeLauncher-3001 dir=in action=allow protocol=TCP localport=3001')
print(f"Firewall port 3001: RC={r.status_code}")

# Create a scheduled task to auto-start claude-launcher-web
print("Creating auto-start task...")
task_cmd = (
    r'schtasks /create /tn "ClaudeLauncherWeb" /tr '
    r'"cmd /c cd /d C:\claude-launcher-web && set PORT=3001 && node server.js" '
    r'/sc onstart /ru SYSTEM /rl HIGHEST /f'
)
r = s.run_cmd(task_cmd)
print(f"  Task create RC: {r.status_code}")

# Start it now
print("Starting claude-launcher-web...")
r = s.run_cmd(r'schtasks /run /tn "ClaudeLauncherWeb"')
print(f"  Task run RC: {r.status_code}")

# Wait and check if port 3001 is listening
time.sleep(5)
r = s.run_cmd('powershell -c "Test-NetConnection -ComputerName localhost -Port 3001 | Select-Object -ExpandProperty TcpTestSucceeded"')
port_ok = r.std_out.decode().strip()
print(f"Port 3001 listening: {port_ok}")

print("\n=== Provisioning complete ===")
print(f"  VNC: {ip}:5900 (password: hiveclip123)")
print(f"  Launcher: {ip}:3001")
