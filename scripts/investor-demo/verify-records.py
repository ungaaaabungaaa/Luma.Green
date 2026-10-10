"""Read-only bounded checks; persist no user content."""
import argparse
import json
import os
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('target', choices=['development', 'production'])
args = parser.parse_args()
deployment = {'development': 'glorious-rooster-470', 'production': 'outstanding-buzzard-942'}[args.target]
root = Path(__file__).resolve().parents[2]
cli = ['node', str(root / 'node_modules/convex/bin/main.js'), 'run']
batch = {'batchKey': 'investor-2026-10-10'}
def query(name, values):
    result = subprocess.run(cli + ['investorDemo:' + name, json.dumps(values), '--deployment', deployment], cwd=root, capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError('Read-only demo check failed: ' + name + '\n' + result.stderr[-1000:])
    return json.loads(result.stdout)
report = {'deployment': deployment, 'status': query('status', batch), 'cohorts': [], 'slices': []}
for cohort in range(1, 6):
    report['cohorts'].append(query('integrity', {**batch, 'cohort': cohort}))
    print('Checked cohort', cohort, flush=True)
cursor = None
while True:
    page = query('verifySlice', {**batch, 'cursor': cursor, 'limit': 100})
    report['slices'].append({key: value for key, value in page.items() if key != 'cursor'})
    if page['isDone']:
        break
    cursor = page['cursor']
private = root / '.convex' / 'investor-demo' / args.target
private.mkdir(mode=0o700, parents=True, exist_ok=True)
output = private / 'verification.json'
output.write_text(json.dumps(report, indent=2) + '\n')
os.chmod(output, 0o600)
print('Verified record slices:', len(report['slices']), flush=True)
