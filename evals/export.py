#!/usr/bin/env python3
"""Export reviewable problem statements and patches from the current source."""
import difflib
from pathlib import Path
from run import ROOT, TASKS
for task in TASKS:
    correct = (ROOT / task['file']).read_text()
    if correct.count(task['old']) != 1:
        raise RuntimeError(f"Mutation needs recalibration: {task['id']}")
    broken = correct.replace(task['old'], task['mutated'], 1)
    folder = ROOT / 'evals/tasks' / task['id']
    folder.mkdir(parents=True, exist_ok=True)
    for name, before, after in [('baseline.patch', correct, broken), ('golden.patch', broken, correct)]:
        (folder / name).write_text(''.join(difflib.unified_diff(before.splitlines(True), after.splitlines(True), fromfile='a/'+task['file'], tofile='b/'+task['file'])))
    (folder / 'README.md').write_text(f"# {task['title']}\n\n{task['problem']}\n\nCategory: `{task['category']}`\n\nVerification: `npm test -- {task['test']}`\n\n`baseline.patch` introduces the defect into the correct code; `golden.patch` resolves it.\n")
print(f'Exported {len(TASKS)} task descriptions and patch pairs.')
