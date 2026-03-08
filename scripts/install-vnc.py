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

print("Installing TightVNC...")
script = r"""
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$url = "https://www.tightvnc.com/download/2.8.84/tightvnc-2.8.84-gpl-setup-64bit.msi"
$installer = "$env:TEMP\tightvnc.msi"
Invoke-WebRequest -Uri $url -OutFile $installer -UseBasicParsing
Write-Host "Downloaded MSI"
Start-Process msiexec.exe -ArgumentList "/i `"$installer`" /quiet /norestart ADDLOCAL=Server SET_USEVNCAUTHENTICATION=1 VALUE_OF_USEVNCAUTHENTICATION=1 SET_PASSWORD=1 VALUE_OF_PASSWORD=hiveclip123 SET_USECONTROLAUTHENTICATION=1 VALUE_OF_USECONTROLAUTHENTICATION=1 SET_CONTROLPASSWORD=1 VALUE_OF_CONTROLPASSWORD=hiveclip123" -Wait -NoNewWindow
Write-Host "MSI installed"
New-NetFirewallRule -DisplayName "VNC-5900" -Direction Inbound -Protocol TCP -LocalPort 5900 -Action Allow -ErrorAction SilentlyContinue
Start-Sleep -Seconds 5
Start-Service tvnserver -ErrorAction SilentlyContinue
$svc = Get-Service tvnserver -ErrorAction SilentlyContinue
Write-Host "Service status: $($svc.Status)"
"""

r = s.run_ps(script)
print("Output:", r.std_out.decode())
if r.std_err:
    print("Errors:", r.std_err.decode())
print("RC:", r.status_code)
