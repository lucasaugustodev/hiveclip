import winrm

s = winrm.Session('216.238.115.143', auth=('Administrator', r'y)7Mtvp97m%(}dAx'), transport='ntlm')

# Write test script to VM
test_js = r"""
const pty = require('node-pty');
try {
  const p = pty.spawn('cmd.exe', [], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: 'C:\\Users\\Administrator',
    env: process.env
  });
  console.log('PTY spawned, pid:', p.pid);
  let output = '';
  p.onData(data => { output += data; });
  setTimeout(() => {
    p.write('echo hello\r\n');
    setTimeout(() => {
      console.log('PTY output length:', output.length);
      console.log('PTY works!');
      p.kill();
      process.exit(0);
    }, 2000);
  }, 1000);
} catch(e) {
  console.log('PTY ERROR:', e.message);
  console.log('PTY STACK:', e.stack);
  process.exit(1);
}
"""

# Write test to file on VM
escaped = test_js.replace("'", "''")
r = s.run_ps(f"Set-Content -Path 'C:\\claude-launcher-web\\test-pty.js' -Value '{escaped}'")
print(f"Write test: RC={r.status_code}")

# Run it
r = s.run_cmd(r'cmd /c "cd /d C:\claude-launcher-web && node test-pty.js"')
print(f"stdout: {r.std_out.decode()[:500]}")
print(f"stderr: {r.std_err.decode()[:300]}")
print(f"RC: {r.status_code}")

# Cleanup
s.run_cmd(r'del C:\claude-launcher-web\test-pty.js')
