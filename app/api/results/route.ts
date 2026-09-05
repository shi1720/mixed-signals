import { getDb } from '@/db';
import { results } from '@/lib/server/service';
import { handle } from '@/lib/server/http';
export function GET() {
  return handle(() => results(getDb()));
}
