import { eq, and, inArray, isNotNull, asc, count, sql } from 'drizzle-orm';
import type { Db } from '../db/client';
import { deck, cardGroup, card, cardAnswer } from '../db/schema';
import { normalizeAnswer } from '../kana/normalize';
import { notFound, forbidden, badRequest } from './errors';

/**
 * Cuántas cartas previsualiza una tarjeta de grupo. Un grupo que no lo pasa se
 * ve entero; uno que sí, muestra las primeras seis y cuántas quedan. Antes,
 * pasado el límite no mostraba NINGUNA -sólo el conteo-, y una Unidad de 30
 * palabras quedaba como una tarjeta vacía al lado de las de kana.
 */
const PREVIEW_LIMIT = 6;

export type GroupPreviewCard = { prompt: string; romaji: string };

export type GroupSummary = {
  id: number; name: string; section: string | null;
  sortOrder: number; cardCount: number; preview: GroupPreviewCard[];
  /**
   * Cuántas de sus cartas tienen significado. Es lo que decide si un grupo
   * puede entrar en una ronda de Significados: preguntar qué quiere decir あ
   * no significa nada, y `card.meaning` es NULL en los mazos incluidos.
   */
  meaningCount: number;
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

  // El conteo se pide como conteo, no contando filas traídas: es lo único que
  // la tarjeta necesita de las cartas que NO entran en la vista previa.
  const counts = groupIds.length
    ? db.select({ groupId: card.groupId, n: count() }).from(card)
        .where(inArray(card.groupId, groupIds)).groupBy(card.groupId).all()
    : [];
  const countByGroup = new Map(counts.map((c) => [c.groupId, c.n]));

  // Las que tienen significado, por grupo. Va como segundo conteo y no como
  // un `sum(case when ...)` sobre el primero porque Drizzle no modela ese
  // agregado condicional y el SQL a mano acá no se gana nada.
  const withMeaning = groupIds.length
    ? db.select({ groupId: card.groupId, n: count() }).from(card)
        .where(and(inArray(card.groupId, groupIds), isNotNull(card.meaning)))
        .groupBy(card.groupId).all()
    : [];
  const meaningByGroup = new Map(withMeaning.map((c) => [c.groupId, c.n]));

  /**
   * Las primeras `PREVIEW_LIMIT` de CADA grupo, con su romanización primaria,
   * en una sola consulta. La función de ventana numera dentro de cada grupo y
   * el `where` de afuera descarta el resto antes de que salga de SQLite.
   *
   * Antes esto traía todas las cartas y todas sus respuestas, y cortaba en
   * JS. A la escala de una base personal daba igual -medido sobre 384 cartas,
   * 0,30ms contra 0,46: a ese tamaño particionar cuesta más que leer la tabla
   * entera-, pero el costo crecía con la biblioteca ENTERA mientras la salida
   * está acotada en seis por grupo. Medido: a 3.800 cartas ya conviene esto, a
   * 50.000 es tres veces más rápido, y `listDecks` no filtra por dueño, así
   * que el día que la app tenga varias personas cada request iba a escanear
   * las cartas de todas.
   *
   * Va como SQL a mano porque Drizzle no modela funciones de ventana.
   */
  const previews = groupIds.length
    ? db.all<{ groupId: number; prompt: string; romaji: string | null }>(sql`
        select x.group_id as "groupId", x.prompt as "prompt", a.romaji as "romaji"
        from (
          select c.id, c.group_id, c.prompt,
                 row_number() over (partition by c.group_id order by c.sort_order) as rn
          from ${card} c
          where c.group_id in (${sql.join(groupIds.map((id) => sql`${id}`), sql`, `)})
        ) x
        left join ${cardAnswer} a on a.card_id = x.id and a.is_primary = 1
        where x.rn <= ${PREVIEW_LIMIT}
        order by x.group_id, x.rn
      `)
    : [];

  const previewByGroup = new Map<number, GroupPreviewCard[]>();
  for (const r of previews) {
    const list = previewByGroup.get(r.groupId) ?? [];
    list.push({ prompt: r.prompt, romaji: r.romaji ?? '' });
    previewByGroup.set(r.groupId, list);
  }

  return deckRows.map((d) => {
    const own = groups.filter((g) => g.deckId === d.id).map<GroupSummary>((g) => ({
      id: g.id, name: g.name, section: g.section, sortOrder: g.sortOrder,
      cardCount: countByGroup.get(g.id) ?? 0,
      meaningCount: meaningByGroup.get(g.id) ?? 0,
      preview: previewByGroup.get(g.id) ?? [],
    }));
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
  if (rows.length === 0) throw notFound('deck');
  return buildSummaries(db, rows)[0];
}

export function createDeck(db: Db, input: { name: string; groups?: string[] }): DeckSummary {
  const name = input.name.trim();
  if (!name) throw badRequest('deckNameRequired');

  // Una carta siempre cuelga de un grupo. Si no se pasa ninguno, se crea uno
  // solo llamado General. (Acá decía que la UI esconde ese nivel; no lo hace,
  // y no lo hizo nunca: la pantalla de grupos se muestra igual con uno solo.)
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

/**
 * «Sólo lectura» de un mazo incluido, del lado del servidor.
 *
 * Hasta acá eso vivía SOLO en la interfaz: los componentes escondían los
 * botones y los servicios aceptaban cualquier mutación. Y la interfaz tenía
 * un agujero -el panel de Borrar del gesto se dibujaba también en un mazo
 * incluido, verificado en vivo en Hiragana: el swipe descubría un «Borrar»
 * apretable-, así que se podía borrar una carta de un mazo que viene con la
 * app. `deleteDeck` era la única función que se defendía.
 *
 * Va en el servicio y no en la ruta porque es una regla del modelo, no del
 * transporte: cualquier camino que llegue a una carta de Hiragana tiene que
 * rebotar, venga de la API, de un script o de un test.
 */
function assertEditable(db: Db, deckId: number): void {
  const rows = db.select({ isBuiltin: deck.isBuiltin }).from(deck).where(eq(deck.id, deckId)).all();
  if (rows.length === 0) throw notFound('deck');
  if (rows[0].isBuiltin) {
    throw forbidden('builtinNoEdit');
  }
}

function deckOfGroup(db: Db, groupId: number): number {
  const rows = db.select({ deckId: cardGroup.deckId }).from(cardGroup)
    .where(eq(cardGroup.id, groupId)).all();
  if (rows.length === 0) throw notFound('group');
  return rows[0].deckId;
}

function deckOfCard(db: Db, cardId: number): number {
  const rows = db.select({ deckId: cardGroup.deckId }).from(card)
    .innerJoin(cardGroup, eq(cardGroup.id, card.groupId))
    .where(eq(card.id, cardId)).all();
  if (rows.length === 0) throw notFound('card');
  return rows[0].deckId;
}

export function renameDeck(db: Db, id: number, name: string): void {
  assertEditable(db, id);
  const trimmed = name.trim();
  if (!trimmed) throw badRequest('deckNameRequired');
  const res = db.update(deck).set({ name: trimmed }).where(eq(deck.id, id)).run();
  if (res.changes === 0) throw notFound('deck');
}

export function deleteDeck(db: Db, id: number): void {
  const rows = db.select().from(deck).where(eq(deck.id, id)).all();
  if (rows.length === 0) throw notFound('deck');
  if (rows[0].isBuiltin) {
    throw forbidden('builtinNoDelete');
  }
  // El resto cae por ON DELETE CASCADE (requiere PRAGMA foreign_keys = ON).
  db.delete(deck).where(eq(deck.id, id)).run();
}

export function createGroup(db: Db, deckId: number, name: string): GroupSummary {
  assertEditable(db, deckId);
  const trimmed = name.trim();
  if (!trimmed) throw badRequest('groupNameRequired');
  const parent = getDeck(db, deckId);
  const max = parent.groups.reduce((n, g) => Math.max(n, g.sortOrder), -1);

  const [row] = db.insert(cardGroup)
    .values({ deckId, name: trimmed, section: null, sortOrder: max + 1 })
    .returning().all();

  return { id: row.id, name: row.name, section: row.section, sortOrder: row.sortOrder,
           cardCount: 0, meaningCount: 0, preview: [] };
}

export function renameGroup(db: Db, id: number, name: string): void {
  assertEditable(db, deckOfGroup(db, id));
  const trimmed = name.trim();
  if (!trimmed) throw badRequest('groupNameRequired');
  const res = db.update(cardGroup).set({ name: trimmed }).where(eq(cardGroup.id, id)).run();
  if (res.changes === 0) throw notFound('group');
}

export function deleteGroup(db: Db, id: number): void {
  assertEditable(db, deckOfGroup(db, id));
  const res = db.delete(cardGroup).where(eq(cardGroup.id, id)).run();
  if (res.changes === 0) throw notFound('group');
}

/**
 * Primera letra en mayúscula, para el significado. Sólo la PRIMERA: el resto queda como se
 * escribió, porque ahí puede haber nombres propios o siglas que no hay que
 * tocar. Se salta lo que no sea letra al principio, así «¡hola!» queda
 * «¡Hola!» y no sin cambiar.
 */
function capitalize(s: string): string {
  return s.replace(/^([^\p{L}]*)(\p{L})/u, (_, previo, letra) => previo + letra.toUpperCase());
}

function writeAnswers(db: Db, cardId: number, answers: string[]) {
  const clean = answers.map(normalizeAnswer).filter(Boolean);
  if (clean.length === 0) throw badRequest('cardNeedsRomaji');
  const unique = [...new Set(clean)];

  db.delete(cardAnswer).where(eq(cardAnswer.cardId, cardId)).run();
  unique.forEach((romaji, i) => {
    // El romaji queda como lo dejó `normalizeAnswer`, en minúscula: es una
    // transcripción fonética, no una palabra de una frase. El significado sí
    // se capitaliza (ver `createCard`), y esa diferencia es a propósito.
    // La primera es la primaria: es la que se muestra al revelar.
    db.insert(cardAnswer).values({ cardId, romaji, isPrimary: i === 0 }).run();
  });
}

export function createCard(
  db: Db, groupId: number,
  input: { prompt: string; meaning?: string | null; answers: string[] },
): { id: number } {
  assertEditable(db, deckOfGroup(db, groupId));
  const prompt = input.prompt.trim();
  if (!prompt) throw badRequest('cardNeedsPrompt');

  const groups = db.select().from(cardGroup).where(eq(cardGroup.id, groupId)).all();
  if (groups.length === 0) throw notFound('group');

  let id = 0;
  db.transaction((tx) => {
    const t = tx as Db;
    const siblings = t.select().from(card).where(eq(card.groupId, groupId)).all();
    const max = siblings.reduce((n, c) => Math.max(n, c.sortOrder), -1);
    const [row] = t.insert(card)
      .values({
        groupId,
        prompt,
        meaning: input.meaning?.trim() ? capitalize(input.meaning.trim()) : null,
        sortOrder: max + 1,
      })
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
  if (rows.length === 0) throw notFound('card');
  assertEditable(db, deckOfCard(db, id));

  if (input.prompt !== undefined && !input.prompt.trim()) {
    throw badRequest('cardNeedsPrompt');
  }
  if (input.groupId !== undefined) {
    const target = db.select().from(cardGroup).where(eq(cardGroup.id, input.groupId)).all();
    if (target.length === 0) throw notFound('group');
    // También el DESTINO: mover una carta a un mazo incluido lo estaría
    // editando igual, sólo que desde el otro lado.
    assertEditable(db, deckOfGroup(db, input.groupId));
  }

  db.transaction((tx) => {
    const t = tx as Db;
    const patch: Partial<typeof card.$inferInsert> = {};
    if (input.prompt !== undefined) patch.prompt = input.prompt.trim();
    if (input.meaning !== undefined) {
      patch.meaning = input.meaning?.trim() ? capitalize(input.meaning.trim()) : null;
    }
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
  assertEditable(db, deckOfCard(db, id));
  const res = db.delete(card).where(eq(card.id, id)).run();
  if (res.changes === 0) throw notFound('card');
}
