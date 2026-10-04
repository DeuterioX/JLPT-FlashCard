import { db } from '@/lib/db/client';
import { listDecks } from '@/lib/services/decks';
import { DeckList } from '@/components/decks/DeckList';

// Sin ninguna API dinámica (cookies, params) que lo delate, Next preprocesa
// esta página una sola vez en el build y sirve ese HTML congelado para
// siempre: crear, borrar o renombrar un mazo nunca aparecía sin un rebuild
// completo. Acá se lee la base en cada request a propósito.
export const dynamic = 'force-dynamic';

export default function Page() {
  return <DeckList decks={listDecks(db)} />;
}
