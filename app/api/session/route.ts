import { getDb } from '@/db';
import { createSession } from '@/lib/server/service';
import { handle } from '@/lib/server/http';
export function GET(request: Request) {
  return handle(() => createSession(request, getDb()));
}
