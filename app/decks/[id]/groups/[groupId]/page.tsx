import { notFound } from 'next/navigation';
import { db } from '@/lib/db/client';
import { getDeck, type DeckSummary } from '@/lib/services/decks';
import { cardsForGroups } from '@/lib/services/sessions';
import { isDictionaryLoaded } from '@/lib/services/dict';
import { AppError } from '@/lib/services/errors';
import { GroupCards, type EditorCard } from '@/components/decks/GroupCards';

export default async function Page({
  params,
}: { params: Promise<{ id: string; groupId: string }> }) {
  const { id, groupId } = await params;
  const deckId = Number(id);
  const gid = Number(groupId);
  if (!Number.isInteger(deckId) || deckId <= 0) notFound();
  if (!Number.isInteger(gid) || gid <= 0) notFound();

  let deck!: DeckSummary;
  try {
    deck = getDeck(db, deckId);
  } catch (e) {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  }

  // El grupo tiene que pertenecer a ESTE mazo: sin la comprobación,
  // /decks/1/groups/99 mostraría las cartas de un grupo ajeno bajo el
  // encabezado del mazo equivocado.
  const group = deck.groups.find((g) => g.id === gid);
  if (!group) notFound();

  // Se reusa cardsForGroups: ya resuelve las respuestas y la primaria.
  const cards: EditorCard[] = cardsForGroups(db, [group.id]).map((c) => ({
    id: c.id, prompt: c.prompt, meaning: c.meaning, primary: c.primary,
    // Todas las romanizaciones, no solo la primaria: editar una carta sin
    // ellas borraría sus alternativas al guardar.
    answers: c.answers, groupId: group.id,
  }));

  // Se resuelve acá, en el servidor, y baja como prop: el buscador avisa que
  // no hay diccionario en vez de decir "sin resultados".
  return (
    <GroupCards deck={deck} group={group} cards={cards} dictionaryLoaded={isDictionaryLoaded(db)} />
  );
}
