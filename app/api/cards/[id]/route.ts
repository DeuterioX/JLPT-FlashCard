import { db } from '@/lib/db/client';
import { route, idFrom } from '@/lib/api/handler';
import { updateCardSchema } from '@/lib/api/schemas';
import { updateCard, deleteCard } from '@/lib/services/decks';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = (req: Request, ctx: Ctx) =>
  route(async () => {
    const body = updateCardSchema.parse(await req.json());
    updateCard(db, await idFrom(ctx), body);
    return { ok: true };
  });

export const DELETE = (_req: Request, ctx: Ctx) =>
  route(async () => {
    deleteCard(db, await idFrom(ctx));
    return { ok: true };
  });
