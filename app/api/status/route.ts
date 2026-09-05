import { getDb } from '@/db';
import { status } from '@/lib/server/service';
import { handle } from '@/lib/server/http';
export function GET() {
  return handle(() => status(getDb()));
}
