import { notFound } from 'next/navigation';
import { db } from '@/lib/db/client';
import { getDeck, type DeckSummary } from '@/lib/services/decks';
import { cardsForGroups } from '@/lib/services/sessions';
import { isDictionaryLoaded } from '@/lib/services/dict';
import { AppError } from '@/lib/services/errors';
import { DeckEditor, type EditorCard } from '@/components/DeckEditor';

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

  // Se reusa cardsForGroups: ya resuelve las respuestas y la primaria.
  const cards: EditorCard[] = deck.groups.flatMap((g) =>
    cardsForGroups(db, [g.id]).map((c) => ({
      id: c.id, prompt: c.prompt, meaning: c.meaning, primary: c.primary,
      // Todas las romanizaciones, no solo la primaria: editar una carta sin
      // ellas borraría sus alternativas al guardar.
      answers: c.answers, groupId: g.id,
    })),
  );

  // Se resuelve acá, en el servidor, y baja como prop: el buscador avisa que
  // no hay diccionario en vez de decir "sin resultados" (sin otra ruta de API).
  return <DeckEditor deck={deck} cards={cards} dictionaryLoaded={isDictionaryLoaded(db)} />;
}
