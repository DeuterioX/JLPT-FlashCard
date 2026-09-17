import { eq, inArray, asc } from 'drizzle-orm';
import type { Db } from '../db/client';
import { cardGroup, card, cardAnswer, session, sessionGroup, attempt } from '../db/schema';
import { normalizeAnswer } from '../kana/normalize';
import { AppError, badRequest, notFound } from './errors';

export type RoundCard = {
  id: number; prompt: string; meaning: string | null;
  answers: string[]; primary: string;
};
export type RoundPayload = {
  sessionId: number; groupIds: number[]; cards: RoundCard[]; mode: 'normal' | 'review';
};

/**
 * Arma las cartas de un conjunto de grupos, con todas sus romanizaciones.
 * Se exporta aparte de `openRound` porque la Tarea 14 (editor de mazos) la
 * reutiliza para previsualizar cartas sin abrir una ronda.
 */
export function cardsForGroups(db: Db, groupIds: number[]): RoundCard[] {
  if (groupIds.length === 0) return [];
  const cards = db.select().from(card)
    .where(inArray(card.groupId, groupIds)).orderBy(asc(card.sortOrder)).all();
  if (cards.length === 0) return [];

  const answers = db.select().from(cardAnswer)
    .where(inArray(cardAnswer.cardId, cards.map((c) => c.id))).all();

  const byCard = new Map<number, typeof answers>();
  for (const a of answers) {
    const list = byCard.get(a.cardId) ?? [];
    list.push(a);
    byCard.set(a.cardId, list);
  }

  return cards.map((c) => {
    const list = byCard.get(c.id) ?? [];
    return {
      id: c.id,
      prompt: c.prompt,
      meaning: c.meaning,
      answers: list.map((a) => a.romaji),
      // La primaria es la que se muestra al revelar. Si faltara, se usa la primera.
      primary: (list.find((a) => a.isPrimary) ?? list[0])?.romaji ?? '',
    };
  });
}

export function openRound(
  db: Db, groupIds: number[], mode: 'normal' | 'review' = 'normal',
): RoundPayload {
  if (groupIds.length === 0) throw badRequest('Elegí al menos un grupo para practicar');

  const found = db.select().from(cardGroup).where(inArray(cardGroup.id, groupIds)).all();
  if (found.length !== new Set(groupIds).size) throw notFound('alguno de los grupos');

  const cards = cardsForGroups(db, groupIds);
  if (cards.length === 0) throw badRequest('Los grupos elegidos no tienen cartas');

  let sessionId = 0;
  db.transaction((tx) => {
    const t = tx as Db;
    const [s] = t.insert(session).values({ mode, total: cards.length }).returning().all();
    sessionId = s.id;
    for (const gid of new Set(groupIds)) {
      t.insert(sessionGroup).values({ sessionId: s.id, groupId: gid }).run();
    }
  });

  return { sessionId, groupIds: [...new Set(groupIds)], cards, mode };
}

/**
 * Una ronda que ya se cerró no acepta más escrituras. Un `sessionStorage`
 * viejo re-jugado (Back, recarga, pestaña restaurada) podía seguir mandando
 * intentos y un segundo PATCH a una sesión terminada, pisándole
 * `finished_at` y sumándole la segunda jugada a sus totales. El cliente ya
 * no reusa una ronda consumida (ver lib/quiz/stored-round.ts), pero el
 * server lo rechaza igual: defensa en profundidad.
 */
const roundFinished = () => new AppError('La ronda ya terminó', 409);

function openSession(db: Db, sessionId: number) {
  const [s] = db.select().from(session).where(eq(session.id, sessionId)).all();
  if (!s) throw notFound('la ronda');
  if (s.finishedAt !== null) throw roundFinished();
  return s;
}

/** Una fila por cada Enter. Se llama fire-and-forget desde el cliente. */
export function recordAttempt(db: Db, input: {
  sessionId: number; cardId: number; typed: string;
  isCorrect: boolean; revealed: boolean; ms: number;
}): void {
  openSession(db, input.sessionId);
  // Sin este chequeo, una carta borrada (o un id cualquiera) llegaba al
  // INSERT y la foreign key lo rechazaba como un 500 genérico.
  const [c] = db.select({ id: card.id }).from(card).where(eq(card.id, input.cardId)).all();
  if (!c) throw notFound('la carta');

  db.insert(attempt).values({
    sessionId: input.sessionId,
    cardId: input.cardId,
    // El spec guarda lo tipeado normalizado (misma forma que card_answer).
    typed: normalizeAnswer(input.typed),
    isCorrect: input.isCorrect,
    revealed: input.revealed,
    ms: input.ms,
  }).run();
}

/** Consolida desde attempt, que es la fuente de verdad, no desde números que mande el cliente. */
export function closeRound(db: Db, sessionId: number): void {
  openSession(db, sessionId);
  const rows = db.select().from(attempt).where(eq(attempt.sessionId, sessionId)).all();
  const correct = rows.filter((r) => r.isCorrect).length;

  db.update(session).set({
    finishedAt: new Date().toISOString(),
    correct,
    incorrect: rows.length - correct,
  }).where(eq(session.id, sessionId)).run();
}
