"""Import only the fixed investor batch; keep exact receipts private."""
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
private = root / '.convex' / 'investor-demo' / args.target
private.mkdir(mode=0o700, parents=True, exist_ok=True)
cli = ['node', str(root / 'node_modules/convex/bin/main.js')]
receipts = []
def run(function, payload):
    result = subprocess.run(cli + ['run', function, json.dumps(payload), '--deployment', deployment], cwd=root, capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError('Demo record import failed; no credentials were printed. ' + result.stderr[-1000:])
    data = json.loads(result.stdout)
    receipts.append({'function': function, 'arguments': payload, 'result': data})
    dest = private / 'record-receipts.json'
    dest.write_text(json.dumps(receipts, indent=2) + '\n')
    os.chmod(dest, 0o600)
    return data
try:
    for cohort in range(1, 6):
        print(run('investorDemo:seed', {'batchKey': 'investor-2026-10-10', 'cohort': cohort}), flush=True)
    offset = 0
    while True:
        page = run('investorDemo:seedIndustries', {'batchKey': 'investor-2026-10-10', 'offset': offset, 'limit': 25})
        offset = page['nextOffset']
        print(f'Industry records {offset if offset is not None else page["total"]}/{page["total"]}', flush=True)
        if offset is None:
            break
finally:
    # A failed import is retryable, but must not leave an enabled import gate.
    for name in ['INVESTOR_DEMO_TARGET_URL', 'INVESTOR_DEMO_IMPORT_EXPIRES_AT']:
        result = subprocess.run(cli + ['env', 'remove', name, '--deployment', deployment], cwd=root, capture_output=True, text=True)
        if result.returncode:
            print('IMPORT GATE REMOVAL FAILED: ' + name, flush=True)
            raise SystemExit(2)
    print('Import gate closed.', flush=True)
