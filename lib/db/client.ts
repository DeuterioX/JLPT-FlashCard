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

export const db: Db =
  globalForDb.__db ?? (globalForDb.__db = createDb(process.env.DATABASE_PATH ?? 'kana-drill.db'));
