import { db } from '@/lib/db/client';
import { route } from '@/lib/api/handler';
import { overview, type StatsRange } from '@/lib/services/stats';

export const GET = (req: Request) =>
  route(() => {
    const w = new URL(req.url).searchParams.get('window');
    const range: StatsRange = w === '7d' || w === 'all' ? w : '30d';
    return overview(db, range);
  });
