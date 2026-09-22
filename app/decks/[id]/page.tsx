import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/db/client';
import { getDeck, type DeckSummary } from '@/lib/services/decks';
import { AppError } from '@/lib/services/errors';
import { DeckGroups } from '@/components/DeckGroups';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) notFound();

  // Definite-assignment: si `getDeck` tira, el catch de abajo siempre corta
  // la ejecución (con `notFound()` o relanzando), así que si llegamos más
  // allá del try/catch es porque `deck` sí quedó asignado.
  let deck!: DeckSummary;
  try {
    deck = getDeck(db, numericId);
  } catch (e) {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  }

  // Un mazo de un solo grupo no muestra el nivel de grupos: se entra directo
  // a sus cartas. El nivel existe siempre en la base, pero sólo se muestra
  // cuando significa algo -y desde la pantalla de cartas se puede crear el
  // segundo grupo, así que no queda ningún callejón sin salida-.
  if (deck.groups.length === 1) redirect(`/decks/${deck.id}/groups/${deck.groups[0].id}`);

  return <DeckGroups deck={deck} />;
}
