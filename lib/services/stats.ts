import { gte, desc, inArray } from 'drizzle-orm';
import type { Db } from '../db/client';
import { attempt, card, cardAnswer, cardGroup, session, sessionGroup } from '../db/schema';
import { badRequest } from './errors';
import { cardsForGroups, type RoundPayload } from './sessions';
import { shuffle } from '../quiz/engine';

// Se llama `StatsRange`, no `Window`: un `Window` a secas invita a nombrar la
// variable local igual, y eso taparía el `window` global del navegador en
// cualquier código de cliente que la use.
export type StatsRange = '7d' | '30d' | 'all';

/** Mínimo de apariciones para entrar al ranking: una carta nueva no lo encabeza. */
const MIN_SEEN = 5;
/** Dominada: al menos 5 intentos y 90% de aciertos. */
const MASTERY_MIN_ATTEMPTS = 5;
const MASTERY_ACCURACY = 0.9;

function since(range: StatsRange): string | null {
  if (range === 'all') return null;
  const days = range === '7d' ? 7 : 30;
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function attemptsIn(db: Db, range: StatsRange) {
  const from = since(range);
  const q = db.select().from(attempt);
  return from ? q.where(gte(attempt.createdAt, from)).all() : q.all();
}

export type WorstCard = {
  cardId: number; prompt: string; primary: string;
  seen: number; errors: number; rate: number;
};

export function worstCards(db: Db, range: StatsRange, limit = 20): WorstCard[] {
  const rows = attemptsIn(db, range);
  if (rows.length === 0) return [];

  const agg = new Map<number, { seen: number; errors: number }>();
  for (const r of rows) {
    const a = agg.get(r.cardId) ?? { seen: 0, errors: 0 };
    a.seen += 1;
    if (!r.isCorrect) a.errors += 1;
    agg.set(r.cardId, a);
  }

  const eligible = [...agg.entries()]
    .filter(([, a]) => a.seen >= MIN_SEEN && a.errors > 0)
    // Por TASA, no por errores absolutos: 8 de 40 es mejor que 5 de 10.
    .sort((x, y) => y[1].errors / y[1].seen - x[1].errors / x[1].seen)
    .slice(0, limit);

  if (eligible.length === 0) return [];

  const ids = eligible.map(([id]) => id);
  const cards = db.select().from(card).where(inArray(card.id, ids)).all();
  const answers = db.select().from(cardAnswer).where(inArray(cardAnswer.cardId, ids)).all();

  return eligible.map(([cardId, a]) => {
    const c = cards.find((x) => x.id === cardId);
    const own = answers.filter((x) => x.cardId === cardId);
    return {
      cardId,
      prompt: c?.prompt ?? '',
      primary: (own.find((x) => x.isPrimary) ?? own[0])?.romaji ?? '',
      seen: a.seen,
      errors: a.errors,
      rate: a.errors / a.seen,
    };
  });
}

export type GroupAccuracy = { groupId: number; name: string; accuracy: number; attempts: number };

export type Overview = {
  attempts: number; correct: number; incorrect: number; accuracy: number;
  rounds: number; mastered: number; totalCards: number;
  byGroup: GroupAccuracy[];
  history: { id: number; startedAt: string; total: number; correct: number;
             incorrect: number; accuracy: number; label: string }[];
};

export function overview(db: Db, range: StatsRange): Overview {
  const rows = attemptsIn(db, range);
  const correct = rows.filter((r) => r.isCorrect).length;
  const totalCards = db.select().from(card).all().length;

  // Dominio por carta.
  const perCard = new Map<number, { n: number; ok: number }>();
  for (const r of rows) {
    const a = perCard.get(r.cardId) ?? { n: 0, ok: 0 };
    a.n += 1;
    if (r.isCorrect) a.ok += 1;
    perCard.set(r.cardId, a);
  }
  const mastered = [...perCard.values()]
    .filter((a) => a.n >= MASTERY_MIN_ATTEMPTS && a.ok / a.n >= MASTERY_ACCURACY).length;

  // Accuracy por grupo: attempt → card → card_group.
  const cards = db.select().from(card).all();
  const groupOf = new Map(cards.map((c) => [c.id, c.groupId]));
  const perGroup = new Map<number, { n: number; ok: number }>();
  for (const r of rows) {
    const gid = groupOf.get(r.cardId);
    if (gid === undefined) continue;
    const a = perGroup.get(gid) ?? { n: 0, ok: 0 };
    a.n += 1;
    if (r.isCorrect) a.ok += 1;
    perGroup.set(gid, a);
  }

  const groupIds = [...perGroup.keys()];
  const groups = groupIds.length
    ? db.select().from(cardGroup).where(inArray(cardGroup.id, groupIds)).all()
    : [];

  const byGroup: GroupAccuracy[] = groupIds.map((gid) => {
    const a = perGroup.get(gid)!;
    return {
      groupId: gid,
      name: groups.find((g) => g.id === gid)?.name ?? '',
      accuracy: a.ok / a.n,
      attempts: a.n,
    };
  }).sort((x, y) => x.accuracy - y.accuracy);

  // Historial: solo rondas cerradas.
  const from = since(range);
  const all = db.select().from(session).orderBy(desc(session.startedAt)).all();
  const closed = all
    .filter((s) => s.finishedAt !== null && (!from || s.startedAt >= from))
    .slice(0, 20);

  const links = closed.length
    ? db.select().from(sessionGroup).where(inArray(sessionGroup.sessionId, closed.map((s) => s.id))).all()
    : [];
  const allGroups = db.select().from(cardGroup).all();

  const history = closed.map((s) => {
    const n = s.correct + s.incorrect;
    const gids = links.filter((l) => l.sessionId === s.id).map((l) => l.groupId);
    const names = gids.map((g) => allGroups.find((x) => x.id === g)?.name).filter(Boolean);
    return {
      id: s.id, startedAt: s.startedAt, total: s.total,
      correct: s.correct, incorrect: s.incorrect,
      accuracy: n === 0 ? 0 : s.correct / n,
      label: s.mode === 'review'
        ? `Repaso · ${s.total} cartas`
        : `${gids.length} grupos · ${s.total} cartas${names[0] ? ` (${names[0]}…)` : ''}`,
    };
  });

  return {
    attempts: rows.length,
    correct,
    incorrect: rows.length - correct,
    accuracy: rows.length === 0 ? 0 : correct / rows.length,
    rounds: closed.length,
    mastered,
    totalCards,
    byGroup,
    history,
  };
}

/**
 * Arma una ronda con las peores cartas. Es el repaso dirigido: siempre mira
 * los últimos 30 días (no el `range` que esté mirando la pantalla), porque
 * repasar "todo lo que alguna vez erraste en meses" no es un repaso útil.
 * Devuelve `mode: 'review'`: la Task 15 (sección B) exige que una ronda de
 * repaso no encadene otra ronda normal de esos mismos grupos al terminar.
 */
export function openReviewRound(db: Db, limit: number): RoundPayload {
  const worst = worstCards(db, '30d', limit);
  if (worst.length === 0) throw badRequest('Todavía no hay errores suficientes para repasar');

  const ids = new Set(worst.map((w) => w.cardId));
  const cards = db.select().from(card).where(inArray(card.id, [...ids])).all();
  const groupIds = [...new Set(cards.map((c) => c.groupId))];

  // Se reusa cardsForGroups y después se filtra a las cartas del ranking.
  const pool = cardsForGroups(db, groupIds).filter((c) => ids.has(c.id));

  let sessionId = 0;
  db.transaction((tx) => {
    const t = tx as Db;
    const [s] = t.insert(session).values({ mode: 'review', total: pool.length }).returning().all();
    sessionId = s.id;
    for (const gid of groupIds) {
      t.insert(sessionGroup).values({ sessionId: s.id, groupId: gid }).run();
    }
  });

  return { sessionId, groupIds, cards: shuffle(pool), mode: 'review' };
}
