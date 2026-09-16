import { db } from '@/lib/db/client';
import { route, idFrom } from '@/lib/api/handler';
import { createCardSchema } from '@/lib/api/schemas';
import { createCard } from '@/lib/services/decks';

type Ctx = { params: Promise<{ id: string }> };

export const POST = (req: Request, ctx: Ctx) =>
  route(async () => {
    const body = createCardSchema.parse(await req.json());
    return createCard(db, await idFrom(ctx), body);
  }, 201);
