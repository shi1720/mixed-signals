# Skipped answers are becoming a forecast

A missing survey answer is currently treated as zero in the personal forecast. Fix complete-case scoring so an axis is null unless every question contributing to that axis is answered. Unrelated complete axes should still be available.

Category: `bug_fixing`

Verification: `npm test -- tests/unit/forecast.test.ts`

`baseline.patch` introduces the defect into the correct code; `golden.patch` resolves it.
