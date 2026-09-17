import { db } from '@/lib/db/client';
import { route, readJson } from '@/lib/api/handler';
import { createDeckSchema } from '@/lib/api/schemas';
import { listDecks, createDeck } from '@/lib/services/decks';

export const GET = () => route(() => listDecks(db));

export const POST = async (req: Request) =>
  route(async () => createDeck(db, createDeckSchema.parse(await readJson(req))), 201);
