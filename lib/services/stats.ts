import { gte, desc, inArray } from 'drizzle-orm';
import type { Db } from '../db/client';
import { attempt, card, cardAnswer, cardGroup, deck, session, sessionGroup } from '../db/schema';
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

type Attempts = ReturnType<typeof attemptsIn>;

export type WorstCard = {
  cardId: number; prompt: string; primary: string;
  seen: number; errors: number; rate: number;
};

export function worstCards(db: Db, range: StatsRange, limit = 20, attempts?: Attempts): WorstCard[] {
  const rows = attempts ?? attemptsIn(db, range);
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
             incorrect: number; accuracy: number; label: string;
             // Duración de la ronda. Sale de `finishedAt - startedAt`, que ya
             // se consultaba acá para filtrar las rondas cerradas; faltaba
             // exponerlo. `null` solo si las fechas no parsean.
             durationMs: number | null }[];
};

export function overview(db: Db, range: StatsRange, attempts?: Attempts): Overview {
  const rows = attempts ?? attemptsIn(db, range);
  const correct = rows.filter((r) => r.isCorrect).length;

  // Una sola consulta a `card`, reusada para el total y para el mapa
  // carta → grupo de más abajo (antes eran dos consultas idénticas).
  const allCards = db.select().from(card).all();
  const totalCards = allCards.length;

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
  const groupOf = new Map(allCards.map((c) => [c.id, c.groupId]));
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
  // Una sola consulta a `cardGroup` (todos los grupos), reusada para los
  // nombres de `byGroup` y para los del historial más abajo (antes eran dos
  // consultas: una filtrada por `groupIds` y otra de todos los grupos).
  const allGroups = db.select().from(cardGroup).all();

  const byGroup: GroupAccuracy[] = groupIds.map((gid) => {
    const a = perGroup.get(gid)!;
    return {
      groupId: gid,
      name: allGroups.find((g) => g.id === gid)?.name ?? '',
      accuracy: a.ok / a.n,
      attempts: a.n,
    };
  }).sort((x, y) => x.accuracy - y.accuracy);

  // Historial: solo rondas cerradas. `rounds` cuenta TODAS las cerradas del
  // rango -no las 20 que se recortan para no mandar una lista infinita al
  // cliente-: contar sobre `closed` después del `.slice` pegaba el tile de
  // "Rondas" a un tope de 20 apenas alguien jugaba más que eso.
  const from = since(range);
  const all = db.select().from(session).orderBy(desc(session.startedAt)).all();
  const closedAll = all.filter((s) => s.finishedAt !== null && (!from || s.startedAt >= from));
  const closed = closedAll.slice(0, 20);

  const links = closed.length
    ? db.select().from(sessionGroup).where(inArray(sessionGroup.sessionId, closed.map((s) => s.id))).all()
    : [];

  // El mazo encabeza la etiqueta del historial ("Hiragana · 6 grupos · 28
  // cartas", como en el diseño), así que hace falta resolver grupo → mazo.
  const allDecks = db.select().from(deck).all();
  const deckNameOfGroup = (groupId: number) => {
    const g = allGroups.find((x) => x.id === groupId);
    return g ? allDecks.find((d) => d.id === g.deckId)?.name : undefined;
  };

  const history = closed.map((s) => {
    const n = s.correct + s.incorrect;
    const gids = links.filter((l) => l.sessionId === s.id).map((l) => l.groupId);
    const deckName = gids.length > 0 ? deckNameOfGroup(gids[0]) : undefined;
    const started = Date.parse(s.startedAt);
    const finished = s.finishedAt === null ? NaN : Date.parse(s.finishedAt);
    return {
      id: s.id, startedAt: s.startedAt, total: s.total,
      correct: s.correct, incorrect: s.incorrect,
      accuracy: n === 0 ? 0 : s.correct / n,
      durationMs: Number.isNaN(started) || Number.isNaN(finished) ? null : finished - started,
      label: s.mode === 'review'
        ? `Repaso · ${s.total} cartas`
        : [
          deckName,
          `${gids.length} ${gids.length === 1 ? 'grupo' : 'grupos'}`,
          `${s.total} cartas`,
        ].filter(Boolean).join(' · '),
    };
  });

  return {
    attempts: rows.length,
    correct,
    incorrect: rows.length - correct,
    accuracy: rows.length === 0 ? 0 : correct / rows.length,
    rounds: closedAll.length,
    mastered,
    totalCards,
    byGroup,
    history,
  };
}

/**
 * Arma una ronda con las peores cartas. Es el repaso dirigido: por defecto
 * mira los últimos 30 días, pero recibe el `range` que esté mirando la
 * pantalla de estadísticas -si no, "Practicar mis N peores" puede prometer
 * N cartas calculadas sobre "Siempre" y armar la ronda sobre otras 30 días,
 * o quedar habilitado en "Siempre" y tirar un 400 porque en 30 días no hay
 * nada que repasar-. Devuelve `mode: 'review'`: la Task 15 (sección B)
 * exige que una ronda de repaso no encadene otra ronda normal de esos
 * mismos grupos al terminar.
 */
export function openReviewRound(db: Db, limit: number, range: StatsRange = '30d'): RoundPayload {
  const worst = worstCards(db, range, limit);
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

/**
 * Las dos mitades de la pantalla de Estadísticas, leyendo `attempt` UNA vez.
 *
 * `overview` y `worstCards` recorren la misma tabla y se llaman siempre
 * juntas desde la pantalla, así que cada carga la leía dos veces enteras. Las
 * dos siguen sirviendo sueltas -las usan sus rutas de API por separado-, pero
 * cuando se piden juntas se les pasa la lectura ya hecha.
 */
export function statsFor(db: Db, range: StatsRange, limit = 20) {
  const attempts = attemptsIn(db, range);
  return {
    overview: overview(db, range, attempts),
    worst: worstCards(db, range, limit, attempts),
  };
}
