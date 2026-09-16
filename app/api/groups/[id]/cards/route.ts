import { db } from '@/lib/db/client';
import { route, idFrom, readJson, type RouteCtx } from '@/lib/api/handler';
import { createCardSchema } from '@/lib/api/schemas';
import { createCard } from '@/lib/services/decks';

export const POST = (req: Request, ctx: RouteCtx) =>
  route(async () => {
    const body = createCardSchema.parse(await readJson(req));
    return createCard(db, await idFrom(ctx), body);
  }, 201);
