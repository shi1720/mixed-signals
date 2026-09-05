# A frozen release still scans every report

The atomic snapshot insert discards conflicts correctly, but repeated calls still run the expensive aggregation. Avoid re-evaluating aggregate inputs after the snapshot exists while preserving the deadline gate, parameter binding, uniqueness and concurrent reveal safety. The regression test instruments SQLite ROUND calls rather than relying on flaky wall-clock timing.

Category: `performance_optimization`

Verification: `npm test -- tests/integration/api.test.ts`

`baseline.patch` introduces the defect into the correct code; `golden.patch` resolves it.
