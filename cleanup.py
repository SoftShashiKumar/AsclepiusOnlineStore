import os, subprocess, time
git_path = r'C:\Program Files\Git\cmd\git.exe'
for f in ['list_comp.py', 'push_all.py']:
    if os.path.exists(f):
        os.remove(f)
subprocess.run([git_path, 'add', '-A'])
subprocess.run([git_path, 'commit', '-m', 'Clean temporary helper scripts'])
for attempt in range(1, 4):
    p = subprocess.run([git_path, 'push', 'origin', 'main'], capture_output=True, text=True)
    if p.returncode == 0:
        print("PUSHED CLEAN!")
        break
    time.sleep(2)
