import { db } from '@/lib/db/client';
import { route } from '@/lib/api/handler';
import { parseRange } from '@/lib/api/params';
import { overview } from '@/lib/services/stats';

export const GET = (req: Request) =>
  route(() => overview(db, parseRange(new URL(req.url).searchParams.get('window'))));
