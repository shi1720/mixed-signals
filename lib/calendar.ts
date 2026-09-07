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
    'PRODID:-//Mixed Signals//City Dating Survey//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${CAMPAIGN.id}@mixed-signals.atlas`,
    `DTSTAMP:${date(now)}`,
    `DTSTART:${date(CAMPAIGN.revealsAt)}`,
    `DTEND:${date(new Date(start + 15 * 60000).toISOString())}`,
    'SUMMARY:Mixed Signals city reports are open',
    `DESCRIPTION:${escape('The survey has closed. See anonymous city reports at ' + origin)}`,
    `URL:${origin}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT10M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Mixed Signals city reports open in 10 minutes.',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}
