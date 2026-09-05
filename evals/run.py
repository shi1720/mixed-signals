#!/usr/bin/env python3
"""Prepare and verify reproducible coding tasks against real application modules.

Uses a temporary source tree. Never mutates the production checkout or database.
The golden solution is a unified diff generated from the current correct source.
This public calibration suite is not a hidden benchmark or a hardened sandbox.
"""
from __future__ import annotations
import argparse
import difflib
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TASKS = json.loads((ROOT / 'evals/tasks.json').read_text())

def prepare(task: dict, destination: Path) -> Path:
    destination.mkdir(parents=True, exist_ok=True)
    for name in ('lib', 'tests', 'drizzle'):
        shutil.copytree(ROOT / name, destination / name, dirs_exist_ok=True)
    for name in ('package.json', 'tsconfig.json', 'vitest.config.ts'):
        shutil.copy2(ROOT / name, destination / name)
    # Resolve exactly the dependencies installed by npm ci in the source checkout.
    (destination / 'node_modules').symlink_to(ROOT / 'node_modules', target_is_directory=True)
    path = destination / task['file']
    correct = path.read_text()
    if correct.count(task['old']) != 1:
        raise RuntimeError(f"Task {task['id']} needs recalibration: mutation target is not unique.")
    broken = correct.replace(task['old'], task['mutated'], 1)
    path.write_text(broken)
    patch = ''.join(difflib.unified_diff(broken.splitlines(True), correct.splitlines(True),
                                      fromfile='a/' + task['file'], tofile='b/' + task['file']))
    (destination / 'golden.patch').write_text(patch)
    (destination / 'TASK.md').write_text(f"# {task['title']}\n\n{task['problem']}\n\nRun: npm test -- {task['test']}\n")
    return destination

def grade(task: dict, destination: Path) -> subprocess.CompletedProcess:
    return subprocess.run(['node', str(ROOT / 'node_modules/vitest/vitest.mjs'), 'run',
                           '--config', str(destination / 'vitest.config.ts'), task['test']],
                          cwd=destination, capture_output=True, text=True, timeout=60)

def verify(task: dict) -> dict:
    with tempfile.TemporaryDirectory(prefix='mixed-signals-eval-') as folder:
        destination = prepare(task, Path(folder))
        baseline = grade(task, destination)
        if baseline.returncode == 0:
            raise RuntimeError(f"{task['id']}: baseline unexpectedly passes; evaluation is invalid.")
        # Apply the actual patch rather than silently replacing the file.
        subprocess.run(['git', 'apply', 'golden.patch'], cwd=destination, check=True, capture_output=True)
        golden = grade(task, destination)
        if golden.returncode:
            raise RuntimeError(f"{task['id']}: reference solution failed.\n{golden.stdout}\n{golden.stderr}")
        return {'task':task['id'], 'category':task['category'], 'baseline':'failed as expected',
                'golden':'passed', 'reward':1, 'test':task['test']}

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--task', choices=[t['id'] for t in TASKS])
    parser.add_argument('--prepare', type=Path, help='Create an editable broken task directory instead of verifying.')
    args = parser.parse_args()
    tasks = [t for t in TASKS if not args.task or t['id'] == args.task]
    if args.prepare:
        if not args.task: parser.error('--prepare requires --task')
        if args.prepare.exists(): parser.error('--prepare destination must not already exist')
        print(prepare(tasks[0], args.prepare.resolve()))
    else:
        print(json.dumps({'suite':'mixed-signals-calibration-v1', 'results':[verify(t) for t in tasks]}, indent=2))

if __name__ == '__main__': main()
