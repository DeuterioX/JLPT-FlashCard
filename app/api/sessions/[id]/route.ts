import { db } from '@/lib/db/client';
import { route, idFrom, type RouteCtx } from '@/lib/api/handler';
import { closeRound } from '@/lib/services/sessions';

export const PATCH = (_req: Request, ctx: RouteCtx) =>
  route(async () => {
    closeRound(db, await idFrom(ctx));
    return { ok: true };
  });
