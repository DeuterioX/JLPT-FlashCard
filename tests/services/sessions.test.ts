import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { createDb, migrate, type Db } from '../../lib/db/client';
import { seedKana } from '../../lib/db/seed';
import { listDecks } from '../../lib/services/decks';
import { openRound, recordAttempt, closeRound } from '../../lib/services/sessions';
import { session, sessionGroup, attempt } from '../../lib/db/schema';
import { AppError } from '../../lib/services/errors';

let db: Db;
let kaGroupId: number;
let saGroupId: number;

beforeEach(() => {
  db = createDb(':memory:');
  migrate(db);
  seedKana(db);
  const hira = listDecks(db).find((d) => d.name === 'Hiragana')!;
  kaGroupId = hira.groups.find((g) => g.name === 'か行')!.id;
  saGroupId = hira.groups.find((g) => g.name === 'さ行')!.id;
});

describe('openRound', () => {
  it('devuelve las cartas de los grupos elegidos', () => {
    const r = openRound(db, [kaGroupId]);
    expect(r.cards).toHaveLength(5);
    expect(r.cards.map((c) => c.prompt).sort()).toEqual(['か', 'き', 'く', 'け', 'こ']);
  });

  it('junta varios grupos', () => {
    expect(openRound(db, [kaGroupId, saGroupId]).cards).toHaveLength(10);
  });

  it('trae todas las romanizaciones y marca la primaria', () => {
    const shi = openRound(db, [saGroupId]).cards.find((c) => c.prompt === 'し')!;
    expect(shi.answers.sort()).toEqual(['shi', 'si']);
    expect(shi.primary).toBe('shi');
  });

  it('registra qué grupos entraron en la ronda', () => {
    const r = openRound(db, [kaGroupId, saGroupId]);
    const rows = db.select().from(sessionGroup)
      .where(eq(sessionGroup.sessionId, r.sessionId)).all();
    expect(rows.map((x) => x.groupId).sort()).toEqual([kaGroupId, saGroupId].sort());
  });

  it('guarda el total y deja la ronda abierta', () => {
    const r = openRound(db, [kaGroupId]);
    const s = db.select().from(session).where(eq(session.id, r.sessionId)).all()[0];
    expect(s.total).toBe(5);
    expect(s.finishedAt).toBeNull();
    expect(s.mode).toBe('normal');
  });

  it('rechaza una ronda sin grupos', () => {
    expect(() => openRound(db, [])).toThrow(AppError);
  });

  it('rechaza grupos que no existen', () => {
    expect(() => openRound(db, [999999])).toThrow(AppError);
  });
});

describe('recordAttempt y closeRound', () => {
  it('guarda un intento por cada Enter', () => {
    const r = openRound(db, [kaGroupId]);
    const card = r.cards[0];
    recordAttempt(db, { sessionId: r.sessionId, cardId: card.id, typed: 'zz', isCorrect: false, revealed: false, ms: 900 });
    recordAttempt(db, { sessionId: r.sessionId, cardId: card.id, typed: card.primary, isCorrect: true, revealed: false, ms: 400 });

    const rows = db.select().from(attempt).where(eq(attempt.sessionId, r.sessionId)).all();
    expect(rows).toHaveLength(2);
    expect(rows[0].isCorrect).toBe(false);
    expect(rows[1].isCorrect).toBe(true);
  });

  it('distingue un revelado de un error tipeado', () => {
    const r = openRound(db, [kaGroupId]);
    recordAttempt(db, { sessionId: r.sessionId, cardId: r.cards[0].id, typed: '', isCorrect: false, revealed: true, ms: 0 });
    const row = db.select().from(attempt).where(eq(attempt.sessionId, r.sessionId)).all()[0];
    expect(row.revealed).toBe(true);
    expect(row.isCorrect).toBe(false);
  });

  it('closeRound consolida los totales desde los intentos', () => {
    const r = openRound(db, [kaGroupId]);
    recordAttempt(db, { sessionId: r.sessionId, cardId: r.cards[0].id, typed: 'zz', isCorrect: false, revealed: false, ms: 1 });
    recordAttempt(db, { sessionId: r.sessionId, cardId: r.cards[0].id, typed: 'x', isCorrect: true, revealed: false, ms: 1 });
    recordAttempt(db, { sessionId: r.sessionId, cardId: r.cards[1].id, typed: 'y', isCorrect: true, revealed: false, ms: 1 });

    closeRound(db, r.sessionId);

    const s = db.select().from(session).where(eq(session.id, r.sessionId)).all()[0];
    expect(s.correct).toBe(2);
    expect(s.incorrect).toBe(1);
    expect(s.finishedAt).not.toBeNull();
  });
});
