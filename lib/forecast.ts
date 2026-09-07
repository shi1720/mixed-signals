import type { Answers } from './survey';
export type MetricKey = 'chemistry' | 'fog' | 'friction';
export interface Metric {
  value: number | null;
  n: number;
}
export interface CityResult {
  cityId: string;
  n: number;
  chemistry: Metric;
  fog: Metric;
  friction: Metric;
  habitat: string | null;
  forecast: string;
}
export const METRICS = {
  chemistry: {
    label: 'Connection',
    description:
      'Meeting someone you like, feeling like yourself, and recommending dating here.',
    direction: 'Higher = more positive experiences',
    low: 'Less connection',
    high: 'More connection',
    color: '#65a0e8',
  },
  fog: {
    label: 'Mixed messages',
    description:
      'Unclear intentions and conversations disappearing without a goodbye.',
    direction: 'Higher = more confusion',
    low: 'Less confusion',
    high: 'More confusion',
    color: '#dc86a0',
  },
  friction: {
    label: 'Date hassles',
    description:
      'Plans falling through, unaffordable dates, and difficult travel.',
    direction: 'Higher = more practical barriers',
    low: 'Fewer hassles',
    high: 'More hassles',
    color: '#c79657',
  },
} as const;
function meanComplete(values: (number | null)[]): number | null {
  return values.some((v) => v === null)
    ? null
    : values.reduce<number>((sum, v) => sum + (v ?? 0), 0) / values.length;
}
const positive = (v: number | null) => (v === null ? null : 25 * (v - 1));
const reverse = (v: number | null) => (v === null ? null : 100 - 25 * (v - 1));
export function scoreAnswers(a: Answers): Record<MetricKey, number | null> {
  return {
    chemistry: meanComplete([
      positive(a.spark),
      positive(a.authenticity),
      positive(a.hope),
    ]),
    fog: meanComplete([reverse(a.clarity), positive(a.ghosting)]),
    friction: meanComplete([
      reverse(a.followThrough),
      reverse(a.affordability),
      positive(a.logistics),
    ]),
  };
}
export function roundScore(value: number) {
  return Math.round(value / 5) * 5;
}
export function forecastLabel(
  chemistry: number | null,
  fog: number | null,
  friction: number | null,
): string {
  if (chemistry === null || fog === null || friction === null)
    return 'Still reading the atmosphere';
  if (chemistry >= 60 && fog < 50) return 'Mostly butterflies';
  if (chemistry >= 60 && fog >= 50)
    return 'Hot with a chance of “what are we?”';
  if (chemistry < 60 && friction >= 60) return 'Excellent couch weather';
  return 'Scattered possibilities';
}
export function personalForecast(a: Answers) {
  const s = scoreAnswers(a);
  return { ...s, label: forecastLabel(s.chemistry, s.fog, s.friction) };
}
/** Illustrative fixtures are never inserted into the survey database. */
export const DEMO_RESULTS: CityResult[] = [
  ['london', 48, 60, 75, 65, 'apps'],
  ['nyc', 72, 70, 85, 80, 'apps'],
  ['mumbai', 54, 80, 60, 65, 'friends'],
  ['bengaluru', 39, 65, 65, 80, 'hobbies'],
  ['paris', 42, 75, 55, 40, 'irl'],
  ['berlin', 35, 65, 70, 35, 'hobbies'],
  ['tokyo', 31, 50, 40, 60, 'friends'],
  ['seoul', 28, 75, 65, 60, 'apps'],
  ['singapore', 24, 65, 40, 55, 'apps'],
  ['sydney', 32, 85, 30, 35, 'irl'],
  ['cape-town', 23, 80, 35, 40, 'hobbies'],
  ['nairobi', 21, 75, 55, 40, 'friends'],
  ['lagos', 27, 70, 65, 65, 'friends'],
  ['sao-paulo', 36, 85, 45, 45, 'irl'],
  ['buenos-aires', 29, 80, 50, 35, 'irl'],
  ['mexico-city', 33, 80, 40, 45, 'friends'],
  ['toronto', 38, 60, 65, 55, 'apps'],
  ['lisbon', 25, 85, 35, 25, 'irl'],
  ['amsterdam', 26, 80, 25, 35, 'hobbies'],
  ['dubai', 32, 55, 75, 80, 'apps'],
  ['bangkok', 22, 70, 60, 40, 'irl'],
  ['jakarta', 28, 65, 55, 70, 'friends'],
  ['auckland', 20, 80, 30, 30, 'hobbies'],
  ['los-angeles', 46, 65, 80, 90, 'apps'],
].map(([cityId, n, chemistry, fog, friction, habitat]) => ({
  cityId: String(cityId),
  n: Number(n),
  chemistry: { value: Number(chemistry), n: Number(n) },
  fog: { value: Number(fog), n: Number(n) },
  friction: { value: Number(friction), n: Number(n) },
  habitat: String(habitat),
  forecast: forecastLabel(Number(chemistry), Number(fog), Number(friction)),
}));
