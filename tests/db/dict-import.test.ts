import { describe, it, expect, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { createDb, migrate, type Db } from '../../lib/db/client';
import { importJmdict, type JmdictFile } from '../../lib/db/dict-import';
import { searchDict } from '../../lib/services/dict';

let db: Db;

beforeEach(() => {
  db = createDb(':memory:');
  migrate(db);
});

function fixture(gloss: { lang: string; text: string }[]): JmdictFile {
  return {
    words: [
      {
        id: '1578010',
        kanji: [{ text: '魚', common: true }],
        kana: [{ text: 'さかな', common: true }],
        sense: [{ partOfSpeech: ['n'], gloss }],
      },
    ],
  };
}

function counts(db: Db) {
  const [e] = db.all<{ n: number }>(sql`SELECT COUNT(*) AS n FROM dict_entry`);
  const [g] = db.all<{ n: number }>(sql`SELECT COUNT(*) AS n FROM dict_gloss`);
  return { entries: e.n, glosses: g.n };
}

describe('importJmdict', () => {
  it('importa entradas y glosas del idioma pedido, ignorando las de otro idioma', () => {
    const data = fixture([
      { lang: 'spa', text: 'pescado' },
      { lang: 'spa', text: 'pez' },
      { lang: 'eng', text: 'fish' },
    ]);
    const result = importJmdict(db, data, 'spa');
    expect(result.entries).toBe(1);
    expect(result.glosses).toBe(2);
    expect(counts(db)).toEqual({ entries: 1, glosses: 2 });
  });

  it('ignora palabras sin ninguna glosa en el idioma pedido', () => {
    const data = fixture([{ lang: 'eng', text: 'fish' }]);
    const result = importJmdict(db, data, 'spa');
    expect(result.entries).toBe(0);
    expect(counts(db)).toEqual({ entries: 0, glosses: 0 });
  });

  it('es idempotente: correr el mismo import dos veces no duplica filas', () => {
    const data = fixture([
      { lang: 'spa', text: 'pescado' },
      { lang: 'spa', text: 'pez' },
    ]);
    importJmdict(db, data, 'spa');
    const after1 = counts(db);
    importJmdict(db, data, 'spa');
    const after2 = counts(db);
    expect(after2).toEqual(after1);
    expect(after2).toEqual({ entries: 1, glosses: 2 });
  });

  it('reimportar el mismo idioma no rompe entradas ya presentes en el otro idioma', () => {
    // Palabra compartida: primero se importa en castellano, después en inglés.
    // Los dos imports generan una fila de dict_entry cada uno (Task 16, ambigüedad 3).
    importJmdict(db, fixture([{ lang: 'spa', text: 'pescado' }]), 'spa');
    importJmdict(db, fixture([{ lang: 'eng', text: 'fish' }]), 'eng');
    expect(counts(db)).toEqual({ entries: 2, glosses: 2 });

    // Reimportar español no debe tocar la entrada en inglés.
    importJmdict(db, fixture([{ lang: 'spa', text: 'pescado' }]), 'spa');
    expect(counts(db)).toEqual({ entries: 2, glosses: 2 });
  });

  it('deduplica por (kana, kanji) entre idiomas y prioriza la glosa en castellano', () => {
    // Se importa la misma palabra en ambos idiomas, y ambas glosas comparten
    // un término de búsqueda para forzar que la query encuentre las dos filas
    // (una por idioma) y el dedup por (kana, kanji) las colapse en una sola.
    importJmdict(db, fixture([{ lang: 'spa', text: 'comun' }]), 'spa');
    importJmdict(db, fixture([{ lang: 'eng', text: 'comun' }]), 'eng');

    const hits = searchDict(db, 'comun');
    const forSakana = hits.filter((h) => h.kana === 'さかな' && h.kanji === '魚');
    expect(forSakana.length).toBe(1);
    expect(forSakana[0].lang).toBe('spa');
  });
});
