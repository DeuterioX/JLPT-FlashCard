import { eq } from 'drizzle-orm';
import type { Db } from './client';
import { deck, cardGroup, card, cardAnswer } from './schema';
import { HIRAGANA, KATAKANA, type KanaGroup } from '../kana/tables';
import { normalizeAnswer } from '../kana/normalize';

function seedDeck(db: Db, name: string, sortOrder: number, groups: KanaGroup[]) {
  // Idempotencia por nombre: si ya está, no se toca.
  const existing = db.select().from(deck).where(eq(deck.name, name)).all();
  if (existing.length > 0) return;

  const [d] = db
    .insert(deck)
    .values({ name, isBuiltin: true, sortOrder })
    .returning()
    .all();

  groups.forEach((g, gi) => {
    const [row] = db
      .insert(cardGroup)
      .values({ deckId: d.id, name: g.name, section: g.section, sortOrder: gi })
      .returning()
      .all();

    g.cards.forEach((c, ci) => {
      const [cardRow] = db
        .insert(card)
        .values({ groupId: row.id, prompt: c.prompt, meaning: null, sortOrder: ci })
        .returning()
        .all();

      // La primera romanización de la tabla es siempre la primaria (Hepburn).
      c.romaji.forEach((r, ri) => {
        db.insert(cardAnswer)
          .values({ cardId: cardRow.id, romaji: normalizeAnswer(r), isPrimary: ri === 0 })
          .run();
      });
    });
  });
}

/** Carga los mazos incluidos en la app. Seguro de correr varias veces. */
export function seedKana(db: Db): void {
  db.transaction((tx) => {
    seedDeck(tx as Db, 'Hiragana', 0, HIRAGANA);
    seedDeck(tx as Db, 'Katakana', 1, KATAKANA);
  });
}
