import { rawClient, type Db } from './client';
import { toRomaji } from '../kana/transliterate';

/**
 * Forma real de un build de scriptin/jmdict-simplified (verificada contra
 * jmdict-spa-3.6.2.json / jmdict-eng-common-3.6.2.json). El archivo trae más
 * campos (version, languages, tags, gender/type por glosa, etc.) que no se
 * usan acá: como el import solo lee lo declarado en este tipo, el resto
 * simplemente se ignora.
 */
export type JmdictFile = {
  words: {
    id: string;
    kanji: { text: string; common: boolean }[];
    kana: { text: string; common: boolean }[];
    sense: {
      partOfSpeech: string[];
      gloss: { lang: string; text: string }[];
    }[];
  }[];
};

export type ImportResult = { entries: number; glosses: number };

/**
 * Importa un build de jmdict-simplified para UN idioma. Pensado para correrse
 * una vez por idioma (español, después inglés): cada corrida crea su propia
 * fila de `dict_entry` por palabra, aunque la palabra ya exista en el otro
 * idioma -el dedup por (kana, kanji) se resuelve en `searchDict`, no acá.
 *
 * Idempotente: antes de insertar, borra las glosas que ya existían para este
 * idioma (el trigger AFTER DELETE de `dict-fts.ts` limpia el índice FTS solo)
 * y las entradas que quedaron sin ninguna glosa en ningún idioma. Así correr
 * el import dos veces con el mismo archivo no duplica filas.
 *
 * Usa el cliente crudo de better-sqlite3 (`db.$client`) con sentencias
 * preparadas reutilizadas dentro de una única transacción: con ~35.000
 * palabras, una transacción y un `.insert().values().run()` de Drizzle por
 * fila ya alcanza, pero una `INSERT` preparada a mano es sensiblemente más
 * rápida y es lo que pide la Task 16.
 */
export function importJmdict(db: Db, data: JmdictFile, lang: 'spa' | 'eng'): ImportResult {
  const sqlite = rawClient(db);
  let entries = 0;
  let glosses = 0;

  const run = sqlite.transaction(() => {
    sqlite.prepare('DELETE FROM dict_gloss WHERE lang = ?').run(lang);
    sqlite.prepare('DELETE FROM dict_entry WHERE id NOT IN (SELECT DISTINCT entry_id FROM dict_gloss)').run();

    const insertEntry = sqlite.prepare(
      'INSERT INTO dict_entry (kana, kanji, romaji, pos, is_common) VALUES (?, ?, ?, ?, ?)',
    );
    const insertGloss = sqlite.prepare(
      'INSERT INTO dict_gloss (entry_id, lang, text) VALUES (?, ?, ?)',
    );

    for (const w of data.words) {
      const kana = w.kana[0]?.text;
      if (!kana) continue;

      const texts = w.sense.flatMap((s) => s.gloss.filter((g) => g.lang === lang).map((g) => g.text));
      if (texts.length === 0) continue;

      const info = insertEntry.run(
        kana,
        w.kanji[0]?.text ?? null,
        // JMdict no trae romaji: se genera desde la lectura en kana.
        toRomaji(kana),
        w.sense[0]?.partOfSpeech?.[0] ?? null,
        w.kana[0]?.common ? 1 : 0,
      );
      entries += 1;
      const entryId = Number(info.lastInsertRowid);

      for (const text of texts) {
        insertGloss.run(entryId, lang, text);
        glosses += 1;
      }
    }
  });

  run();
  return { entries, glosses };
}
