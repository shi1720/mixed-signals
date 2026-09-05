# Contributing

Use synthetic reports on a local instance. Please never seed the public experiment with test data.

```bash
npm ci
npm run db:migrate
npm run dev
```

Run `npm run check`, `npm run test:python`, and `npm run eval:verify` before proposing a change. Interface changes should also pass `npm run test:e2e`. Use the formatter on owned source; avoid unrelated edits to vendored `components/ui` files.

Changes to scoring or privacy thresholds need a methodology update and regression tests. A schema change needs a new Drizzle migration. Never rewrite a migration already applied to a public deployment. A release must preserve the immutable snapshot of a completed season.

Bug reports should include steps, expected/actual behavior and environment. Do not include private receipts, cookies or survey answers. See `SECURITY.md` for sensitive reports.

The evaluation lab depends on precise controlled mutations. When refactoring its target modules, update the task manifest and export patches, then verify every defective baseline still fails for the intended reason and its golden solution passes.
