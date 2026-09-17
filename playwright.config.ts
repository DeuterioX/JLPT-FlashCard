import { defineConfig, devices } from '@playwright/test';
import { E2E_BASE_URL, E2E_DATABASE_PATH, E2E_PORT } from './e2e/constants';

// Las pruebas end to end corren contra su propio servidor y su propia base:
// nunca contra el `next dev` ni la `database.db` del día a día. El puerto
// es otro (3100) para no chocar con el de un `npm run dev` abierto, y la base
// (`e2e.db`) la borra, migra y carga de cero `e2e/global-setup.ts`.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  globalSetup: './e2e/global-setup.ts',
  use: { baseURL: E2E_BASE_URL },
  webServer: {
    command: `npx next dev --port ${E2E_PORT}`,
    // `port` y no `url`: Playwright arranca el servidor ANTES del
    // globalSetup, y chequear una URL haría que Next renderice la home y
    // abra `e2e.db` antes de que el setup la borre (en Windows un archivo
    // abierto no se puede borrar). Con `port` solo espera a que acepte
    // conexiones, sin tocar la base; el setup precalienta la home después.
    port: E2E_PORT,
    // Vía `env` y no con sintaxis de shell (`VAR=x cmd`), que no anda en Windows.
    env: { DATABASE_PATH: E2E_DATABASE_PATH },
    // Nunca reusar: un servidor ya levantado podría estar apuntando a otra base.
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] } },
    // El caso difícil: pantalla chica con teclado virtual.
    { name: 'telefono', use: { ...devices['Pixel 7'] } },
  ],
});
