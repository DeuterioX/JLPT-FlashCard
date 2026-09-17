import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

type GlobalWithDb = typeof globalThis & { __db?: { $client: { close: () => void } } };

describe('cliente perezoso', () => {
  let dbPath: string;
  const originalDatabasePath = process.env.DATABASE_PATH;

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `kana-drill-lazy-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    process.env.DATABASE_PATH = dbPath;
    vi.resetModules();
  });

  afterEach(() => {
    // El singleton vive en globalThis (a propósito, para el hot-reload de
    // Next). Si no se limpia acá, el siguiente test reutiliza la conexión
    // vieja en vez de abrir una nueva contra el `dbPath` de este test.
    const g = globalThis as GlobalWithDb;
    g.__db?.$client.close();
    delete g.__db;

    if (originalDatabasePath === undefined) delete process.env.DATABASE_PATH;
    else process.env.DATABASE_PATH = originalDatabasePath;

    for (const suffix of ['', '-wal', '-shm']) {
      const p = dbPath + suffix;
      if (fs.existsSync(p)) fs.rmSync(p);
    }
  });

  it('importar el módulo no crea el archivo de base de datos', async () => {
    await import('../../lib/db/client');
    expect(fs.existsSync(dbPath)).toBe(false);
  });

  it('recién crea el archivo cuando se toca una propiedad del singleton db', async () => {
    const mod = await import('../../lib/db/client');
    expect(fs.existsSync(dbPath)).toBe(false);

    mod.db.select(); // tocar el Proxy fuerza la conexión real

    expect(fs.existsSync(dbPath)).toBe(true);
  });
});

describe('migrate', () => {
  it('crea la tabla FTS del diccionario y se puede correr dos veces', async () => {
    const { sql } = await import('drizzle-orm');
    const { createDb, migrate } = await import('../../lib/db/client');
    const { searchDict } = await import('../../lib/services/dict');
    const db = createDb(':memory:');
    migrate(db);
    migrate(db);

    const rows = db.all<{ name: string }>(
      sql`SELECT name FROM sqlite_master WHERE name IN ('dict_fts', 'dict_gloss_ai', 'dict_gloss_ad') ORDER BY name`,
    );
    expect(rows.map((r) => r.name)).toEqual(['dict_fts', 'dict_gloss_ad', 'dict_gloss_ai']);
    // Sin diccionario importado, buscar devuelve vacío en vez de tirar.
    expect(searchDict(db, 'pescado')).toEqual([]);
  });
});
