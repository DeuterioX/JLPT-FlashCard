import { db } from '@/lib/db/client';
import { route, idFrom } from '@/lib/api/handler';
import { renameSchema } from '@/lib/api/schemas';
import { createGroup } from '@/lib/services/decks';

type Ctx = { params: Promise<{ id: string }> };

export const POST = (req: Request, ctx: Ctx) =>
  route(async () => {
    const { name } = renameSchema.parse(await req.json());
    return createGroup(db, await idFrom(ctx), name);
  }, 201);
