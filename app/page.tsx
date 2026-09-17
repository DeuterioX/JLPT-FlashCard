import { cookies } from 'next/headers';
import { db } from '@/lib/db/client';
import { listDecks } from '@/lib/services/decks';
import { SELECTION_COOKIE, parseSelection } from '@/lib/selection-cookie';
import { PracticeBoard } from '@/components/PracticeBoard';

export default async function Page() {
  // Server Component: llama al service directo, sin fetch a sí mismo.
  const decks = listDecks(db);
  const jar = await cookies();
  const selection = parseSelection(jar.get(SELECTION_COOKIE)?.value);

  return <PracticeBoard decks={decks} initialSelection={selection} />;
}
