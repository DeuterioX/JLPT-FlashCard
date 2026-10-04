import { notFound } from 'next/navigation';
import { db } from '@/lib/db/client';
import { getDeck, type DeckSummary } from '@/lib/services/decks';
import { AppError } from '@/lib/services/errors';
import { DeckGroups } from '@/components/decks/DeckGroups';

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

  return <DeckGroups deck={deck} />;
}
