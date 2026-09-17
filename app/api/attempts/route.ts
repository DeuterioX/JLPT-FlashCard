import { db } from '@/lib/db/client';
import { route, readJson } from '@/lib/api/handler';
import { recordAttemptSchema } from '@/lib/api/schemas';
import { recordAttempt } from '@/lib/services/sessions';

export const POST = async (req: Request) =>
  route(async () => {
    recordAttempt(db, recordAttemptSchema.parse(await readJson(req)));
    return { ok: true };
  }, 201);
