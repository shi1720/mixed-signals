# Design decisions

## 1. A frozen reveal instead of a live leaderboard

A live average changes when an individual submits or withdraws. At small samples, that change can reveal their answer. Mixed Signals uses one shared collection window and one immutable release. There is no city leaderboard because a voluntary convenience sample cannot support that claim.

## 2. Structured questions instead of anonymous stories

Free text would require moderation for names, accusations, harassment, and inadvertently identifiable stories. Eight ordinal questions and a categorical meeting habitat produce useful patterns without collecting sensitive narratives. Humor targets logistics and ambiguity, not identities.

## 3. Complete-case scoring instead of imputing missing values

A skipped answer means the person does not know. Turning it into a midpoint invents an opinion. We suppress incomplete axes independently and require ten complete responses for each published axis. The personal forecast explains when it lacks enough information.

## 4. Cloudflare D1 instead of Firestore for this release

The task allowed GCP. The available deployable environment supports Workers and D1 without requesting cloud credentials, and SQL makes the uniqueness, grouped aggregation, and transactional release boundaries explicit. A Firestore adapter is not included. Migrating would require transactional equivalents and rerunning the race tests, not just replacing a connection string.

## 5. Canvas instead of a large globe engine

The globe is an orthographic projection of a compact geographic point cloud. A custom canvas renderer controls point culling, pixel ratio, hit testing and animation cost directly. It avoids a WebGL requirement and a large 3D framework. The equivalent city list is usable with keyboard and screen readers.

## 6. Calendar reminder instead of speculative email delivery

An email field is easy; dependable opt-in delivery, unsubscribe handling, retry queues, sender verification, and privacy obligations are not. A real local calendar download completes the return-after-a-week loop without collecting contact details or pretending an unconfigured service works.

## 7. Pre-generated receipt secret

If the server minted a deletion secret only after storing a report, a lost response could strand it. The browser generates a high-entropy secret before sending and persists the pending request. The database stores only its hash. A replay recovers the original receipt without admitting another response.

## 8. Transparent calibration tasks

The evaluation lab uses actual modules and public regression tests. Its three tasks cover a null-semantics bug, a deadline boundary, and an aggregation performance defect. Each broken baseline must fail and its actual golden patch must pass. It does not claim these visible tests are a hidden or tamper-resistant hiring benchmark.

## 9. Reuse accessible primitives, own the visual system

Base UI and shadcn handle focus management, dialogs, radios, checkboxes and combobox mechanics. Custom CSS defines the atlas's typography, palette, spacing, and responsive behavior. Vendored primitives are not rewritten for cosmetic changes.

The linter excludes vendored primitives and generated reports. React Compiler diagnostics are disabled because this project does not enable that compiler; ordinary Rules of Hooks remain enforced. Plain JSX apostrophes are allowed. Full-document anchors are intentional for calendar downloads and root recovery, so Next's client-link convention is not applied globally. Automated browser accessibility checks supplement source linting.

## 10. A narrowly scoped dependency override

The starter's Drizzle tooling pulled a vulnerable development-only esbuild through `@esbuild-kit/core-utils`. Its esbuild dependency is overridden to the patched 0.25 line. The migration generator, production build, type checking and tests validate the override. This is documented rather than applying an unrelated major downgrade of Drizzle to satisfy an audit suggestion.
