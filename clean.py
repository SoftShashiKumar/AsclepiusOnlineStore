import os, subprocess, time
os.environ['PATH'] = r'C:\Program Files\Git\cmd;' + os.environ.get('PATH', '')
if os.path.exists('git_fix.py'):
    os.remove('git_fix.py')
subprocess.run(['git', 'add', '-A'])
subprocess.run(['git', 'commit', '-m', 'Cleanup build fix script'])
for attempt in range(1, 4):
    p = subprocess.run(['git', 'push', 'origin', 'main'], capture_output=True, text=True)
    if p.returncode == 0:
        print("PUSHED CLEAN!")
        break
    time.sleep(2)
