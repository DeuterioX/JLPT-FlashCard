import { db } from '@/lib/db/client';
import { route, idFrom } from '@/lib/api/handler';
import { renameSchema } from '@/lib/api/schemas';
import { renameGroup, deleteGroup } from '@/lib/services/decks';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = (req: Request, ctx: Ctx) =>
  route(async () => {
    const { name } = renameSchema.parse(await req.json());
    renameGroup(db, await idFrom(ctx), name);
    return { ok: true };
  });

export const DELETE = (_req: Request, ctx: Ctx) =>
  route(async () => {
    deleteGroup(db, await idFrom(ctx));
    return { ok: true };
  });
