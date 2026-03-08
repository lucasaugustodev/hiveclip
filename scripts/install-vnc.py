import winrm
import sys

ip = sys.argv[1] if len(sys.argv) > 1 else "216.238.104.3"
pw = sys.argv[2] if len(sys.argv) > 2 else "9gL=eh]Scc@jSeW2"

print(f"Connecting to {ip}...")
s = winrm.Session(ip, auth=("Administrator", pw), transport="ntlm")

r = s.run_cmd("hostname")
print(f"Hostname: {r.std_out.decode().strip()}")

r = s.run_ps("Get-Service tvnserver -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Status")
status = r.std_out.decode().strip()
print(f"TightVNC status: {status or 'NOT INSTALLED'}")

if "Running" in status:
    print("TightVNC already running!")
    sys.exit(0)

# Step 1: Download using certutil (much faster than Invoke-WebRequest)
print("Downloading TightVNC MSI via certutil...")
r = s.run_cmd(
    'certutil -urlcache -split -f '
    '"https://www.tightvnc.com/download/2.8.84/tightvnc-2.8.84-gpl-setup-64bit.msi" '
    '"%TEMP%\\tightvnc.msi"'
)
dl_out = r.std_out.decode().strip()
print(f"Download output (last 200): {dl_out[-200:]}")
print(f"Download RC: {r.status_code}")

if r.status_code != 0:
    # Fallback: try bitsadmin
    print("certutil failed, trying bitsadmin...")
    r = s.run_cmd(
        'bitsadmin /transfer vnc '
        '"https://www.tightvnc.com/download/2.8.84/tightvnc-2.8.84-gpl-setup-64bit.msi" '
        '"%TEMP%\\tightvnc.msi"'
    )
    print(f"Bitsadmin RC: {r.status_code}")
    print(r.std_out.decode()[-200:])

# Step 2: Install MSI via msiexec (cmd, not PowerShell)
print("Installing TightVNC...")
r = s.run_cmd(
    'msiexec /i "%TEMP%\\tightvnc.msi" /quiet /norestart '
    'ADDLOCAL=Server '
    'SET_USEVNCAUTHENTICATION=1 VALUE_OF_USEVNCAUTHENTICATION=1 '
    'SET_PASSWORD=1 VALUE_OF_PASSWORD=hiveclip123 '
    'SET_USECONTROLAUTHENTICATION=1 VALUE_OF_USECONTROLAUTHENTICATION=1 '
    'SET_CONTROLPASSWORD=1 VALUE_OF_CONTROLPASSWORD=hiveclip123'
)
print(f"Install RC: {r.status_code}")
print(r.std_out.decode()[:200])

# Step 3: Firewall rule
print("Adding firewall rule...")
r = s.run_cmd('netsh advfirewall firewall add rule name="VNC-5900" dir=in action=allow protocol=TCP localport=5900')
print(f"Firewall RC: {r.status_code}")

# Step 4: Start service
print("Starting TightVNC service...")
r = s.run_cmd('net start tvnserver')
print(f"Start RC: {r.status_code}")
print(r.std_out.decode()[:100])

# Step 5: Verify
r = s.run_ps("Get-Service tvnserver -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Status")
final_status = r.std_out.decode().strip()
print(f"Final TightVNC status: {final_status or 'NOT FOUND'}")
