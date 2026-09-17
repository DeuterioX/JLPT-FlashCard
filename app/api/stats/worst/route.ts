import { db } from '@/lib/db/client';
import { route } from '@/lib/api/handler';
import { worstCards, type StatsRange } from '@/lib/services/stats';

export const GET = (req: Request) =>
  route(() => {
    const params = new URL(req.url).searchParams;
    const w = params.get('window');
    const range: StatsRange = w === '7d' || w === 'all' ? w : '30d';
    const limit = Math.min(Number(params.get('limit') ?? 20) || 20, 100);
    return worstCards(db, range, limit);
  });
