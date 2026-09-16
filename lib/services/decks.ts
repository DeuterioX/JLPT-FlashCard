import { eq, inArray, asc } from 'drizzle-orm';
import type { Db } from '../db/client';
import { deck, cardGroup, card, cardAnswer } from '../db/schema';
import { normalizeAnswer } from '../kana/normalize';
import { notFound, forbidden, badRequest } from './errors';

/** Un grupo con 6 cartas o menos se previsualiza; con más, se muestra el conteo. */
const PREVIEW_LIMIT = 6;

export type GroupSummary = {
  id: number; name: string; section: string | null;
  sortOrder: number; cardCount: number; preview: string[];
};

export type DeckSummary = {
  id: number; name: string; isBuiltin: boolean;
  groupCount: number; cardCount: number; groups: GroupSummary[];
};

function buildSummaries(db: Db, deckRows: (typeof deck.$inferSelect)[]): DeckSummary[] {
  if (deckRows.length === 0) return [];
  const deckIds = deckRows.map((d) => d.id);

  const groups = db.select().from(cardGroup)
    .where(inArray(cardGroup.deckId, deckIds))
    .orderBy(asc(cardGroup.sortOrder)).all();

  const groupIds = groups.map((g) => g.id);
  const cards = groupIds.length
    ? db.select().from(card).where(inArray(card.groupId, groupIds))
        .orderBy(asc(card.sortOrder)).all()
    : [];

  const byGroup = new Map<number, typeof cards>();
  for (const c of cards) {
    const list = byGroup.get(c.groupId) ?? [];
    list.push(c);
    byGroup.set(c.groupId, list);
  }

  return deckRows.map((d) => {
    const own = groups.filter((g) => g.deckId === d.id).map<GroupSummary>((g) => {
      const list = byGroup.get(g.id) ?? [];
      return {
        id: g.id, name: g.name, section: g.section, sortOrder: g.sortOrder,
        cardCount: list.length,
        preview: list.length <= PREVIEW_LIMIT ? list.map((c) => c.prompt) : [],
      };
    });
    return {
      id: d.id, name: d.name, isBuiltin: d.isBuiltin,
      groupCount: own.length,
      cardCount: own.reduce((n, g) => n + g.cardCount, 0),
      groups: own,
    };
  });
}

export function listDecks(db: Db): DeckSummary[] {
  return buildSummaries(db, db.select().from(deck).orderBy(asc(deck.sortOrder)).all());
}

export function getDeck(db: Db, id: number): DeckSummary {
  const rows = db.select().from(deck).where(eq(deck.id, id)).all();
  if (rows.length === 0) throw notFound('El mazo');
  return buildSummaries(db, rows)[0];
}

export function createDeck(db: Db, input: { name: string; groups?: string[] }): DeckSummary {
  const name = input.name.trim();
  if (!name) throw badRequest('El mazo necesita un nombre');

  // Una carta siempre cuelga de un grupo. Si no se pasa ninguno, se crea uno
  // solo llamado General y la UI esconde el nivel de grupos.
  const names = (input.groups ?? []).map((g) => g.trim()).filter(Boolean);
  const groupNames = names.length > 0 ? names : ['General'];

  let newId = 0;
  db.transaction((tx) => {
    const t = tx as Db;
    const max = t.select().from(deck).all().reduce((n, d) => Math.max(n, d.sortOrder), -1);
    const [d] = t.insert(deck).values({ name, isBuiltin: false, sortOrder: max + 1 })
      .returning().all();
    newId = d.id;
    groupNames.forEach((n, i) => {
      // section queda null: los mazos propios no tienen encabezados de grilla.
      t.insert(cardGroup).values({ deckId: d.id, name: n, section: null, sortOrder: i }).run();
    });
  });

  return getDeck(db, newId);
}

export function renameDeck(db: Db, id: number, name: string): void {
  const trimmed = name.trim();
  if (!trimmed) throw badRequest('El mazo necesita un nombre');
  const res = db.update(deck).set({ name: trimmed }).where(eq(deck.id, id)).run();
  if (res.changes === 0) throw notFound('El mazo');
}

