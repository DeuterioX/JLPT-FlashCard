import { db } from '@/lib/db/client';
import { route, idFrom, readJson, type RouteCtx } from '@/lib/api/handler';
import { renameSchema } from '@/lib/api/schemas';
import { getDeck, renameDeck, deleteDeck } from '@/lib/services/decks';

export const GET = (_req: Request, ctx: RouteCtx) =>
  route(async () => getDeck(db, await idFrom(ctx)));

export const PATCH = (req: Request, ctx: RouteCtx) =>
  route(async () => {
    const { name } = renameSchema.parse(await readJson(req));
    renameDeck(db, await idFrom(ctx), name);
    return { ok: true };
  });

export const DELETE = (_req: Request, ctx: RouteCtx) =>
  route(async () => {
    deleteDeck(db, await idFrom(ctx));
    return { ok: true };
  });
