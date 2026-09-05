import { getDb } from '@/db';
import { handle, json } from '@/lib/server/http';
export function GET() {
  return handle(async () => {
    await getDb().prepare('SELECT 1 FROM submissions LIMIT 1').first();
    return json({ status: 'ok', service: 'mixed-signals' });
  });
}
