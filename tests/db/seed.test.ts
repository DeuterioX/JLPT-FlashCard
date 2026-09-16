import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { createDb, migrate, type Db } from '../../lib/db/client';
import { seedKana } from '../../lib/db/seed';
import { deck, cardGroup, card, cardAnswer } from '../../lib/db/schema';

let db: Db;
beforeEach(() => {
  db = createDb(':memory:');
  migrate(db);
});

const deckByName = (name: string) => db.select().from(deck).where(eq(deck.name, name)).all()[0];
const groupsOf = (deckId: number) =>
  db.select().from(cardGroup).where(eq(cardGroup.deckId, deckId)).all();

describe('seedKana', () => {
  it('crea los dos mazos marcados como incluidos en la app', () => {
    seedKana(db);
    expect(deckByName('Hiragana').isBuiltin).toBe(true);
    expect(deckByName('Katakana').isBuiltin).toBe(true);
  });

  it('carga hiragana con 26 grupos y 104 cartas', () => {
    seedKana(db);
    const d = deckByName('Hiragana');
    const groups = groupsOf(d.id);
    expect(groups).toHaveLength(26);

    const ids = new Set(groups.map((g) => g.id));
    const cards = db.select().from(card).all().filter((c) => ids.has(c.groupId));
    expect(cards).toHaveLength(104);
  });

  it('carga katakana con 33 grupos y 131 cartas', () => {
    seedKana(db);
    const d = deckByName('Katakana');
    const groups = groupsOf(d.id);
    expect(groups).toHaveLength(33);

    const ids = new Set(groups.map((g) => g.id));
    const cards = db.select().from(card).all().filter((c) => ids.has(c.groupId));
    expect(cards).toHaveLength(131);
  });

  it('guarda la sección de cada grupo para los encabezados de la grilla', () => {
    seedKana(db);
    const groups = groupsOf(deckByName('Hiragana').id);
    expect(groups.find((g) => g.name === 'か行')!.section).toBe('Básicos');
    expect(groups.find((g) => g.name === 'が行')!.section).toBe('Dakuten');
    expect(groups.find((g) => g.name === 'きゃ行')!.section).toBe('Contracciones');
  });

  it('guarda las alternativas con una sola primaria por carta', () => {
    seedKana(db);
    const shi = db.select().from(card).where(eq(card.prompt, 'し')).all()[0];
    const answers = db.select().from(cardAnswer).where(eq(cardAnswer.cardId, shi.id)).all();

    expect(answers.map((a) => a.romaji).sort()).toEqual(['shi', 'si']);
    expect(answers.filter((a) => a.isPrimary)).toHaveLength(1);
    expect(answers.find((a) => a.isPrimary)!.romaji).toBe('shi');
  });

  it('respeta el orden de las cartas dentro del grupo', () => {
    seedKana(db);
    const ka = groupsOf(deckByName('Hiragana').id).find((g) => g.name === 'か行')!;
    const cards = db.select().from(card).where(eq(card.groupId, ka.id)).all()
      .sort((a, b) => a.sortOrder - b.sortOrder);
    expect(cards.map((c) => c.prompt)).toEqual(['か', 'き', 'く', 'け', 'こ']);
  });

  it('es idempotente: correrlo dos veces no duplica nada', () => {
    seedKana(db);
    seedKana(db);
    expect(db.select().from(deck).all()).toHaveLength(2);
    expect(db.select().from(cardGroup).all()).toHaveLength(26 + 33);
    expect(db.select().from(card).all()).toHaveLength(104 + 131);
  });
});
