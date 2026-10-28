import os
import subprocess
import time

git_path = r'C:\Program Files\Git\cmd\git.exe'

for f in ['test_fe.py', 'test_fe.log']:
    if os.path.exists(f):
        os.remove(f)

print("1. Staging changes...")
subprocess.run([git_path, 'add', '-A'])

print("2. Committing changes...")
msg = 'Auto-check and save genuine customer on Make Sales with Title Case formatting'
subprocess.run([git_path, 'commit', '-m', msg])

print("3. Pushing to origin main...")
for attempt in range(1, 4):
    res = subprocess.run([git_path, 'push', 'origin', 'main'], capture_output=True, text=True)
    print("STDOUT:", res.stdout)
    print("STDERR:", res.stderr)
    if res.returncode == 0:
        print("PUSH SUCCESSFUL!")
        break
    time.sleep(2)
