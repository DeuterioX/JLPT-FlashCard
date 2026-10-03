import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { createDb, migrate, type Db } from '../../lib/db/client';
import { seedKana } from '../../lib/db/seed';
import { listDecks } from '../../lib/services/decks';
import { openRound, recordAttempt, closeRound } from '../../lib/services/sessions';
import { worstCards, overview, openReviewRound } from '../../lib/services/stats';
import { attempt, session } from '../../lib/db/schema';
import { AppError } from '../../lib/services/errors';

let db: Db;
let kaGroupId: number;

beforeEach(() => {
  db = createDb(':memory:');
  migrate(db);
  seedKana(db);
  const hira = listDecks(db).find((d) => d.name === 'Hiragana')!;
  kaGroupId = hira.groups.find((g) => g.name === 'Serie K')!.id;
});

/** Registra `n` intentos de una carta, `errs` de ellos fallados. */
function drill(sessionId: number, cardId: number, n: number, errs: number) {
  for (let i = 0; i < n; i++) {
    recordAttempt(db, {
      sessionId, cardId, typed: i < errs ? 'zz' : 'ok',
      isCorrect: i >= errs, revealed: false, ms: 100,
    });
  }
}

/** Inserta un intento con una fecha explícita, para probar las ventanas 7d/30d. */
function drillAt(sessionId: number, cardId: number, n: number, errs: number, createdAt: string) {
  for (let i = 0; i < n; i++) {
    db.insert(attempt).values({
      sessionId, cardId, typed: i < errs ? 'zz' : 'ok',
      isCorrect: i >= errs, revealed: false, ms: 100, createdAt,
    }).run();
  }
}

describe('worstCards', () => {
  it('ordena por tasa de error, no por errores absolutos', () => {
    const r = openRound(db, [kaGroupId]);
    const [a, b] = r.cards;
    drill(r.sessionId, a.id, 40, 8);  // 20% de error, 8 errores
    drill(r.sessionId, b.id, 10, 5);  // 50% de error, 5 errores
    closeRound(db, r.sessionId);

    const worst = worstCards(db, 'all');
    // b tiene menos errores absolutos pero peor tasa: va primero.
    expect(worst[0].cardId).toBe(b.id);
    expect(worst[0].rate).toBeCloseTo(0.5);
  });

  it('excluye las cartas con menos de 5 apariciones', () => {
    const r = openRound(db, [kaGroupId]);
    drill(r.sessionId, r.cards[0].id, 4, 4);  // 100% de error pero solo 4 veces
    drill(r.sessionId, r.cards[1].id, 10, 3);
    closeRound(db, r.sessionId);

    const worst = worstCards(db, 'all');
    // Una carta nueva no puede encabezar el ranking por accidente.
    expect(worst.map((w) => w.cardId)).not.toContain(r.cards[0].id);
    expect(worst.map((w) => w.cardId)).toContain(r.cards[1].id);
  });

  it('trae el prompt y la romanización primaria', () => {
    const r = openRound(db, [kaGroupId]);
    drill(r.sessionId, r.cards[0].id, 10, 5);
    closeRound(db, r.sessionId);

    const w = worstCards(db, 'all')[0];
    expect(w.prompt).toBe(r.cards[0].prompt);
    expect(w.primary).toBe(r.cards[0].primary);
    expect(w.seen).toBe(10);
    expect(w.errors).toBe(5);
  });

  it('respeta el límite', () => {
    const r = openRound(db, [kaGroupId]);
    for (const c of r.cards) drill(r.sessionId, c.id, 10, 5);
    closeRound(db, r.sessionId);
    expect(worstCards(db, 'all', 2)).toHaveLength(2);
  });

  it('una carta con exactamente 5 apariciones (el mínimo) SÍ entra al ranking', () => {
    const r = openRound(db, [kaGroupId]);
    drill(r.sessionId, r.cards[0].id, 5, 1);
    closeRound(db, r.sessionId);

    expect(worstCards(db, 'all').map((w) => w.cardId)).toContain(r.cards[0].id);
  });

  it('una carta vista 5+ veces pero sin ningún error NO entra al ranking', () => {
    const r = openRound(db, [kaGroupId]);
    drill(r.sessionId, r.cards[0].id, 5, 0);
    closeRound(db, r.sessionId);

    expect(worstCards(db, 'all')).toHaveLength(0);
  });

  it('un intento viejo queda afuera de la ventana 7d pero adentro de "all"', () => {
    const r = openRound(db, [kaGroupId]);
    const hace40dias = new Date(Date.now() - 40 * 86_400_000).toISOString();
    drillAt(r.sessionId, r.cards[0].id, 6, 6, hace40dias);
    closeRound(db, r.sessionId);

    expect(worstCards(db, '7d')).toHaveLength(0);
    expect(worstCards(db, 'all')).toHaveLength(1);
  });
});

