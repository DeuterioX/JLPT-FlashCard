import { sql } from 'drizzle-orm';
import { sqliteTable, integer, text, index, uniqueIndex, primaryKey } from 'drizzle-orm/sqlite-core';

const now = () => new Date().toISOString();

export const deck = sqliteTable('deck', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  // Único significado: viene con la app, no se puede borrar.
  isBuiltin: integer('is_builtin', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull().$defaultFn(now),
});

export const cardGroup = sqliteTable('card_group', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  deckId: integer('deck_id').notNull().references(() => deck.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  // Encabezado de la grilla: Básicos | Dakuten | Contracciones | Extendidos.
  // NULL en mazos propios: se dibuja un bloque sin título.
  section: text('section'),
  sortOrder: integer('sort_order').notNull().default(0),
}, (t) => [index('ix_card_group_deck').on(t.deckId)]);

export const card = sqliteTable('card', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  groupId: integer('group_id').notNull().references(() => cardGroup.id, { onDelete: 'cascade' }),
  // Lo que se muestra. きゃ es UNA carta con dos caracteres, no una composición.
  prompt: text('prompt').notNull(),
  // Solo vocabulario. Se muestra al acertar; nunca es la pregunta.
  meaning: text('meaning'),
  sortOrder: integer('sort_order').notNull().default(0),
}, (t) => [index('ix_card_group').on(t.groupId)]);

export const cardAnswer = sqliteTable('card_answer', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cardId: integer('card_id').notNull().references(() => card.id, { onDelete: 'cascade' }),
  romaji: text('romaji').notNull(),
  // No participa de la validación: solo decide qué se muestra al revelar.
  isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
}, (t) => [
  index('ix_card_answer_card').on(t.cardId),
  uniqueIndex('ux_card_answer_primary').on(t.cardId).where(sql`is_primary = 1`),
]);

export const session = sqliteTable('session', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  startedAt: text('started_at').notNull().$defaultFn(now),
  // NULL = ronda abandonada.
  finishedAt: text('finished_at'),
  mode: text('mode', { enum: ['normal', 'review'] }).notNull().default('normal'),
  total: integer('total').notNull().default(0),
  correct: integer('correct').notNull().default(0),
  incorrect: integer('incorrect').notNull().default(0),
});

export const sessionGroup = sqliteTable('session_group', {
  sessionId: integer('session_id').notNull().references(() => session.id, { onDelete: 'cascade' }),
  groupId: integer('group_id').notNull().references(() => cardGroup.id, { onDelete: 'cascade' }),
}, (t) => [primaryKey({ columns: [t.sessionId, t.groupId] })]);

export const attempt = sqliteTable('attempt', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: integer('session_id').notNull().references(() => session.id, { onDelete: 'cascade' }),
  cardId: integer('card_id').notNull().references(() => card.id, { onDelete: 'cascade' }),
  typed: text('typed').notNull().default(''),
  isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
  // "Revelé" no es lo mismo que "me equivoqué" al analizar métricas.
  revealed: integer('revealed', { mode: 'boolean' }).notNull().default(false),
  ms: integer('ms').notNull().default(0),
  createdAt: text('created_at').notNull().$defaultFn(now),
}, (t) => [
  index('ix_attempt_card').on(t.cardId, t.createdAt),
  index('ix_attempt_session').on(t.sessionId),
]);

export const dictEntry = sqliteTable('dict_entry', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  kana: text('kana').notNull(),
  kanji: text('kanji'),
  romaji: text('romaji').notNull(),
  pos: text('pos'),
  isCommon: integer('is_common', { mode: 'boolean' }).notNull().default(false),
});

export const dictGloss = sqliteTable('dict_gloss', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entryId: integer('entry_id').notNull().references(() => dictEntry.id, { onDelete: 'cascade' }),
  lang: text('lang', { enum: ['spa', 'eng'] }).notNull(),
  text: text('text').notNull(),
}, (t) => [index('ix_dict_gloss_entry').on(t.entryId)]);
