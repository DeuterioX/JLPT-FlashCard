import { db } from '@/lib/db/client';
import { route } from '@/lib/api/handler';
import { searchDict } from '@/lib/services/dict';

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

/** Un límite ausente, no numérico o no positivo cae al default; siempre se topa al máximo. */
function parseLimit(raw: string | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(n), MAX_LIMIT);
}

export const GET = (req: Request) =>
  route(() => {
    const params = new URL(req.url).searchParams;
    return searchDict(db, params.get('q') ?? '', parseLimit(params.get('limit')));
  });
