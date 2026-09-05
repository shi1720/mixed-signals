import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  scoreAnswers,
  forecastLabel,
  roundScore,
  DEMO_RESULTS,
} from '@/lib/forecast';
import { EMPTY_ANSWERS, type Answers } from '@/lib/survey';
const all = (n: number): Answers =>
  Object.fromEntries(Object.keys(EMPTY_ANSWERS).map((k) => [k, n])) as Answers;
describe('transparent forecast math', () => {
  it('maps all neutral answers to 50 on every axis', () =>
    expect(scoreAnswers(all(3))).toEqual({
      chemistry: 50,
      fog: 50,
      friction: 50,
    }));
  it('does not silently convert skipped answers to zero or midpoint', () => {
    expect(scoreAnswers({ ...all(5), spark: null })).toEqual({
      chemistry: null,
      fog: 50,
      friction: 100 / 3,
    });
    expect(scoreAnswers({ ...all(1), ghosting: null }).fog).toBeNull();
    expect(scoreAnswers({ ...all(3), logistics: null }).friction).toBeNull();
  });
  it('handles entirely skipped input without division by zero', () =>
    expect(scoreAnswers(EMPTY_ANSWERS)).toEqual({
      chemistry: null,
      fog: null,
      friction: null,
    }));
  it('applies exact forecast classification boundaries', () => {
    expect(forecastLabel(60, 49, 90)).toBe('Mostly butterflies');
    expect(forecastLabel(60, 50, 20)).toContain('what are we');
    expect(forecastLabel(59, 49, 60)).toBe('Excellent couch weather');
    expect(forecastLabel(59, 49, 59)).toBe('Scattered possibilities');
    expect(forecastLabel(null, 30, 50)).toBe('Still reading the atmosphere');
  });
  it('never leaves the scale for valid complete answers', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 5 }), {
          minLength: 8,
          maxLength: 8,
        }),
        (values) => {
          const answers = Object.fromEntries(
            Object.keys(EMPTY_ANSWERS).map((k, i) => [k, values[i]]),
          ) as Answers;
          for (const value of Object.values(scoreAnswers(answers))) {
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(100);
            expect(roundScore(value!) % 5).toBe(0);
          }
        },
      ),
      { numRuns: 300 },
    );
  });
  it('more positive connection answers cannot lower chemistry', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 4 }), (n) => {
        const a = { ...all(3), spark: n };
        expect(scoreAnswers({ ...a, spark: n + 1 }).chemistry).toBeGreaterThan(
          scoreAnswers(a).chemistry!,
        );
      }),
      { numRuns: 50 },
    );
  });
  it('demo fixtures have coherent scores and are explicitly separate', () => {
    expect(DEMO_RESULTS).toHaveLength(24);
    expect(new Set(DEMO_RESULTS.map((r) => r.cityId)).size).toBe(24);
    for (const r of DEMO_RESULTS)
      expect(r.forecast).toBe(
        forecastLabel(r.chemistry.value, r.fog.value, r.friction.value),
      );
  });
});
