/** One server-owned global window, never a countdown restarted by visiting. */
export const CAMPAIGN = {
  id: 'season-001',
  title: 'The first signal',
  opensAt: '2026-09-05T13:00:00.000Z',
  revealsAt: '2026-09-12T13:00:00.000Z',
  minimumCitySample: 10,
  minimumMetricSample: 10,
  rawRetentionDays: 30,
} as const;
export type CampaignPhase = 'upcoming' | 'collecting' | 'revealed';
export function campaignPhase(now: number = Date.now()): CampaignPhase {
  if (now < Date.parse(CAMPAIGN.opensAt)) return 'upcoming';
  return now < Date.parse(CAMPAIGN.revealsAt) ? 'collecting' : 'revealed';
}
export function timeRemaining(now: number, deadline = CAMPAIGN.revealsAt) {
  const seconds = Math.max(0, Math.floor((Date.parse(deadline) - now) / 1000));
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
  };
}
