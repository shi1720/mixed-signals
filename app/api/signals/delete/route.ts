import { getDb } from '@/db';
import { deleteSignal } from '@/lib/server/service';
import { handle } from '@/lib/server/http';
export function POST(request: Request) {
  return handle(() => deleteSignal(request, getDb()));
}
