# Collection remains open at the exact reveal instant

The campaign switches phase one millisecond too late. At the exact reveal instant the public state must be revealed. Keep opening-time semantics and the countdown unchanged.

Category: `bug_fixing`

Verification: `npm test -- tests/unit/contracts.test.ts`

`baseline.patch` introduces the defect into the correct code; `golden.patch` resolves it.
