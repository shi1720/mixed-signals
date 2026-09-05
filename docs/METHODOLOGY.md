# Reading the atmosphere

This voluntary survey describes its contributors. It is not representative of all residents, and city comparisons are entertainment rather than scientific or personal advice.

## Questions and scales

Each answer is an integer from 1 to 5, or `null` for not enough experience. All questions refer to the contributor's dating experience in one city over the previous six months. At least four of eight questions are required, but any individual question can be skipped.

| Question | Low anchor | High anchor | Metric |
|---|---|---|---|
| Ease of meeting someone worth meeting again | Painfully difficult | Surprisingly easy | Chemistry |
| Date plans actually happening | Almost never | Almost always | Friction, reversed |
| Affordability of a satisfying first date | Very unaffordable | Very affordable | Friction, reversed |
| Clarity about intentions | Fog machine | Crystal clear | Mixed signals, reversed |
| Comfort being yourself | Not comfortable | Completely myself | Chemistry |
| Conversations disappearing | Never | Very often | Mixed signals |
| Travel making dating harder | Hardly at all | A great deal | Friction |
| Recommending dating here to a friend | Definitely not | Absolutely | Chemistry |

A positive score maps as `25 × (answer − 1)`. A reversed score maps as `100 − 25 × (answer − 1)`.

For each person, a metric is the arithmetic mean of its component questions **only when all components are present**. A skipped answer makes that person's entire axis unavailable. It does not count as zero, neutral, or negative. Other complete axes remain eligible.

The city metric is the mean of eligible people's metric scores. The result is rounded to the nearest five. Every displayed value needs at least ten complete contributing reports. City sample `n` can therefore differ from each axis's sample `n`. Small denominators are suppressed too.

## Forecast labels

Classification uses the displayed rounded city scores. Personal classification uses that person's unrounded complete scores.

| Condition | Label |
|---|---|
| Any axis missing | Still reading the atmosphere |
| Chemistry ≥60, mixed signals <50 | Mostly butterflies |
| Chemistry ≥60, mixed signals ≥50 | Hot with a chance of “what are we?” |
| Chemistry <60, friction ≥60 | Excellent couch weather |
| Otherwise | Scattered possibilities |

The labels are transparent product copy, not learned predictions. A city's most common meeting category is shown only if that category itself has at least ten votes. Ties use alphabetical category IDs, as documented and tested.

## What the release cannot establish

- Demographic representativeness, causality, or a person's likely experience.
- A meaningful statistical ranking of cities with different contributor pools.
- Unique people across cleared cookies, devices, or coordinated submissions.
- Formal differential privacy or protection against every auxiliary-data attack.

There is no private-data export endpoint. The CSV contains only the same already-published aggregates. Illustrative exports begin with `sample_type=ILLUSTRATIVE`. The Python validator refuses these by default.
