import { db } from '@/lib/db/client';
import { route, idFrom, readJson, type RouteCtx } from '@/lib/api/handler';
import { updateCardSchema } from '@/lib/api/schemas';
import { updateCard, deleteCard } from '@/lib/services/decks';

export const PATCH = (req: Request, ctx: RouteCtx) =>
  route(async () => {
    const body = updateCardSchema.parse(await readJson(req));
    updateCard(db, await idFrom(ctx), body);
    return { ok: true };
  });

export const DELETE = (_req: Request, ctx: RouteCtx) =>
  route(async () => {
    deleteCard(db, await idFrom(ctx));
    return { ok: true };
  });
