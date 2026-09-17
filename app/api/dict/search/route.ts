import { db } from '@/lib/db/client';
import { route } from '@/lib/api/handler';
import { parseLimit } from '@/lib/api/params';
import { searchDict } from '@/lib/services/dict';

const DEFAULT_LIMIT = 30;

export const GET = (req: Request) =>
  route(() => {
    const params = new URL(req.url).searchParams;
    return searchDict(db, params.get('q') ?? '', parseLimit(params.get('limit'), DEFAULT_LIMIT));
  });
