import { rmSync } from 'node:fs';
import { createDb, migrate, rawClient } from '../lib/db/client';
import { seedKana } from '../lib/db/seed';
import { E2E_BASE_URL, E2E_DATABASE_PATH } from './constants';

/**
 * Deja `e2e.db` recién migrada y con los mazos de kana, sin nada de corridas
 * anteriores. Corre DESPUÉS de que Playwright levantó el servidor (ver
 * `webServer.port` en playwright.config.ts), pero antes de cualquier request
 * que haga abrir la base al servidor.
 */
export default async function globalSetup() {
  for (const suffix of ['', '-wal', '-shm']) {
    rmSync(E2E_DATABASE_PATH + suffix, { force: true });
  }

  const db = createDb(E2E_DATABASE_PATH);
  migrate(db);
  seedKana(db);
  rawClient(db).close();

  // Primera compilación de la home en `next dev`: mejor pagarla acá que
  // dentro del timeout del primer test.
  const res = await fetch(E2E_BASE_URL);
  if (!res.ok) throw new Error(`el servidor de e2e respondió ${res.status} en /`);
}
