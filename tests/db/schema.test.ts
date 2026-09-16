import { describe, it, expect, beforeEach } from 'vitest';
import { createDb, migrate } from '../../lib/db/client';
import { deck, cardGroup, card, cardAnswer } from '../../lib/db/schema';
import { eq } from 'drizzle-orm';

let db: ReturnType<typeof createDb>;

beforeEach(() => {
  db = createDb(':memory:');
  migrate(db);
});

describe('esquema', () => {
  it('crea un mazo con grupo, carta y respuesta', () => {
    const [d] = db.insert(deck).values({ name: 'Hiragana', isBuiltin: true }).returning().all();
    const [g] = db.insert(cardGroup).values({ deckId: d.id, name: 'か行', section: 'Básicos' }).returning().all();
    const [c] = db.insert(card).values({ groupId: g.id, prompt: 'か' }).returning().all();
    db.insert(cardAnswer).values({ cardId: c.id, romaji: 'ka', isPrimary: true }).run();

    const rows = db.select().from(cardAnswer).where(eq(cardAnswer.cardId, c.id)).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].romaji).toBe('ka');
  });

  it('acepta varias respuestas pero una sola primaria por carta', () => {
    const [d] = db.insert(deck).values({ name: 'Hiragana' }).returning().all();
    const [g] = db.insert(cardGroup).values({ deckId: d.id, name: 'さ行' }).returning().all();
    const [c] = db.insert(card).values({ groupId: g.id, prompt: 'し' }).returning().all();

    db.insert(cardAnswer).values({ cardId: c.id, romaji: 'shi', isPrimary: true }).run();
    db.insert(cardAnswer).values({ cardId: c.id, romaji: 'si', isPrimary: false }).run();

    expect(db.select().from(cardAnswer).where(eq(cardAnswer.cardId, c.id)).all()).toHaveLength(2);

    // El índice único parcial tiene que rechazar una segunda primaria.
    expect(() =>
      db.insert(cardAnswer).values({ cardId: c.id, romaji: 'xx', isPrimary: true }).run(),
    ).toThrow();
  });

  it('borra en cascada: borrar el mazo se lleva grupos, cartas y respuestas', () => {
    const [d] = db.insert(deck).values({ name: 'Comidas' }).returning().all();
    const [g] = db.insert(cardGroup).values({ deckId: d.id, name: 'Pescado' }).returning().all();
    const [c] = db.insert(card).values({ groupId: g.id, prompt: 'さかな', meaning: 'pescado' }).returning().all();
    db.insert(cardAnswer).values({ cardId: c.id, romaji: 'sakana', isPrimary: true }).run();

    db.delete(deck).where(eq(deck.id, d.id)).run();

    // Si esto falla con filas sobrantes, falta PRAGMA foreign_keys = ON.
    expect(db.select().from(cardGroup).all()).toHaveLength(0);
    expect(db.select().from(card).all()).toHaveLength(0);
    expect(db.select().from(cardAnswer).all()).toHaveLength(0);
  });
});
