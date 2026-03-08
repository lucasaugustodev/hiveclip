import os, sys

# Set credentials directly in this process's environment
os.environ["VM_IP"] = "216.238.115.143"
os.environ["VM_PASS"] = r"y)7Mtvp97m%(}dAx"

# Execute provision-vm.py in the same process
script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "provision-vm.py")
exec(open(script).read())
