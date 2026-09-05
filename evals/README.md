# Engineering evaluation lab

Three reproducible coding tasks derived from the actual Mixed Signals codebase. Each includes a clear problem, a controlled defective baseline, a test command, and a golden reference patch.

This is a transparent calibration suite for reviewing software-engineering reasoning. It is not a hidden benchmark, a security sandbox for untrusted agents, or an inflated claim of training infrastructure.

| Task | Skill | Defect |
|---|---|---|
| `skip-is-not-neutral` | Debugging and data semantics | Skipped ratings become invented numeric opinions |
| `the-last-millisecond` | Boundary analysis | Collection remains open at the exact reveal instant |
| `stop-recounting-hearts` | Performance optimization | A frozen snapshot still recomputes all aggregate inputs |

## Verify all reference solutions

```bash
npm ci
npm run eval:verify
```

The runner copies a bounded source/test tree into a temporary directory, links the installed locked dependencies, applies one known defect, and requires the relevant regression tests to fail. It then applies the actual unified golden patch with `git apply` and requires the same tests to pass. Temporary data is discarded, and the production checkout/database are never mutated.

The machine-readable result distinguishes failed baselines from successful golden solutions. A baseline that unexpectedly passes or a golden patch that fails invalidates the evaluation and exits nonzero.

## Work on one task

```bash
python3 evals/run.py --task stop-recounting-hearts --prepare /tmp/my-mixed-signals-task
cd /tmp/my-mixed-signals-task
cat TASK.md
npm test -- tests/integration/api.test.ts
```

Edit the target module to solve the problem. The prepared directory contains `golden.patch` for transparent review. The exported patches and task descriptions also live in `evals/tasks/`.

The reward is 1 when the specified regression suite passes, 0 otherwise. This public harness does not defend against a candidate editing tests or hardcoding answers. A serious hidden evaluation should isolate the candidate container, mount the grader read-only, bound network/filesystem capabilities, and keep independent holdout tests. Those facilities are outside this repository's claim.

## Why these tasks

The tasks exercise invariants that matter in a real application. The performance regression counts SQLite aggregate evaluations instead of asserting a hardware-dependent millisecond target. The missing-answer task tests unaffected axes as well as null preservation. The timing task tests one millisecond before, exactly at, and one millisecond after the deadline.

Refactors can change mutation anchors. If that happens, recalibrate `tasks.json`, run `npm run eval:export`, and verify every defective baseline and reference patch again. Do not accept an import failure or broken test setup as evidence that a baseline fails for the intended reason.