describe('overview', () => {
  it('cuenta intentos, aciertos y accuracy global', () => {
    const r = openRound(db, [kaGroupId]);
    drill(r.sessionId, r.cards[0].id, 10, 2);
    closeRound(db, r.sessionId);

    const o = overview(db, 'all');
    expect(o.attempts).toBe(10);
    expect(o.correct).toBe(8);
    expect(o.incorrect).toBe(2);
    expect(o.accuracy).toBeCloseTo(0.8);
    expect(o.rounds).toBe(1);
  });

  it('cuenta como dominada una carta con 5+ intentos y 90%+ de aciertos', () => {
    const r = openRound(db, [kaGroupId]);
    drill(r.sessionId, r.cards[0].id, 10, 1);  // 90% → dominada
    drill(r.sessionId, r.cards[1].id, 10, 5);  // 50% → no
    drill(r.sessionId, r.cards[2].id, 3, 0);   // 100% pero pocas veces → no
    closeRound(db, r.sessionId);

    expect(overview(db, 'all').mastered).toBe(1);
  });

  it('una carta con exactamente 5 intentos (el mínimo) y 100% de aciertos SÍ es dominada', () => {
    const r = openRound(db, [kaGroupId]);
    drill(r.sessionId, r.cards[0].id, 5, 0);
    closeRound(db, r.sessionId);

    expect(overview(db, 'all').mastered).toBe(1);
  });

  it('calcula accuracy por grupo', () => {
    const r = openRound(db, [kaGroupId]);
    drill(r.sessionId, r.cards[0].id, 10, 2);
    closeRound(db, r.sessionId);

    const g = overview(db, 'all').byGroup.find((x) => x.groupId === kaGroupId)!;
    expect(g.name).toBe('Serie K');
    expect(g.accuracy).toBeCloseTo(0.8);
  });

  it('devuelve ceros sin datos, no NaN', () => {
    const o = overview(db, 'all');
    expect(o.attempts).toBe(0);
    expect(o.accuracy).toBe(0);
    expect(o.byGroup).toEqual([]);
    expect(o.history).toEqual([]);
  });

  it('un intento viejo queda afuera de la ventana 7d pero adentro de "all"', () => {
    const r = openRound(db, [kaGroupId]);
    const hace40dias = new Date(Date.now() - 40 * 86_400_000).toISOString();
    drillAt(r.sessionId, r.cards[0].id, 1, 1, hace40dias);
    closeRound(db, r.sessionId);

    expect(overview(db, '7d').attempts).toBe(0);
    expect(overview(db, 'all').attempts).toBe(1);
  });

  it('rotula el historial con el mazo adelante y el singular/plural de grupos', () => {
    const hira = listDecks(db).find((d) => d.name === 'Hiragana')!;
    const saGroupId = hira.groups.find((g) => g.name === 'Serie S')!.id;
    const one = openRound(db, [kaGroupId]);
    closeRound(db, one.sessionId);
    const two = openRound(db, [kaGroupId, saGroupId]);
    closeRound(db, two.sessionId);

    const labels = new Map(overview(db, 'all').history.map((h) => [h.id, h.label]));
    // El mazo encabeza la label, como en el diseño ("Hiragana · 6 grupos
    // · 28 cartas"); antes empezaba directamente por la cuenta de grupos.
    expect(labels.get(one.sessionId)).toBe('Hiragana · 1 grupo · 5 cartas');
    expect(labels.get(two.sessionId)).toBe('Hiragana · 2 grupos · 10 cartas');
  });

  it('expone la duración de cada ronda del historial', () => {
    const r = openRound(db, [kaGroupId]);
    closeRound(db, r.sessionId);

    const h = overview(db, 'all').history.find((x) => x.id === r.sessionId)!;
    // El dato sale de `finishedAt - startedAt`; sin abrir y cerrar con
    // fechas fijas no se puede afirmar un valor exacto, pero sí que existe
    // y que no es negativo -que es lo que la UI necesita para formatearlo-.
    expect(h.durationMs).not.toBeNull();
    expect(h.durationMs!).toBeGreaterThanOrEqual(0);
  });

  it('cuenta TODAS las rondas cerradas aunque el historial se recorte a 20', () => {
    // El fix Important: `rounds` no puede quedar pegado al tope de 20 del
    // historial, que solo existe para no mandar una lista infinita a la UI.
    for (let i = 0; i < 21; i++) {
      const r = openRound(db, [kaGroupId]);
      closeRound(db, r.sessionId);
    }

    const o = overview(db, 'all');
    expect(o.rounds).toBe(21);
    expect(o.history).toHaveLength(20);
  });
});

describe('openReviewRound', () => {
  it('arma una ronda con las peores cartas, la marca como repaso y así queda guardada', () => {
    const r = openRound(db, [kaGroupId]);
    drill(r.sessionId, r.cards[0].id, 10, 6);
    drill(r.sessionId, r.cards[1].id, 10, 5);
    closeRound(db, r.sessionId);

    const review = openReviewRound(db, 2);
    expect(review.cards).toHaveLength(2);
    expect(review.cards.map((c) => c.id).sort())
      .toEqual([r.cards[0].id, r.cards[1].id].sort());
    // Es un repaso, no una ronda normal: la ronda no debería encadenar otra
    // ronda con groupIds al terminar (Task 15, sección B).
    expect(review.mode).toBe('review');

    const row = db.select().from(session).where(eq(session.id, review.sessionId)).all()[0];
    expect(row.mode).toBe('review');
  });

  it('falla con un AppError 400 si todavía no hay errores que repasar', () => {
    expect.assertions(2);
    try {
      openReviewRound(db, 20);
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).status).toBe(400);
    }
  });

  it('con range "all" incluye cartas cuyos intentos son de hace más de 30 días', () => {
    const r = openRound(db, [kaGroupId]);
    const hace40dias = new Date(Date.now() - 40 * 86_400_000).toISOString();
    drillAt(r.sessionId, r.cards[0].id, 6, 6, hace40dias);
    closeRound(db, r.sessionId);

    // Con la ventana por defecto (30d) esa carta ya no cuenta: no hay nada
    // que repasar.
    expect(() => openReviewRound(db, 20)).toThrow(AppError);

    // Pero si se pide el repaso sobre "todo", sí entra.
    const review = openReviewRound(db, 20, 'all');
    expect(review.cards.map((c) => c.id)).toContain(r.cards[0].id);
  });
});
