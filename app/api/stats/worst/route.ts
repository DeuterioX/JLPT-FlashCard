import { db } from '@/lib/db/client';
import { route } from '@/lib/api/handler';
import { worstCards, type StatsRange } from '@/lib/services/stats';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/** Un límite ausente, no numérico, negativo o cero cae al default: sólo un
 * entero positivo real pisa el default, y siempre se lo tope al máximo. */
function parseLimit(raw: string | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(n), MAX_LIMIT);
}

export const GET = (req: Request) =>
  route(() => {
    const params = new URL(req.url).searchParams;
    const w = params.get('window');
    const range: StatsRange = w === '7d' || w === 'all' ? w : '30d';
    const limit = parseLimit(params.get('limit'));
    return worstCards(db, range, limit);
  });
