import { METRICS, roundScore, type MetricKey } from '@/lib/forecast';
import type { Receipt } from '@/lib/client';

export function PersonalSummary({ receipt }: { receipt: Receipt }) {
  return (
    <section
      className="personal-summary"
      aria-label="Your private answer summary"
    >
      <span className="eyebrow">YOUR ANSWERS, SUMMED UP</span>
      <p>
        Only your answers. These are not city averages or predictions about your
        love life.
      </p>
      {receipt.scores ? (
        <div className="personal-metrics">
          {(Object.keys(METRICS) as MetricKey[]).map((key) => {
            const metric = METRICS[key];
            const value = receipt.scores![key];
            return (
              <div className="personal-metric" key={key}>
                <div>
                  <b>{metric.label}</b>
                  <strong>
                    {value === null
                      ? 'Not enough answers'
                      : `${roundScore(value)}/100`}
                  </strong>
                </div>
                <div className="insight-meter">
                  <span
                    style={{
                      width: `${value ?? 0}%`,
                      background: metric.color,
                    }}
                  />
                </div>
                <p>
                  {value === null
                    ? 'This question group is incomplete. Only complete groups contribute to a city score.'
                    : metric.direction}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <p>
          This older receipt saved your playful summary, but not separate
          scores: <b>{receipt.label}</b>. This receipt can request deletion if
          the report is still stored.
        </p>
      )}
      <details className="summary-method">
        <summary>How these scores are calculated</summary>
        <ul>
          {(Object.keys(METRICS) as MetricKey[]).map((key) => (
            <li key={key}>
              <b>{METRICS[key].label}:</b> {METRICS[key].description}
            </li>
          ))}
        </ul>
        <p>
          We combine 1–5 answers within each complete group and show the score
          rounded to the nearest 5. A skipped question leaves its group
          unavailable.
        </p>
      </details>
      <span className="summary-caveat">
        Scores combine answers on a 0–100 scale. They are not percentages of
        people.
      </span>
    </section>
  );
}
