import { db } from '@/lib/db/client';
import { route, readJson } from '@/lib/api/handler';
import { openRoundSchema } from '@/lib/api/schemas';
import { openRound } from '@/lib/services/sessions';

export const POST = async (req: Request) =>
  route(async () => {
    const { groupIds, mode } = openRoundSchema.parse(await readJson(req));
    return openRound(db, groupIds, mode);
  }, 201);
