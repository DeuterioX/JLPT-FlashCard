import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate as drizzleMigrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';

export type Db = BetterSQLite3Database<typeof schema>;

export function createDb(path: string): Db {
  const sqlite = new Database(path);
  // SQLite trae las foreign keys APAGADAS. Sin esto los ON DELETE CASCADE
  // del esquema no hacen absolutamente nada y quedan filas huérfanas.
  sqlite.pragma('foreign_keys = ON');
  if (path !== ':memory:') sqlite.pragma('journal_mode = WAL');
  return drizzle(sqlite, { schema });
}

export function migrate(db: Db) {
  drizzleMigrate(db, { migrationsFolder: 'lib/db/migrations' });
}

// Next recarga módulos en dev; sin el singleton se abren decenas de conexiones.
const globalForDb = globalThis as unknown as { __db?: Db };

function ensureDb(): Db {
  return globalForDb.__db ?? (globalForDb.__db = createDb(process.env.DATABASE_PATH ?? 'kana-drill.db'));
}

// `db` tiene que ser perezoso: si se conectara al importar el módulo, el
// simple hecho de importar este archivo (algo que hacen todos los tests,
// incluso los que solo usan `createDb`/`migrate`) abriría una conexión real
// y crearía el archivo .db en disco como efecto secundario. Con un Proxy la
// conexión real recién se crea la primera vez que alguien toca una
// propiedad de `db` (p. ej. `db.select`). El `receiver` de `Reflect.get` se
// deja en el objeto real (no en el Proxy) y los métodos se re-bindean a
// mano: si el `this` de un método de Drizzle terminara siendo el Proxy en
// vez de la instancia real, el chaining interno se rompe.
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = ensureDb();
    const value = Reflect.get(real, prop);
    return typeof value === 'function' ? value.bind(real) : value;
  },
});