export function deleteDeck(db: Db, id: number): void {
  const rows = db.select().from(deck).where(eq(deck.id, id)).all();
  if (rows.length === 0) throw notFound('El mazo');
  if (rows[0].isBuiltin) {
    throw forbidden('Hiragana y Katakana vienen con la app y no se pueden borrar');
  }
  // El resto cae por ON DELETE CASCADE (requiere PRAGMA foreign_keys = ON).
  db.delete(deck).where(eq(deck.id, id)).run();
}

export function createGroup(db: Db, deckId: number, name: string): GroupSummary {
  const trimmed = name.trim();
  if (!trimmed) throw badRequest('El grupo necesita un nombre');
  const parent = getDeck(db, deckId);
  const max = parent.groups.reduce((n, g) => Math.max(n, g.sortOrder), -1);

  const [row] = db.insert(cardGroup)
    .values({ deckId, name: trimmed, section: null, sortOrder: max + 1 })
    .returning().all();

  return { id: row.id, name: row.name, section: row.section, sortOrder: row.sortOrder,
           cardCount: 0, preview: [] };
}

export function renameGroup(db: Db, id: number, name: string): void {
  const trimmed = name.trim();
  if (!trimmed) throw badRequest('El grupo necesita un nombre');
  const res = db.update(cardGroup).set({ name: trimmed }).where(eq(cardGroup.id, id)).run();
  if (res.changes === 0) throw notFound('El grupo');
}

export function deleteGroup(db: Db, id: number): void {
  const res = db.delete(cardGroup).where(eq(cardGroup.id, id)).run();
  if (res.changes === 0) throw notFound('El grupo');
}

function writeAnswers(db: Db, cardId: number, answers: string[]) {
  const clean = answers.map(normalizeAnswer).filter(Boolean);
  if (clean.length === 0) throw badRequest('La carta necesita al menos una romanización');
  const unique = [...new Set(clean)];

  db.delete(cardAnswer).where(eq(cardAnswer.cardId, cardId)).run();
  unique.forEach((romaji, i) => {
    // La primera es la primaria: es la que se muestra al revelar.
    db.insert(cardAnswer).values({ cardId, romaji, isPrimary: i === 0 }).run();
  });
}

export function createCard(
  db: Db, groupId: number,
  input: { prompt: string; meaning?: string | null; answers: string[] },
): { id: number } {
  const prompt = input.prompt.trim();
  if (!prompt) throw badRequest('La carta necesita un texto en japonés');

  const groups = db.select().from(cardGroup).where(eq(cardGroup.id, groupId)).all();
  if (groups.length === 0) throw notFound('El grupo');

  let id = 0;
  db.transaction((tx) => {
    const t = tx as Db;
    const siblings = t.select().from(card).where(eq(card.groupId, groupId)).all();
    const max = siblings.reduce((n, c) => Math.max(n, c.sortOrder), -1);
    const [row] = t.insert(card)
      .values({ groupId, prompt, meaning: input.meaning?.trim() || null, sortOrder: max + 1 })
      .returning().all();
    id = row.id;
    writeAnswers(t, id, input.answers);
  });

  return { id };
}

export function updateCard(
  db: Db, id: number,
  input: { prompt?: string; meaning?: string | null; answers?: string[]; groupId?: number },
): void {
  const rows = db.select().from(card).where(eq(card.id, id)).all();
  if (rows.length === 0) throw notFound('La carta');

  db.transaction((tx) => {
    const t = tx as Db;
    const patch: Partial<typeof card.$inferInsert> = {};
    if (input.prompt !== undefined) patch.prompt = input.prompt.trim();
    if (input.meaning !== undefined) patch.meaning = input.meaning?.trim() || null;
    // Mover de grupo es solo esto. attempt apunta a la carta, no al grupo,
    // así que el historial de métricas viaja con ella.
    if (input.groupId !== undefined) patch.groupId = input.groupId;
    if (Object.keys(patch).length > 0) {
      t.update(card).set(patch).where(eq(card.id, id)).run();
    }
    if (input.answers) writeAnswers(t, id, input.answers);
  });
}

export function deleteCard(db: Db, id: number): void {
  const res = db.delete(card).where(eq(card.id, id)).run();
  if (res.changes === 0) throw notFound('La carta');
}
