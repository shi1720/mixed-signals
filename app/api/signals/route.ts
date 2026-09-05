import { getDb } from '@/db';
import { submitSignal } from '@/lib/server/service';
import { handle } from '@/lib/server/http';
export function POST(request: Request) {
  return handle(() => submitSignal(request, getDb()));
}
