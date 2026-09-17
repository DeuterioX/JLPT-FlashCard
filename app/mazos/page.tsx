import { db } from '@/lib/db/client';
import { listDecks } from '@/lib/services/decks';
import { DeckList } from '@/components/DeckList';

export default function Page() {
  return <DeckList decks={listDecks(db)} />;
}
