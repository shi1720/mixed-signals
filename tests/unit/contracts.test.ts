import { describe, it, expect } from 'vitest';
import { campaignPhase, CAMPAIGN, timeRemaining } from '@/lib/campaign';
import { calendarEvent } from '@/lib/calendar';
import { searchCities, CITIES } from '@/lib/cities';
import { submissionSchema, EMPTY_ANSWERS } from '@/lib/survey';
const valid = {
  cityId: 'london',
  answers: {
    spark: 3,
    followThrough: 3,
    affordability: 3,
    clarity: 3,
    authenticity: 3,
    ghosting: 3,
    logistics: 3,
    hope: 3,
  },
  habitat: 'apps',
  adult: true,
  resident: true,
  consent: true,
  idempotencyKey: crypto.randomUUID(),
};
describe('fixed campaign clock', () => {
  const start = Date.parse(CAMPAIGN.opensAt),
    end = Date.parse(CAMPAIGN.revealsAt);
  it('is exactly seven days', () => expect(end - start).toBe(7 * 86400000));
  it('opens exactly at the opening instant', () => {
    expect(campaignPhase(start - 1)).toBe('upcoming');
    expect(campaignPhase(start)).toBe('collecting');
  });
  it('closes at the exact reveal instant, not a millisecond later', () => {
    expect(campaignPhase(end - 1)).toBe('collecting');
    expect(campaignPhase(end)).toBe('revealed');
    expect(campaignPhase(end + 1)).toBe('revealed');
  });
  it('countdown never becomes negative or resets after reveal', () => {
    expect(timeRemaining(end + 100000)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
    expect(timeRemaining(start).days).toBe(7);
  });
});
describe('submission contract', () => {
  it('accepts a well formed signal', () =>
    expect(submissionSchema.safeParse(valid).success).toBe(true));
  it.each(['adult', 'resident', 'consent'])('requires explicit %s', (key) =>
    expect(submissionSchema.safeParse({ ...valid, [key]: false }).success).toBe(
      false,
    ),
  );
  it.each([0, 6, 2.5, '3', NaN, Infinity])(
    'rejects invalid score %s',
    (score) =>
      expect(
        submissionSchema.safeParse({
          ...valid,
          answers: { ...valid.answers, spark: score },
        }).success,
      ).toBe(false),
  );
  it('requires at least four substantive answers', () => {
    expect(
      submissionSchema.safeParse({ ...valid, answers: EMPTY_ANSWERS }).success,
    ).toBe(false);
    expect(
      submissionSchema.safeParse({
        ...valid,
        answers: {
          ...EMPTY_ANSWERS,
          spark: 3,
          clarity: 4,
          hope: 3,
          ghosting: 2,
        },
      }).success,
    ).toBe(true);
  });
  it('rejects unknown cities, extra keys, and honeypot values', () => {
    expect(
      submissionSchema.safeParse({ ...valid, cityId: 'Atlantis' }).success,
    ).toBe(false);
    expect(
      submissionSchema.safeParse({ ...valid, email: 'someone@example.com' })
        .success,
    ).toBe(false);
    expect(
      submissionSchema.safeParse({ ...valid, website: 'spam' }).success,
    ).toBe(false);
  });
});
describe('geography and reminder', () => {
  it('finds accents, countries, aliases, and disambiguates cities', () => {
    expect(searchCities('sao paulo')[0].id).toBe('sao-paulo');
    expect(searchCities('bangalore')[0].id).toBe('bengaluru');
    expect(searchCities('India').length).toBeGreaterThan(10);
    expect(searchCities('  new delhi ')[0].id).toBe('delhi');
    expect(new Set(CITIES.map((c) => c.id)).size).toBe(CITIES.length);
  });
  it('exports a UTC calendar event with CRLF and a stable UID', () => {
    const text = calendarEvent(
      'https://example.com',
      '2026-09-05T13:00:00.000Z',
    );
    expect(text).toContain('DTSTART:20260912T130000Z\r\n');
    expect(text).toContain('DTEND:20260912T131500Z\r\n');
    expect(text).toContain('UID:season-001@mixed-signals.atlas');
    expect(text).toContain('TRIGGER:-PT10M');
    expect(text).not.toMatch(/(?<!\r)\n/);
  });
});
