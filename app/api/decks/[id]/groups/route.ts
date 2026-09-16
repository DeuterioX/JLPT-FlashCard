import { db } from '@/lib/db/client';
import { route, idFrom, readJson, type RouteCtx } from '@/lib/api/handler';
import { renameSchema } from '@/lib/api/schemas';
import { createGroup } from '@/lib/services/decks';

export const POST = (req: Request, ctx: RouteCtx) =>
  route(async () => {
    const { name } = renameSchema.parse(await readJson(req));
    return createGroup(db, await idFrom(ctx), name);
  }, 201);
