import { CAMPAIGN } from './campaign';
const escape = (v: string) =>
  v
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
const date = (v: string) => v.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
export function calendarEvent(origin: string, now = new Date().toISOString()) {
  const start = Date.parse(CAMPAIGN.revealsAt);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mixed Signals//Dating Weather//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${CAMPAIGN.id}@mixed-signals.atlas`,
    `DTSTAMP:${date(now)}`,
    `DTSTART:${date(CAMPAIGN.revealsAt)}`,
    `DTEND:${date(new Date(start + 15 * 60000).toISOString())}`,
    'SUMMARY:Mixed Signals: the dating atlas is open',
    `DESCRIPTION:${escape('The seven-day experiment is ready. Explore the world’s dating weather at ' + origin)}`,
    `URL:${origin}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT10M',
    'ACTION:DISPLAY',
    'DESCRIPTION:The world has a dating forecast.',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}
