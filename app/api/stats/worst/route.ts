import { db } from '@/lib/db/client';
import { route } from '@/lib/api/handler';
import { parseLimit, parseRange } from '@/lib/api/params';
import { worstCards } from '@/lib/services/stats';

const DEFAULT_LIMIT = 20;

export const GET = (req: Request) =>
  route(() => {
    const params = new URL(req.url).searchParams;
    return worstCards(db, parseRange(params.get('window')), parseLimit(params.get('limit'), DEFAULT_LIMIT));
  });
