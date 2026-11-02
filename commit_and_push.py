import subprocess

git = r'"C:\Program Files\Git\cmd\git.exe"'

cmd1 = f'{git} add -A'
res1 = subprocess.run(cmd1, shell=True, capture_output=True, text=True)
print("ADD:", res1.stdout, res1.stderr)

msg = "fix: guarantee customer auto-creation on Make Sales and Sales Voucher per active firm domain"
cmd2 = f'{git} commit -m "{msg}"'
res2 = subprocess.run(cmd2, shell=True, capture_output=True, text=True)
print("COMMIT:", res2.stdout, res2.stderr)

cmd3 = f'{git} push origin main'
res3 = subprocess.run(cmd3, shell=True, capture_output=True, text=True)
print("PUSH:", res3.stdout, res3.stderr)
