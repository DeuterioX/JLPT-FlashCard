import { db } from '@/lib/db/client';
import { route, readJson } from '@/lib/api/handler';
import { openRoundSchema } from '@/lib/api/schemas';
import { openRound } from '@/lib/services/sessions';

export const POST = async (req: Request) =>
  route(async () => openRound(db, openRoundSchema.parse(await readJson(req)).groupIds), 201);
