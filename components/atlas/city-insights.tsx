'use client';
import { useState } from 'react';
import {
  ArrowUpRight,
  GitCompareArrows,
  LockKeyhole,
  MapPin,
  X,
} from 'lucide-react';
import { NativeSelect } from '@/components/ui/native-select';
import { CITY_BY_ID } from '@/lib/cities';
import { METRICS, type CityResult, type MetricKey } from '@/lib/forecast';
import { HABITATS } from '@/lib/survey';

export function CityInsights({
  data,
  selected,
  demo,
  revealed,
  onSelect,
  onSurvey,
}: {
  data: CityResult[];
  selected: string | null;
  demo: boolean;
  revealed: boolean;
  onSelect: (id: string) => void;
  onSurvey: () => void;
}) {
  const [compare, setCompare] = useState(false),
    [otherId, setOtherId] = useState('');
  const result =
    data.find((r) => r.cityId === selected) ??
    (!selected ? data[0] : undefined);
  const city = CITY_BY_ID.get(result?.cityId ?? selected ?? '');
  const alternatives = data.filter((r) => r.cityId !== result?.cityId);
  const other =
    alternatives.find((r) => r.cityId === otherId) ?? alternatives[0];
  const habitat = HABITATS.find((h) => h.id === result?.habitat);
  if (!demo && !revealed)
    return (
      <aside className="city-insights waiting-insights">
        <span className="insight-kicker">
          <LockKeyhole size={16} /> COMMUNITY RESULTS ARE CLOSED
        </span>
        <h2>
          What will your
          <br />
          <em>city reveal?</em>
        </h2>
        <p>
          We’ll combine anonymous survey answers into three city scores and the
          most selected way of meeting people.
        </p>
        <ul>
          <li>Is connection easy to find?</li>
          <li>How confusing does communication feel?</li>
          <li>Do plans, prices, and travel get in the way?</li>
        </ul>
        <p className="summary-caveat">
          A city needs 10 survey responses. Each score also needs 10 people who
          answered every question in that group. Some cities may not qualify.
        </p>
        <button className="button primary" onClick={onSurvey}>
          Take the survey <ArrowUpRight size={17} />
        </button>
      </aside>
    );
  return (
    <aside className="city-insights" aria-label="City report">
      <div className={`insight-provenance ${demo ? 'example' : ''}`}>
        {demo
          ? 'EXAMPLE REPORT · INVENTED DATA'
          : 'COMMUNITY REPORT · VOLUNTARY SURVEY'}
      </div>
      <div className="insight-heading">
        <span className="eyebrow">
          {demo ? 'TRY READING A CITY REPORT' : 'READ THE CITY REPORT'}
        </span>
        <MapPin size={19} />
      </div>
      {data.length > 0 && (
        <NativeSelect
          aria-label="City report"
          value={result?.cityId ?? ''}
          onChange={(e) => onSelect(e.target.value)}
          className="insight-city-select"
        >
          {!result && <option value="">Choose a city</option>}
          {data.map((r) => (
            <option key={r.cityId} value={r.cityId}>
              {CITY_BY_ID.get(r.cityId)?.name}
            </option>
          ))}
        </NativeSelect>
      )}
      {!result ? (
        <div className="insight-empty">
          <h2>{city?.name ?? 'No city results yet'}</h2>
          <p>
            {demo
              ? 'This city has no example data. You can still answer the real survey for it.'
              : 'This city did not have enough complete responses to publish a report.'}
          </p>
        </div>
      ) : (
        <>
          <p className="insight-sample">
            {result.n}{' '}
            {demo ? 'fictional example responses' : 'survey responses'} ·{' '}
            {city?.country}
          </p>
          <button
            className="compare-toggle"
            onClick={() => setCompare(!compare)}
            disabled={!alternatives.length}
            aria-expanded={compare}
          >
            {compare ? <X size={15} /> : <GitCompareArrows size={15} />}
            {compare ? 'Close comparison' : 'Compare another city'}
          </button>
          {compare && other && (
            <div className="compare-picker">
              <label htmlFor="compare-city">Compare with</label>
              <NativeSelect
                id="compare-city"
                aria-label="Comparison city"
                value={other.cityId}
                onChange={(e) => setOtherId(e.target.value)}
              >
                {alternatives.map((r) => (
                  <option key={r.cityId} value={r.cityId}>
                    {CITY_BY_ID.get(r.cityId)?.name}
                  </option>
                ))}
              </NativeSelect>
              <p>
                {other.n}{' '}
                {demo ? 'fictional example responses' : 'survey responses'}.
                Different people, not a controlled comparison.
              </p>
            </div>
          )}
          <div className="insight-axes">
            {(Object.keys(METRICS) as MetricKey[]).map((key) => {
              const m = METRICS[key];
              return (
                <section
                  className="insight-axis"
                  key={key}
                  aria-label={m.label}
                >
                  <div className="axis-title">
                    <h3>{m.label}</h3>
                    {!compare && (
                      <strong>
                        {result[key].value ?? 'Hidden'}
                        {result[key].value !== null && <small>/100</small>}
                      </strong>
                    )}
                  </div>
                  <p>{m.description}</p>
                  {(compare && other ? [result, other] : [result]).map(
                    (row) => (
                      <div className="comparison-row" key={row.cityId}>
                        {compare && (
                          <div className="comparison-caption">
                            <span>{CITY_BY_ID.get(row.cityId)?.name}</span>
                            <strong>
                              {row[key].value === null
                                ? 'Hidden'
                                : `${row[key].value}/100`}
                            </strong>
                          </div>
                        )}
                        <div className="insight-meter">
                          <span
                            style={{
                              width: `${row[key].value ?? 0}%`,
                              background: m.color,
                            }}
                          />
                        </div>
                        <span className="axis-sample">
                          {row[key].value === null
                            ? 'Fewer than 10 complete responses. Score hidden.'
                            : `${row[key].n} ${demo ? 'example' : 'complete'} responses`}
                        </span>
                      </div>
                    ),
                  )}
                  <span className="axis-direction">{m.direction}</span>
                </section>
              );
            })}
          </div>
          <div className="meeting-insight">
            <span aria-hidden="true">{habitat?.emoji ?? '🔒'}</span>
            <div>
              <b>
                {habitat?.id === 'none'
                  ? 'Most selected: still looking'
                  : habitat
                    ? `Most selected: ${habitat.label}`
                    : 'Meeting route not published'}
              </b>
              <p>
                {habitat?.id === 'none'
                  ? 'An experience, not a place to meet people.'
                  : habitat
                    ? 'Where these contributors meet people, not a measure of where dating works best.'
                    : 'No option met the minimum sample size.'}
              </p>
            </div>
          </div>
          <p className="insight-fineprint">
            0–100 scores, not percentages of people.{' '}
            {demo
              ? 'All numbers here are made up to show how results will look.'
              : 'These contributors do not represent everyone in the city.'}
          </p>
        </>
      )}
    </aside>
  );
}
