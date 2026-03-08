"""Fix launcher task on all running VMs to include full PATH"""
import winrm
import time

vms = [
    ("216.238.116.58", r"a6J#q{avw}E6F}w*"),
    ("216.238.119.31", r"e}9J[aGvhA=w[2_)"),
]

for ip, pw in vms:
    print(f"\n{'='*50}")
    print(f"Fixing {ip}...")
    try:
        s = winrm.Session(ip, auth=("Administrator", pw), transport="ntlm")
        r = s.run_cmd("hostname")
        print(f"  Hostname: {r.std_out.decode().strip()}")

        # Get system PATH
        r = s.run_ps('[Environment]::GetEnvironmentVariable("Path","Machine")')
        sys_path = r.std_out.decode().strip()
        npm_bin = r"C:\Users\Administrator\AppData\Roaming\npm"
        if npm_bin.lower() not in sys_path.lower():
            sys_path = sys_path.rstrip(";") + ";" + npm_bin

        # Write start.bat
        bat = f"@echo off\nset PATH={sys_path};%PATH%\nset PORT=3001\ncd /d C:\\claude-launcher-web\nnode server.js\n"
        escaped = bat.replace("'", "''")
        s.run_ps(f"Set-Content -Path 'C:\\claude-launcher-web\\start.bat' -Value '{escaped}' -Encoding ASCII")

        # Recreate task
        s.run_cmd('schtasks /delete /tn "ClaudeLauncherWeb" /f')
        r = s.run_cmd(
            'schtasks /create /tn "ClaudeLauncherWeb" /tr '
            '"cmd /c C:\\claude-launcher-web\\start.bat" '
            '/sc onstart /ru SYSTEM /rl HIGHEST /f'
        )
        print(f"  Task create: RC={r.status_code}")

        # Restart
        s.run_cmd('taskkill /f /im node.exe 2>nul')
        time.sleep(2)
        s.run_cmd('schtasks /run /tn "ClaudeLauncherWeb"')
        time.sleep(5)

        r = s.run_cmd('powershell -c "Test-NetConnection -ComputerName localhost -Port 3001 | Select-Object -ExpandProperty TcpTestSucceeded"')
        print(f"  Port 3001: {r.std_out.decode().strip()}")
        print(f"  OK!")
    except Exception as e:
        print(f"  ERROR: {e}")

print("\nDone!")
