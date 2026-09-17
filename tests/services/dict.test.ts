import { describe, it, expect, beforeEach } from 'vitest';
import { createDb, migrate, type Db } from '../../lib/db/client';
import { createDictFts } from '../../lib/db/dict-fts';
import { searchDict } from '../../lib/services/dict';
import { dictEntry, dictGloss } from '../../lib/db/schema';

let db: Db;

function add(kana: string, kanji: string | null, romaji: string, glosses: [('spa'|'eng'), string][]) {
  const [e] = db.insert(dictEntry)
    .values({ kana, kanji, romaji, pos: 'sustantivo', isCommon: true }).returning().all();
  for (const [lang, text] of glosses) {
    db.insert(dictGloss).values({ entryId: e.id, lang, text }).run();
  }
}

beforeEach(() => {
  db = createDb(':memory:');
  migrate(db);
  createDictFts(db);

  add('さかな', '魚', 'sakana', [['spa', 'pescado, pez'], ['eng', 'fish']]);
  add('ぎょるい', '魚類', 'gyorui', [['spa', 'peces, ictiofauna']]);
  add('つりざお', '釣り竿', 'tsurizao', [['spa', 'caña de pescar']]);
  add('しらす', '白子', 'shirasu', [['eng', 'whitebait, young fish']]);
});

describe('searchDict', () => {
  it('encuentra por glosa en castellano', () => {
    const hits = searchDict(db, 'pescado');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].kana).toBe('さかな');
    expect(hits[0].kanji).toBe('魚');
    expect(hits[0].romaji).toBe('sakana');
    expect(hits[0].lang).toBe('spa');
  });

  it('pone los resultados en castellano antes que los de inglés', () => {
    const hits = searchDict(db, 'fish');
    const firstEng = hits.findIndex((h) => h.lang === 'eng');
    const lastSpa = hits.map((h) => h.lang).lastIndexOf('spa');
    if (firstEng >= 0 && lastSpa >= 0) expect(lastSpa).toBeLessThan(firstEng);
  });

  it('completa con inglés cuando el castellano no alcanza', () => {
    // "whitebait" solo existe en la glosa en inglés.
    const hits = searchDict(db, 'whitebait');
    expect(hits.some((h) => h.kana === 'しらす' && h.lang === 'eng')).toBe(true);
  });

  it('no repite la misma entrada dos veces', () => {
    const ids = searchDict(db, 'pescado').map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('devuelve vacío con una búsqueda vacía o de un solo carácter', () => {
    expect(searchDict(db, '')).toEqual([]);
    expect(searchDict(db, '  ')).toEqual([]);
  });

  it('no explota con caracteres que FTS5 interpreta como sintaxis', () => {
    // Comillas y asteriscos sueltos romperían la query si no se escapan.
    expect(() => searchDict(db, 'pes"cado')).not.toThrow();
    expect(() => searchDict(db, '*')).not.toThrow();
  });

  it('respeta el límite', () => {
    expect(searchDict(db, 'pe', 1).length).toBeLessThanOrEqual(1);
  });
});
