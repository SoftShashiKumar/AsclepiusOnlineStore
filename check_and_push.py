import subprocess

git = r'"C:\Program Files\Git\cmd\git.exe"'

st = subprocess.run(f'{git} status --short', shell=True, capture_output=True, text=True)
print("STATUS:", st.stdout)

subprocess.run(f'{git} add -A', shell=True)
res_c = subprocess.run([r'C:\Program Files\Git\cmd\git.exe', 'commit', '-m', 'fix: match customer strictly by Referance (DS ID) instead of mobile and allow shared mobile numbers'], capture_output=True, text=True)
print("COMMIT STDOUT:", res_c.stdout)
print("COMMIT STDERR:", res_c.stderr)

res_p = subprocess.run([r'C:\Program Files\Git\cmd\git.exe', 'push', 'origin', 'main'], capture_output=True, text=True)
print("PUSH STDOUT:", res_p.stdout)
print("PUSH STDERR:", res_p.stderr)
