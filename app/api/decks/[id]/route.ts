import { db } from '@/lib/db/client';
import { route, idFrom } from '@/lib/api/handler';
import { renameSchema } from '@/lib/api/schemas';
import { getDeck, renameDeck, deleteDeck } from '@/lib/services/decks';

type Ctx = { params: Promise<{ id: string }> };

export const GET = (_req: Request, ctx: Ctx) =>
  route(async () => getDeck(db, await idFrom(ctx)));

export const PATCH = (req: Request, ctx: Ctx) =>
  route(async () => {
    const { name } = renameSchema.parse(await req.json());
    renameDeck(db, await idFrom(ctx), name);
    return { ok: true };
  });

export const DELETE = (_req: Request, ctx: Ctx) =>
  route(async () => {
    deleteDeck(db, await idFrom(ctx));
    return { ok: true };
  });
