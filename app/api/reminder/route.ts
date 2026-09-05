import { calendarEvent } from '@/lib/calendar';
// Fixed public origin prevents Host-header injection into calendar links.
export function GET() {
  return new Response(
    calendarEvent('https://mixed-signals-atlas.sg127977958.chatgpt.site'),
    {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition':
          'attachment; filename="mixed-signals-reveal.ics"',
        'Cache-Control': 'public, max-age=3600',
      },
    },
  );
}
