import { sql } from 'drizzle-orm';
import type { Db } from '../db/client';

export type DictHit = {
  id: number; kana: string; kanji: string | null; romaji: string;
  pos: string | null; gloss: string; lang: 'spa' | 'eng';
};

/**
 * FTS5 trata comillas, asteriscos y paréntesis como sintaxis de consulta.
 * Se envuelve cada término entre comillas dobles y se duplican las internas,
 * así una búsqueda con `"` o `*` sueltos nunca rompe la query.
 */
function toMatchQuery(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => `"${t.replace(/"/g, '""')}"*`)
    .join(' ');
}

/**
 * Si se importó algún diccionario (`npm run db:seed:dict`). Sin esto el
 * buscador no puede distinguir "no hay coincidencias" de "no hay nada
 * cargado" y le sugería al usuario que la palabra era poco común.
 */
export function isDictionaryLoaded(db: Db): boolean {
  const [row] = db.all<{ loaded: number }>(sql`SELECT EXISTS (SELECT 1 FROM dict_entry) AS loaded`);
  return row?.loaded === 1;
}

type Row = {
  id: number; kana: string; kanji: string | null; romaji: string;
  pos: string | null; gloss: string; lang: 'spa' | 'eng';
};

export function searchDict(db: Db, query: string, limit = 30): DictHit[] {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const match = toMatchQuery(trimmed);
  if (!match) return [];

  // Español primero, después inglés. Dentro de cada idioma, por relevancia
  // de FTS5 y priorizando las palabras comunes. bm25 suele empatar entre una
  // coincidencia exacta ("pescado") y una por prefijo sobre una palabra más
  // larga ("pescadores"): el largo de la glosa como último desempate hace
  // ganar a la más corta -normalmente la más exacta- en esos empates.
  // Se pide de más (limit * 3) porque el dedup de abajo puede descartar
  // varias filas por palabra.
  const rows = db.all<Row>(sql`
    SELECT e.id, e.kana, e.kanji, e.romaji, e.pos, g.text AS gloss, g.lang
    FROM dict_fts f
    JOIN dict_gloss g ON g.id = f.rowid
    JOIN dict_entry e ON e.id = g.entry_id
    WHERE dict_fts MATCH ${match}
    ORDER BY (g.lang = 'spa') DESC, e.is_common DESC, rank, length(g.text) ASC
    LIMIT ${limit * 3}
  `);

  // Una misma palabra puede tener varias glosas que matchean (varias
  // acepciones), y además puede existir dos veces en la base: una entrada
  // por cada idioma importado (Task 16, ambigüedad 3 del dispatch). Deduplicar
  // solo por `id` mostraría さかな dos veces -una en español, otra en inglés-
  // así que se agrupa por (kana, kanji). Como las filas ya vienen ordenadas
  // con español primero, la primera que se vea para cada clave es la que
  // queda, y gana la glosa en castellano cuando ambas existen.
  const seen = new Set<string>();
  const out: DictHit[] = [];
  for (const r of rows) {
    const key = JSON.stringify([r.kana, r.kanji]);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
    if (out.length >= limit) break;
  }
  return out;
}
