import { describe, it, expect, beforeEach } from 'vitest';
import { createDb, migrate, type Db } from '../../lib/db/client';
import { seedKana } from '../../lib/db/seed';
import { listDecks } from '../../lib/services/decks';
import { openRound, recordAttempt, closeRound } from '../../lib/services/sessions';
import { worstCards, overview, openReviewRound } from '../../lib/services/stats';

let db: Db;
let kaGroupId: number;

beforeEach(() => {
  db = createDb(':memory:');
  migrate(db);
  seedKana(db);
  const hira = listDecks(db).find((d) => d.name === 'Hiragana')!;
  kaGroupId = hira.groups.find((g) => g.name === 'か行')!.id;
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

  it('calcula accuracy por grupo', () => {
    const r = openRound(db, [kaGroupId]);
    drill(r.sessionId, r.cards[0].id, 10, 2);
    closeRound(db, r.sessionId);

    const g = overview(db, 'all').byGroup.find((x) => x.groupId === kaGroupId)!;
    expect(g.name).toBe('か行');
    expect(g.accuracy).toBeCloseTo(0.8);
  });

  it('devuelve ceros sin datos, no NaN', () => {
    const o = overview(db, 'all');
    expect(o.attempts).toBe(0);
    expect(o.accuracy).toBe(0);
    expect(o.byGroup).toEqual([]);
    expect(o.history).toEqual([]);
  });
});

describe('openReviewRound', () => {
  it('arma una ronda con las peores cartas y la marca como repaso', () => {
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
  });

  it('falla si todavía no hay errores que repasar', () => {
    expect(() => openReviewRound(db, 20)).toThrow();
  });
});
