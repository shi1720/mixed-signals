# Mixed Signals: portfolio pitch

## One sentence

An anonymous global dating experiment that turns lived experiences into a privacy-conscious weather atlas after a shared seven-day reveal.

## A 30-second introduction

Mixed Signals gives a group chat's dating debrief coordinates. People answer a short, playful survey about sparks, ghosting, affordability and logistics in their city. They immediately get a personal forecast, then return a week later for an interactive globe of collective city results. Behind the playful interface are real engineering constraints: retry-safe writes, exact deadline enforcement, missing-data semantics, transactional snapshots, privacy thresholds, and receipt-based withdrawal.

## The problem

Subjective city experiences are usually scattered across anecdotes, reviews and social posts. Those formats encourage overgeneralization and can expose individuals. Mixed Signals collects only structured experiences, publishes city-level patterns with clear limitations, and uses humor to make participation approachable.

It does not promise representative research or matchmaking. Its useful outcome is a shared, clearly qualified snapshot of contributors' experiences.

## A two-minute demo

1. Open the atlas and point to the **Illustrative preview** label. Explain that no fictional activity enters the database.
2. Switch from chemistry to mixed signals, filter a region and open a city. The point-cloud globe and semantic city list share one state.
3. On a local development instance, submit a synthetic report. Show the immediate forecast, calendar file and private deletion receipt.
4. Explain why the public endpoint returns no provisional results before the deadline.
5. Run a deadline or concurrency test. Show the SQL acceptance gate and immutable snapshot.
6. Run `npm run eval:verify` to demonstrate reproducible defective baselines and golden solutions.

Do not submit synthetic examples to the public survey. Use the local instance for a technical demo.

## Engineering evidence relevant to coding-agent environment work

| Requirement | Concrete evidence |
|---|---|
| TypeScript feature implementation | Interactive globe, survey, receipt lifecycle, structured API contracts |
| Python | Streaming aggregate validator and isolated evaluation runner |
| Algorithms | Orthographic projection, geographic culling, complete-case aggregation, deterministic suppression |
| Bug fixing | Null semantics, deadline boundary and lost-response recovery tests |
| Performance | Guarded snapshot creation with instrumented rescan regression test |
| Refactoring | Pure domain functions, service/transport separation, database access boundary |
| Reproducible environments | Lockfile, local D1 migrations, CI, Docker verification environment |
| Golden solutions | Three task manifests, controlled mutations, reference patches and automated fail-before/pass-after checks |
| Technical reasoning | Architecture, API, methodology, security and explicit tradeoff documentation |

## Honest positioning

This project demonstrates concrete engineering decisions and their tests. It does not establish years of professional experience, prove expertise in every language listed in a job description, or substitute for being able to explain the code. The implementation was AI-assisted and independently reviewed by agents. Review and understand the important paths before discussing it in an interview.

## A future portfolio card

**Mixed Signals**

A planet-sized dating experiment. Built an interactive geographic atlas and anonymous survey system with duplicate-safe writes, exact deadline enforcement, immutable privacy-filtered releases, and recoverable deletion receipts. Includes reproducible engineering tasks with golden patches.

**Stack:** TypeScript, React, Canvas, Cloudflare Workers, SQLite/D1, Python.

**Links:** [Live app](https://mixed-signals-atlas.sg127977958.chatgpt.site) · [GitHub](https://github.com/shi1720/mixed-signals)
