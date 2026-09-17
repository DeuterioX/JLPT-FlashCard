import { sql } from 'drizzle-orm';
import type { Db } from './client';

/**
 * Tabla FTS5 sobre las glosas, con contenido externo: no duplica el texto,
 * apunta a dict_gloss. Los triggers la mantienen sincronizada con altas y
 * bajas (no hace falta un trigger de UPDATE: el import nunca actualiza una
 * glosa existente, siempre borra e inserta de nuevo).
 *
 * Idempotente (`IF NOT EXISTS` en todo) para poder llamarse siempre desde
 * `migrate()` en `lib/db/client.ts`: así `dict_fts` existe en cualquier
 * base, se haya importado el diccionario o no, y `/api/dict/search` nunca
 * falla con "no such table: dict_fts".
 */
export function createDictFts(db: Db): void {
  db.run(sql`
    CREATE VIRTUAL TABLE IF NOT EXISTS dict_fts USING fts5(
      text,
      content='dict_gloss',
      content_rowid='id',
      tokenize='unicode61 remove_diacritics 2'
    )
  `);
  db.run(sql`
    CREATE TRIGGER IF NOT EXISTS dict_gloss_ai AFTER INSERT ON dict_gloss BEGIN
      INSERT INTO dict_fts(rowid, text) VALUES (new.id, new.text);
    END
  `);
  db.run(sql`
    CREATE TRIGGER IF NOT EXISTS dict_gloss_ad AFTER DELETE ON dict_gloss BEGIN
      INSERT INTO dict_fts(dict_fts, rowid, text) VALUES('delete', old.id, old.text);
    END
  `);
}
