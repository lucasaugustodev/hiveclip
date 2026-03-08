import os, subprocess, sys
os.environ["VM_IP"] = "216.238.115.143"
os.environ["VM_PASS"] = "y)7Mtvp97m%(}dAx"
script = os.path.join(os.path.dirname(__file__), "provision-vm.py")
result = subprocess.run([sys.executable, script], env=os.environ)
sys.exit(result.returncode)
