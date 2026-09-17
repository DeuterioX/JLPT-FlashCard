import { db } from '@/lib/db/client';
import { route, idFrom, readJson, type RouteCtx } from '@/lib/api/handler';
import { renameSchema } from '@/lib/api/schemas';
import { renameGroup, deleteGroup } from '@/lib/services/decks';

export const PATCH = (req: Request, ctx: RouteCtx) =>
  route(async () => {
    const { name } = renameSchema.parse(await readJson(req));
    renameGroup(db, await idFrom(ctx), name);
    return { ok: true };
  });

export const DELETE = (_req: Request, ctx: RouteCtx) =>
  route(async () => {
    deleteGroup(db, await idFrom(ctx));
    return { ok: true };
  });
