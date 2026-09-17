import { db } from '@/lib/db/client';
import { route, readOptionalJson } from '@/lib/api/handler';
import { reviewRoundSchema } from '@/lib/api/schemas';
import { openReviewRound } from '@/lib/services/stats';

export const POST = async (req: Request) =>
  route(async () => {
    const body = reviewRoundSchema.parse(await readOptionalJson(req));
    return openReviewRound(db, body.limit);
  }, 201);
