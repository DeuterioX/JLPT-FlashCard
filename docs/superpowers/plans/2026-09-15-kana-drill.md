# Kana Drill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App web de flashcards donde se muestra un kana o una palabra japonesa y se responde escribiendo el romaji, con mazos propios, métricas históricas y diccionario local.

**Architecture:** Next.js App Router con SSR. Las páginas server-side y los Route Handlers bajo `app/api/` llaman al mismo `lib/services/*`; nunca hay fetch del servidor a sí mismo. El motor del quiz es un módulo puro sin React, testeado con Vitest. SQLite vía better-sqlite3 + Drizzle.

**Tech Stack:** TypeScript, Next.js (App Router), Mantine, better-sqlite3, Drizzle ORM, Zod, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-15-jlpt-flashcards-design.md`

## Global Constraints

- **Idioma de la UI:** castellano rioplatense. Nunca usar la palabra "sembrado" en texto visible — los mazos `is_builtin` se marcan con un punto jade y tooltip "Incluido en la app · no se puede borrar".
- **Dirección de respuesta:** siempre kana → romaji. También para vocabulario. `meaning` nunca es la pregunta.
- **Al errar:** la carta se queda hasta acertarla y no se re-encola. Una vez acertada no vuelve en esa ronda.
- **Revelar cuenta como error:** registra `attempt` con `revealed = 1`, `is_correct = 0`, `typed = ''`.
- **Paleta obligatoria** (Mantine por defecto es gris neutro y NO sirve): `dark-7 #0F1220`, `dark-6 #181C2E`, `dark-4 #2C3249`, `dark-0 #E9EBF4`, jade `#3FBF8F`, shu `#E2604A`.
- **Tipografías:** Zen Kaku Gothic New para todo kana, IBM Plex Sans para UI, IBM Plex Mono para romaji y números.
- **Conteos autoritativos del seed:** Hiragana 26 grupos / 104 cartas. Katakana 33 grupos / 131 cartas.
- **Responsive obligatorio**, breakpoint 640px. El input del quiz siempre lleva `autocapitalize="off" autocorrect="off" spellcheck="false" inputmode="text"`.
- **SQLite necesita `PRAGMA foreign_keys = ON`** en cada conexión — está apagado por defecto y sin eso los `ON DELETE CASCADE` no hacen nada.
- **Commits frecuentes**, uno por tarea como mínimo. Mensajes en castellano, imperativo.

---

## Estructura de archivos

```
package.json, next.config.ts, tsconfig.json
drizzle.config.ts, vitest.config.ts, playwright.config.ts
theme.ts                          Tema de Mantine (paleta índigo + jade + shu)

app/
  layout.tsx                      MantineProvider, ColorSchemeScript, AppShell
  page.tsx                        01 Práctica
  practicar/page.tsx              02 Quiz (cáscara servidor)
  mazos/page.tsx                  04 Mis mazos
  mazos/[id]/page.tsx             05 Editor de mazo
  estadisticas/page.tsx           07 Estadísticas
  api/**/route.ts                 Route Handlers

lib/
  db/schema.ts                    Tablas Drizzle
  db/client.ts                    better-sqlite3 + pragmas + singleton
  auth/context.ts                 Seam para el login futuro
  kana/tables.ts                  Datos de hiragana y katakana (fuente de verdad)
  kana/transliterate.ts           kana → romaji
  kana/normalize.ts               Normalización y matching de respuestas
  quiz/engine.ts                  Motor de ronda, puro, sin React
  services/decks.ts               Mazos, grupos, cartas
  services/sessions.ts            Rondas e intentos
  services/stats.ts               Métricas y ranking
  services/dict.ts                Búsqueda en JMdict
  api/handler.ts                  Wrapper: Zod + errores → HTTP
  api/schemas.ts                  Esquemas Zod
  selection-cookie.ts             Lectura/escritura de la selección de grupos

components/
  AppShell.tsx                    Barra superior en desktop, pestañas en móvil
  GroupCard.tsx                   Tarjeta con toggle + regla de las seis cartas
  GroupGrid.tsx                   Grilla seccionada
  ActionBar.tsx                   Barra inferior de acción
  MetricTile.tsx                  Tile de métrica
  ListRow.tsx                     Fila de lista
  quiz/QuizRunner.tsx             Cliente: envuelve lib/quiz/engine
  quiz/RoundSummary.tsx           Overlay de fin de ronda
  dict/DictSearchPanel.tsx        06 Panel de diccionario

scripts/
  seed.ts                         Mazos de kana
  seed-dict.ts                    Import de JMdict
```

**Por qué el motor del quiz vive en `lib/quiz/engine.ts` y no dentro del componente:** es la lógica con más riesgo de la app (cola de cartas, conteo de errores, la regla de que la carta se queda) y como módulo puro se testea con Vitest en milisegundos, sin montar React ni un browser. `QuizRunner.tsx` queda como una cáscara de estado y eventos.

---

### Task 1: Scaffold, tema de Mantine y Vitest

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`
- Create: `theme.ts`
- Create: `app/layout.tsx`, `app/page.tsx`
- Create: `tests/theme.test.ts`
- Create: `.gitignore`

**Interfaces:**
- Consumes: nada, es la primera tarea.
- Produces: `theme` (objeto `MantineThemeOverride` exportado desde `theme.ts`), scripts `npm run dev`, `npm test`.

- [ ] **Step 1: Crear el proyecto Next**

```bash
npx create-next-app@latest . --typescript --app --no-src-dir --no-tailwind --eslint --import-alias "@/*"
```

Cuando pregunte por Turbopack, aceptar. Si el directorio no está vacío por el `docs/`, confirmar que continúe.

- [ ] **Step 2: Instalar dependencias**

```bash
npm install @mantine/core @mantine/hooks
npm install better-sqlite3 drizzle-orm zod
npm install -D drizzle-kit @types/better-sqlite3 vitest
```

- [ ] **Step 3: Escribir el test que falla**

`tests/theme.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { theme } from '../theme';

describe('tema de Mantine', () => {
  it('reemplaza el gris neutro de Mantine por la paleta índigo', () => {
    // Mantine 8 trae dark-7 = #242424 (gris puro). El diseño exige índigo.
    expect(theme.colors?.dark?.[7]).toBe('#0F1220');
    expect(theme.colors?.dark?.[6]).toBe('#181C2E');
    expect(theme.colors?.dark?.[4]).toBe('#2C3249');
    expect(theme.colors?.dark?.[0]).toBe('#E9EBF4');
  });

  it('usa jade como color primario, con el shade correcto en modo oscuro', () => {
    expect(theme.primaryColor).toBe('jade');
    expect(theme.colors?.jade?.[6]).toBe('#3FBF8F');
    // Por defecto Mantine usa el shade 8 en dark, que sería demasiado apagado.
    expect(theme.primaryShade).toEqual({ light: 6, dark: 6 });
  });

  it('define shu para los estados de error', () => {
    expect(theme.colors?.shu?.[6]).toBe('#E2604A');
  });
});
```

- [ ] **Step 4: Correr el test y verificar que falla**

Agregar a `package.json`: `"test": "vitest run"`.

Crear `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
```

Run: `npm test`
Expected: FAIL — `Cannot find module '../theme'`

- [ ] **Step 5: Escribir el tema**

`theme.ts`:

```ts
import { createTheme, type MantineColorsTuple } from '@mantine/core';

// Índigo profundo, no negro. Reemplaza el `dark` gris neutro de Mantine.
// Mantine deriva de este array TODAS sus variables semánticas, así que
// redefinirlo alcanza para que cada componente se acomode solo.
// Ojo con el orden: en la escala de Mantine el 6 es MÁS CLARO que el 7.
const dark: MantineColorsTuple = [
  '#E9EBF4', // 0 → --mantine-color-text
  '#C3C8DC', // 1
  '#868DA8', // 2 → texto atenuado
  '#5D6480', // 3 → placeholders
  '#2C3249', // 4 → --mantine-color-default-border
  '#212639', // 5 → hover
  '#181C2E', // 6 → --mantine-color-default (superficies)
  '#0F1220', // 7 → --mantine-color-body (fondo de página)
  '#0B0E19', // 8
  '#070912', // 9
];

// Acción y acierto. Generado desde #3FBF8F con el generador de Mantine.
const jade: MantineColorsTuple = [
  '#E9F9F2', '#CDEFE2', '#A6E2CB', '#7BD4B2', '#57C79D',
  '#4BC796', '#3FBF8F', '#339C76', '#27795C', '#1A5641',
];

// Error. Generado desde #E2604A.
const shu: MantineColorsTuple = [
  '#FDEEEB', '#F9D6CF', '#F2B4A7', '#EC917F', '#E7755F',
  '#E56B55', '#E2604A', '#C74E3A', '#A43D2C', '#7F2C1F',
];

export const theme = createTheme({
  primaryColor: 'jade',
  // Mantine usa el shade 8 en dark por defecto, que apaga demasiado el jade.
  primaryShade: { light: 6, dark: 6 },
  colors: { dark, jade, shu },
  fontFamily: '"IBM Plex Sans", system-ui, -apple-system, sans-serif',
  fontFamilyMonospace: '"IBM Plex Mono", ui-monospace, monospace',
  headings: { fontFamily: '"Zen Kaku Gothic New", "IBM Plex Sans", sans-serif' },
  defaultRadius: 'sm',
});
```

- [ ] **Step 6: Correr el test y verificar que pasa**

Run: `npm test`
Expected: PASS, 3 tests.

- [ ] **Step 7: Montar el layout raíz**

`app/layout.tsx`:

```tsx
import '@mantine/core/styles.css';
import './globals.css';
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from '@mantine/core';
import { theme } from '../theme';

export const metadata = { title: 'Kana Drill' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap"
        />
      </head>
      <body>
        <MantineProvider theme={theme} defaultColorScheme="dark">
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}
```

`app/page.tsx` (provisorio, se reemplaza en la Task 10):

```tsx
import { Title, Text, Stack } from '@mantine/core';

export default function Home() {
  return (
    <Stack p="xl" gap="xs">
      <Title order={1}>Kana Drill</Title>
      <Text c="dimmed">あ い う え お</Text>
    </Stack>
  );
}
```

- [ ] **Step 8: Configurar better-sqlite3 como paquete externo**

`next.config.ts`:

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // better-sqlite3 es un módulo nativo: no puede pasar por el bundler.
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
```

- [ ] **Step 9: Verificar a ojo que el fondo es índigo**

Run: `npm run dev` y abrir http://localhost:3000

Expected: fondo `#0F1220` (índigo oscuro, claramente no gris), el título en Zen Kaku Gothic New, los kana renderizando bien. Si el fondo se ve gris, `defaultColorScheme="dark"` no está aplicado o falta el import de `@mantine/core/styles.css`.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: scaffold de Next con Mantine y paleta índigo"
```

---

### Task 2: Esquema de base de datos y cliente Drizzle

**Files:**
- Create: `lib/db/schema.ts`, `lib/db/client.ts`, `drizzle.config.ts`
- Create: `lib/auth/context.ts`
- Create: `tests/db/schema.test.ts`
- Modify: `.gitignore` (agregar `*.db`, `*.db-wal`, `*.db-shm`)

**Interfaces:**
- Consumes: nada de tareas previas.
- Produces:
  - `lib/db/schema.ts` exporta las tablas `deck`, `cardGroup`, `card`, `cardAnswer`, `session`, `sessionGroup`, `attempt`, `dictEntry`, `dictGloss`.
  - `lib/db/client.ts` exporta `db` (instancia Drizzle) y `createDb(path: string)` para tests.
  - `lib/auth/context.ts` exporta `type AuthContext = { userId: number | null }` y `getAuthContext(): AuthContext`.

- [ ] **Step 1: Escribir el test que falla**

`tests/db/schema.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createDb, migrate } from '../../lib/db/client';
import { deck, cardGroup, card, cardAnswer } from '../../lib/db/schema';
import { eq } from 'drizzle-orm';

let db: ReturnType<typeof createDb>;

beforeEach(() => {
  db = createDb(':memory:');
  migrate(db);
});

describe('esquema', () => {
  it('crea un mazo con grupo, carta y respuesta', () => {
    const [d] = db.insert(deck).values({ name: 'Hiragana', isBuiltin: true }).returning().all();
    const [g] = db.insert(cardGroup).values({ deckId: d.id, name: 'か行', section: 'Básicos' }).returning().all();
    const [c] = db.insert(card).values({ groupId: g.id, prompt: 'か' }).returning().all();
    db.insert(cardAnswer).values({ cardId: c.id, romaji: 'ka', isPrimary: true }).run();

    const rows = db.select().from(cardAnswer).where(eq(cardAnswer.cardId, c.id)).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].romaji).toBe('ka');
  });

  it('acepta varias respuestas pero una sola primaria por carta', () => {
    const [d] = db.insert(deck).values({ name: 'Hiragana' }).returning().all();
    const [g] = db.insert(cardGroup).values({ deckId: d.id, name: 'さ行' }).returning().all();
    const [c] = db.insert(card).values({ groupId: g.id, prompt: 'し' }).returning().all();

    db.insert(cardAnswer).values({ cardId: c.id, romaji: 'shi', isPrimary: true }).run();
    db.insert(cardAnswer).values({ cardId: c.id, romaji: 'si', isPrimary: false }).run();

    expect(db.select().from(cardAnswer).where(eq(cardAnswer.cardId, c.id)).all()).toHaveLength(2);

    // El índice único parcial tiene que rechazar una segunda primaria.
    expect(() =>
      db.insert(cardAnswer).values({ cardId: c.id, romaji: 'xx', isPrimary: true }).run(),
    ).toThrow();
  });

  it('borra en cascada: borrar el mazo se lleva grupos, cartas y respuestas', () => {
    const [d] = db.insert(deck).values({ name: 'Comidas' }).returning().all();
    const [g] = db.insert(cardGroup).values({ deckId: d.id, name: 'Pescado' }).returning().all();
    const [c] = db.insert(card).values({ groupId: g.id, prompt: 'さかな', meaning: 'pescado' }).returning().all();
    db.insert(cardAnswer).values({ cardId: c.id, romaji: 'sakana', isPrimary: true }).run();

    db.delete(deck).where(eq(deck.id, d.id)).run();

    // Si esto falla con filas sobrantes, falta PRAGMA foreign_keys = ON.
    expect(db.select().from(cardGroup).all()).toHaveLength(0);
    expect(db.select().from(card).all()).toHaveLength(0);
    expect(db.select().from(cardAnswer).all()).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run tests/db/schema.test.ts`
Expected: FAIL — `Cannot find module '../../lib/db/client'`

- [ ] **Step 3: Escribir el esquema**

`lib/db/schema.ts`:

```ts
import { sql } from 'drizzle-orm';
import { sqliteTable, integer, text, index, uniqueIndex, primaryKey } from 'drizzle-orm/sqlite-core';

const now = () => new Date().toISOString();

export const deck = sqliteTable('deck', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  // Único significado: viene con la app, no se puede borrar.
  isBuiltin: integer('is_builtin', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull().$defaultFn(now),
});

export const cardGroup = sqliteTable('card_group', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  deckId: integer('deck_id').notNull().references(() => deck.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  // Encabezado de la grilla: Básicos | Dakuten | Contracciones | Extendidos.
  // NULL en mazos propios: se dibuja un bloque sin título.
  section: text('section'),
  sortOrder: integer('sort_order').notNull().default(0),
}, (t) => [index('ix_card_group_deck').on(t.deckId)]);

export const card = sqliteTable('card', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  groupId: integer('group_id').notNull().references(() => cardGroup.id, { onDelete: 'cascade' }),
  // Lo que se muestra. きゃ es UNA carta con dos caracteres, no una composición.
  prompt: text('prompt').notNull(),
  // Solo vocabulario. Se muestra al acertar; nunca es la pregunta.
  meaning: text('meaning'),
  sortOrder: integer('sort_order').notNull().default(0),
}, (t) => [index('ix_card_group').on(t.groupId)]);

export const cardAnswer = sqliteTable('card_answer', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cardId: integer('card_id').notNull().references(() => card.id, { onDelete: 'cascade' }),
  romaji: text('romaji').notNull(),
  // No participa de la validación: solo decide qué se muestra al revelar.
  isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
}, (t) => [
  index('ix_card_answer_card').on(t.cardId),
  uniqueIndex('ux_card_answer_primary').on(t.cardId).where(sql`is_primary = 1`),
]);

export const session = sqliteTable('session', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  startedAt: text('started_at').notNull().$defaultFn(now),
  // NULL = ronda abandonada.
  finishedAt: text('finished_at'),
  mode: text('mode', { enum: ['normal', 'review'] }).notNull().default('normal'),
  total: integer('total').notNull().default(0),
  correct: integer('correct').notNull().default(0),
  incorrect: integer('incorrect').notNull().default(0),
});

export const sessionGroup = sqliteTable('session_group', {
  sessionId: integer('session_id').notNull().references(() => session.id, { onDelete: 'cascade' }),
  groupId: integer('group_id').notNull().references(() => cardGroup.id, { onDelete: 'cascade' }),
}, (t) => [primaryKey({ columns: [t.sessionId, t.groupId] })]);

export const attempt = sqliteTable('attempt', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: integer('session_id').notNull().references(() => session.id, { onDelete: 'cascade' }),
  cardId: integer('card_id').notNull().references(() => card.id, { onDelete: 'cascade' }),
  typed: text('typed').notNull().default(''),
  isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
  // "Revelé" no es lo mismo que "me equivoqué" al analizar métricas.
  revealed: integer('revealed', { mode: 'boolean' }).notNull().default(false),
  ms: integer('ms').notNull().default(0),
  createdAt: text('created_at').notNull().$defaultFn(now),
}, (t) => [
  index('ix_attempt_card').on(t.cardId, t.createdAt),
  index('ix_attempt_session').on(t.sessionId),
]);

export const dictEntry = sqliteTable('dict_entry', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  kana: text('kana').notNull(),
  kanji: text('kanji'),
  romaji: text('romaji').notNull(),
  pos: text('pos'),
  isCommon: integer('is_common', { mode: 'boolean' }).notNull().default(false),
});

export const dictGloss = sqliteTable('dict_gloss', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entryId: integer('entry_id').notNull().references(() => dictEntry.id, { onDelete: 'cascade' }),
  lang: text('lang', { enum: ['spa', 'eng'] }).notNull(),
  text: text('text').notNull(),
}, (t) => [index('ix_dict_gloss_entry').on(t.entryId)]);
```

- [ ] **Step 4: Escribir el cliente**

`lib/db/client.ts`:

```ts
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
```

- [ ] **Step 5: Generar la migración**

`drizzle.config.ts`:

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dbCredentials: { url: process.env.DATABASE_PATH ?? 'kana-drill.db' },
});
```

Agregar a `package.json`:

```json
"db:generate": "drizzle-kit generate",
"db:migrate": "tsx scripts/migrate.ts"
```

Instalar el runner de TypeScript: `npm install -D tsx`

Run: `npm run db:generate`
Expected: aparece `lib/db/migrations/0000_*.sql` con los nueve `CREATE TABLE`.

Verificar a mano que el SQL generado incluye la línea del índice parcial:

```sql
CREATE UNIQUE INDEX `ux_card_answer_primary` ON `card_answer` (`card_id`) WHERE is_primary = 1;
```

Si falta el `WHERE`, el índice prohibiría más de una respuesta por carta y el
segundo test de la Task 2 va a fallar al insertar `si`.

`scripts/migrate.ts`:

```ts
import { db, migrate } from '../lib/db/client';
migrate(db);
console.log('migraciones aplicadas');
```

> En la Task 16 este script suma una línea más: `createDictFts(db)`. La tabla
> FTS5 no la genera Drizzle (no modela tablas virtuales), así que sin esa
> llamada `/api/dict/search` falla con "no such table: dict_fts" en cualquier
> base que no haya pasado por el import del diccionario.

- [ ] **Step 6: Correr los tests y verificar que pasan**

Run: `npx vitest run tests/db/schema.test.ts`
Expected: PASS, 3 tests.

Si el test de cascada falla con filas sobrantes, el `PRAGMA foreign_keys = ON`
no se está aplicando.

- [ ] **Step 7: Escribir el seam de autenticación**

`lib/auth/context.ts`:

```ts
/**
 * Seam para el login futuro. Hoy la app es de un solo usuario local.
 * Cuando entre el login, esta función lee la cookie de sesión y se agrega
 * `owner_id` a `deck` y `session`. Ninguna pantalla cambia de forma.
 */
export type AuthContext = { userId: number | null };

export function getAuthContext(): AuthContext {
  return { userId: null };
}
```

> El spec dice que los services reciben este contexto como primer parámetro.
> Mientras `userId` sea siempre `null`, pasarlo a cada función es ceremonia sin
> efecto, así que los services toman `db` y nada más. El día que entre el login,
> el cambio es agregar el parámetro en un solo lugar por service y filtrar por
> `owner_id`; la firma de las pantallas no se toca.

- [ ] **Step 8: Commit**

```bash
echo -e "\n*.db\n*.db-wal\n*.db-shm" >> .gitignore
git add -A
git commit -m "feat: esquema de base de datos con Drizzle y cliente SQLite"
```

---

### Task 3: Datos de kana

**Files:**
- Create: `lib/kana/tables.ts`
- Create: `tests/kana/tables.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  ```ts
  export type KanaCard = { prompt: string; romaji: string[] };  // romaji[0] es la primaria
  export type KanaGroup = { name: string; section: string; cards: KanaCard[] };
  export const HIRAGANA: KanaGroup[];
  export const KATAKANA: KanaGroup[];
  ```
  Las tareas 4 (transliterador) y 6 (seed) consumen estas constantes.

- [ ] **Step 1: Escribir el test que falla**

`tests/kana/tables.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { HIRAGANA, KATAKANA, type KanaGroup } from '../../lib/kana/tables';

const cards = (gs: KanaGroup[]) => gs.reduce((n, g) => n + g.cards.length, 0);
const inSection = (gs: KanaGroup[], s: string) => gs.filter((g) => g.section === s);

describe('hiragana', () => {
  it('tiene 26 grupos y 104 cartas', () => {
    expect(HIRAGANA).toHaveLength(26);
    expect(cards(HIRAGANA)).toBe(104);
  });

  it('se reparte en 10 básicos (46), 5 dakuten (25) y 11 contracciones (33)', () => {
    expect(inSection(HIRAGANA, 'Básicos')).toHaveLength(10);
    expect(cards(inSection(HIRAGANA, 'Básicos'))).toBe(46);
    expect(inSection(HIRAGANA, 'Dakuten')).toHaveLength(5);
    expect(cards(inSection(HIRAGANA, 'Dakuten'))).toBe(25);
    expect(inSection(HIRAGANA, 'Contracciones')).toHaveLength(11);
    expect(cards(inSection(HIRAGANA, 'Contracciones'))).toBe(33);
  });

  it('trata きゃ como una sola carta', () => {
    const kya = HIRAGANA.find((g) => g.name === 'きゃ行')!;
    expect(kya.cards.map((c) => c.prompt)).toEqual(['きゃ', 'きゅ', 'きょ']);
    expect(kya.cards[0].romaji[0]).toBe('kya');
  });

  it('acepta Hepburn y Kunrei donde difieren', () => {
    const find = (p: string) =>
      HIRAGANA.flatMap((g) => g.cards).find((c) => c.prompt === p)!;
    expect(find('し').romaji).toEqual(['shi', 'si']);
    expect(find('つ').romaji).toEqual(['tsu', 'tu']);
    expect(find('ふ').romaji).toEqual(['fu', 'hu']);
    expect(find('を').romaji).toEqual(['wo', 'o']);
    expect(find('ん').romaji).toEqual(['n', 'nn']);
    expect(find('か').romaji).toEqual(['ka']); // sin alternativa
  });
});

describe('katakana', () => {
  it('tiene 33 grupos y 131 cartas', () => {
    expect(KATAKANA).toHaveLength(33);
    expect(cards(KATAKANA)).toBe(131);
  });

  it('incluye 7 grupos de extendidos con 27 cartas', () => {
    expect(inSection(KATAKANA, 'Extendidos')).toHaveLength(7);
    expect(cards(inSection(KATAKANA, 'Extendidos'))).toBe(27);
  });

  it('no incluye la marca de vocal larga como carta', () => {
    expect(KATAKANA.flatMap((g) => g.cards).some((c) => c.prompt === 'ー')).toBe(false);
  });
});

describe('ambos silabarios', () => {
  it('no repite prompts dentro del mismo silabario', () => {
    for (const set of [HIRAGANA, KATAKANA]) {
      const prompts = set.flatMap((g) => g.cards).map((c) => c.prompt);
      expect(new Set(prompts).size).toBe(prompts.length);
    }
  });

  it('toda carta tiene al menos una romanización, la primera es la primaria', () => {
    for (const c of [...HIRAGANA, ...KATAKANA].flatMap((g) => g.cards)) {
      expect(c.romaji.length).toBeGreaterThan(0);
      expect(c.romaji[0]).toMatch(/^[a-z]+$/);
    }
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run tests/kana/tables.test.ts`
Expected: FAIL — `Cannot find module '../../lib/kana/tables'`

- [ ] **Step 3: Escribir los datos**

`lib/kana/tables.ts`:

```ts
export type KanaCard = { prompt: string; romaji: string[] };
export type KanaGroup = { name: string; section: string; cards: KanaCard[] };

/** Atajo: una carta con una sola romanización. */
const c = (prompt: string, romaji: string): KanaCard => ({ prompt, romaji: [romaji] });
/** Atajo: una carta con romanizaciones alternativas aceptadas. */
const m = (prompt: string, ...romaji: string[]): KanaCard => ({ prompt, romaji });

const g = (name: string, section: string, cards: KanaCard[]): KanaGroup => ({ name, section, cards });

export const HIRAGANA: KanaGroup[] = [
  g('あ行', 'Básicos', [c('あ','a'), c('い','i'), c('う','u'), c('え','e'), c('お','o')]),
  g('か行', 'Básicos', [c('か','ka'), c('き','ki'), c('く','ku'), c('け','ke'), c('こ','ko')]),
  g('さ行', 'Básicos', [c('さ','sa'), m('し','shi','si'), c('す','su'), c('せ','se'), c('そ','so')]),
  g('た行', 'Básicos', [c('た','ta'), m('ち','chi','ti'), m('つ','tsu','tu'), c('て','te'), c('と','to')]),
  g('な行', 'Básicos', [c('な','na'), c('に','ni'), c('ぬ','nu'), c('ね','ne'), c('の','no')]),
  g('は行', 'Básicos', [c('は','ha'), c('ひ','hi'), m('ふ','fu','hu'), c('へ','he'), c('ほ','ho')]),
  g('ま行', 'Básicos', [c('ま','ma'), c('み','mi'), c('む','mu'), c('め','me'), c('も','mo')]),
  g('や行', 'Básicos', [c('や','ya'), c('ゆ','yu'), c('よ','yo')]),
  g('ら行', 'Básicos', [c('ら','ra'), c('り','ri'), c('る','ru'), c('れ','re'), c('ろ','ro')]),
  g('わ行', 'Básicos', [c('わ','wa'), m('を','wo','o'), m('ん','n','nn')]),

  g('が行', 'Dakuten', [c('が','ga'), c('ぎ','gi'), c('ぐ','gu'), c('げ','ge'), c('ご','go')]),
  g('ざ行', 'Dakuten', [c('ざ','za'), m('じ','ji','zi'), c('ず','zu'), c('ぜ','ze'), c('ぞ','zo')]),
  g('だ行', 'Dakuten', [c('だ','da'), m('ぢ','ji','di','zi'), m('づ','zu','du'), c('で','de'), c('ど','do')]),
  g('ば行', 'Dakuten', [c('ば','ba'), c('び','bi'), c('ぶ','bu'), c('べ','be'), c('ぼ','bo')]),
  g('ぱ行', 'Dakuten', [c('ぱ','pa'), c('ぴ','pi'), c('ぷ','pu'), c('ぺ','pe'), c('ぽ','po')]),

  g('きゃ行', 'Contracciones', [c('きゃ','kya'), c('きゅ','kyu'), c('きょ','kyo')]),
  g('しゃ行', 'Contracciones', [m('しゃ','sha','sya'), m('しゅ','shu','syu'), m('しょ','sho','syo')]),
  g('ちゃ行', 'Contracciones', [m('ちゃ','cha','tya'), m('ちゅ','chu','tyu'), m('ちょ','cho','tyo')]),
  g('にゃ行', 'Contracciones', [c('にゃ','nya'), c('にゅ','nyu'), c('にょ','nyo')]),
  g('ひゃ行', 'Contracciones', [c('ひゃ','hya'), c('ひゅ','hyu'), c('ひょ','hyo')]),
  g('みゃ行', 'Contracciones', [c('みゃ','mya'), c('みゅ','myu'), c('みょ','myo')]),
  g('りゃ行', 'Contracciones', [c('りゃ','rya'), c('りゅ','ryu'), c('りょ','ryo')]),
  g('ぎゃ行', 'Contracciones', [c('ぎゃ','gya'), c('ぎゅ','gyu'), c('ぎょ','gyo')]),
  g('じゃ行', 'Contracciones', [m('じゃ','ja','zya','jya'), m('じゅ','ju','zyu','jyu'), m('じょ','jo','zyo','jyo')]),
  g('びゃ行', 'Contracciones', [c('びゃ','bya'), c('びゅ','byu'), c('びょ','byo')]),
  g('ぴゃ行', 'Contracciones', [c('ぴゃ','pya'), c('ぴゅ','pyu'), c('ぴょ','pyo')]),
];

export const KATAKANA: KanaGroup[] = [
  g('ア行', 'Básicos', [c('ア','a'), c('イ','i'), c('ウ','u'), c('エ','e'), c('オ','o')]),
  g('カ行', 'Básicos', [c('カ','ka'), c('キ','ki'), c('ク','ku'), c('ケ','ke'), c('コ','ko')]),
  g('サ行', 'Básicos', [c('サ','sa'), m('シ','shi','si'), c('ス','su'), c('セ','se'), c('ソ','so')]),
  g('タ行', 'Básicos', [c('タ','ta'), m('チ','chi','ti'), m('ツ','tsu','tu'), c('テ','te'), c('ト','to')]),
  g('ナ行', 'Básicos', [c('ナ','na'), c('ニ','ni'), c('ヌ','nu'), c('ネ','ne'), c('ノ','no')]),
  g('ハ行', 'Básicos', [c('ハ','ha'), c('ヒ','hi'), m('フ','fu','hu'), c('ヘ','he'), c('ホ','ho')]),
  g('マ行', 'Básicos', [c('マ','ma'), c('ミ','mi'), c('ム','mu'), c('メ','me'), c('モ','mo')]),
  g('ヤ行', 'Básicos', [c('ヤ','ya'), c('ユ','yu'), c('ヨ','yo')]),
  g('ラ行', 'Básicos', [c('ラ','ra'), c('リ','ri'), c('ル','ru'), c('レ','re'), c('ロ','ro')]),
  g('ワ行', 'Básicos', [c('ワ','wa'), m('ヲ','wo','o'), m('ン','n','nn')]),

  g('ガ行', 'Dakuten', [c('ガ','ga'), c('ギ','gi'), c('グ','gu'), c('ゲ','ge'), c('ゴ','go')]),
  g('ザ行', 'Dakuten', [c('ザ','za'), m('ジ','ji','zi'), c('ズ','zu'), c('ゼ','ze'), c('ゾ','zo')]),
  g('ダ行', 'Dakuten', [c('ダ','da'), m('ヂ','ji','di','zi'), m('ヅ','zu','du'), c('デ','de'), c('ド','do')]),
  g('バ行', 'Dakuten', [c('バ','ba'), c('ビ','bi'), c('ブ','bu'), c('ベ','be'), c('ボ','bo')]),
  g('パ行', 'Dakuten', [c('パ','pa'), c('ピ','pi'), c('プ','pu'), c('ペ','pe'), c('ポ','po')]),

  g('キャ行', 'Contracciones', [c('キャ','kya'), c('キュ','kyu'), c('キョ','kyo')]),
  g('シャ行', 'Contracciones', [m('シャ','sha','sya'), m('シュ','shu','syu'), m('ショ','sho','syo')]),
  g('チャ行', 'Contracciones', [m('チャ','cha','tya'), m('チュ','chu','tyu'), m('チョ','cho','tyo')]),
  g('ニャ行', 'Contracciones', [c('ニャ','nya'), c('ニュ','nyu'), c('ニョ','nyo')]),
  g('ヒャ行', 'Contracciones', [c('ヒャ','hya'), c('ヒュ','hyu'), c('ヒョ','hyo')]),
  g('ミャ行', 'Contracciones', [c('ミャ','mya'), c('ミュ','myu'), c('ミョ','myo')]),
  g('リャ行', 'Contracciones', [c('リャ','rya'), c('リュ','ryu'), c('リョ','ryo')]),
  g('ギャ行', 'Contracciones', [c('ギャ','gya'), c('ギュ','gyu'), c('ギョ','gyo')]),
  g('ジャ行', 'Contracciones', [m('ジャ','ja','zya','jya'), m('ジュ','ju','zyu','jyu'), m('ジョ','jo','zyo','jyo')]),
  g('ビャ行', 'Contracciones', [c('ビャ','bya'), c('ビュ','byu'), c('ビョ','byo')]),
  g('ピャ行', 'Contracciones', [c('ピャ','pya'), c('ピュ','pyu'), c('ピョ','pyo')]),

  // Préstamos del inglés y otros idiomas. No existen en hiragana.
  g('ファ行', 'Extendidos', [c('ファ','fa'), c('フィ','fi'), c('フェ','fe'), c('フォ','fo')]),
  g('ヴァ行', 'Extendidos', [c('ヴァ','va'), c('ヴィ','vi'), c('ヴ','vu'), c('ヴェ','ve'), c('ヴォ','vo')]),
  g('ティ行', 'Extendidos', [c('ティ','ti'), c('トゥ','tu'), c('ディ','di'), c('ドゥ','du')]),
  g('ウィ行', 'Extendidos', [c('ウィ','wi'), c('ウェ','we'), c('ウォ','wo')]),
  g('シェ行', 'Extendidos', [c('シェ','she'), c('ジェ','je'), c('チェ','che')]),
  g('ツァ行', 'Extendidos', [c('ツァ','tsa'), c('ツィ','tsi'), c('ツェ','tse'), c('ツォ','tso')]),
  g('クァ行', 'Extendidos', [c('クァ','kwa'), c('クィ','kwi'), c('クェ','kwe'), c('クォ','kwo')]),
];
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `npx vitest run tests/kana/tables.test.ts`
Expected: PASS, 8 tests.

Ojo con dos trampas si algún conteo no da: `ヲ` y `ン` van en ワ行 (3 cartas,
no 5), y `ヴ` solo está en ヴァ行 (5 cartas, no 4).

- [ ] **Step 5: Commit**

```bash
git add lib/kana/tables.ts tests/kana/tables.test.ts
git commit -m "feat: tablas de hiragana y katakana con romanizaciones alternativas"
```

---

### Task 4: Transliterador kana → romaji

**Files:**
- Create: `lib/kana/transliterate.ts`
- Create: `tests/kana/transliterate.test.ts`

**Interfaces:**
- Consumes: `HIRAGANA`, `KATAKANA` de `lib/kana/tables.ts` (Task 3).
- Produces: `export function toRomaji(kana: string): string`. Lo usan la Task 14
  (autocompletado del editor) y la Task 16 (romaji del diccionario).

Por qué existe: JMdict no trae romaji, trae la lectura en kana. Y en el editor,
escribir el romaji a mano para cada palabra es fricción evitable.

- [ ] **Step 1: Escribir el test que falla**

`tests/kana/transliterate.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { toRomaji } from '../../lib/kana/transliterate';

describe('toRomaji', () => {
  it('transcribe kana simple', () => {
    expect(toRomaji('さかな')).toBe('sakana');
    expect(toRomaji('ねこ')).toBe('neko');
    expect(toRomaji('カメラ')).toBe('kamera');
  });

  it('prioriza la contracción sobre el carácter suelto', () => {
    // Si leyera de a un carácter, きゃ saldría "kiya".
    expect(toRomaji('きゃく')).toBe('kyaku');
    expect(toRomaji('しょうゆ')).toBe('shouyu');
  });

  it('duplica la consonante siguiente con el sokuon', () => {
    expect(toRomaji('がっこう')).toBe('gakkou');
    expect(toRomaji('きって')).toBe('kitte');
    expect(toRomaji('ざっし')).toBe('zasshi');
  });

  it('repite la vocal anterior con la marca de vocal larga', () => {
    expect(toRomaji('スーパー')).toBe('suupaa');
    expect(toRomaji('コーヒー')).toBe('koohii');
  });

  it('maneja los extendidos de katakana', () => {
    expect(toRomaji('ファイル')).toBe('fairu');
    expect(toRomaji('チェック')).toBe('chekku');
  });

  it('deja intacto lo que no sabe transcribir', () => {
    // Kanji y latino pasan sin tocar; el usuario corrige a mano.
    expect(toRomaji('魚')).toBe('魚');
    expect(toRomaji('')).toBe('');
  });

  it('ignora un sokuon al final, que no tiene consonante que duplicar', () => {
    expect(toRomaji('あっ')).toBe('a');
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run tests/kana/transliterate.test.ts`
Expected: FAIL — `Cannot find module '../../lib/kana/transliterate'`

- [ ] **Step 3: Escribir el transliterador**

`lib/kana/transliterate.ts`:

```ts
import { HIRAGANA, KATAKANA } from './tables';

// Mapa prompt → romaji primario, construido desde las tablas para que no haya
// dos fuentes de verdad que se desincronicen.
const MAP: Record<string, string> = {};
for (const group of [...HIRAGANA, ...KATAKANA]) {
  for (const card of group.cards) MAP[card.prompt] = card.romaji[0];
}

const SOKUON = new Set(['っ', 'ッ']);
const CHOONPU = 'ー';
const VOWELS = new Set(['a', 'i', 'u', 'e', 'o']);

/**
 * Transcribe kana a romaji Hepburn.
 * Los tres casos que no se resuelven carácter por carácter:
 *  - contracciones (きゃ): hay que mirar dos caracteres antes que uno
 *  - sokuon (っ): duplica la consonante inicial de la sílaba siguiente
 *  - chōonpu (ー): repite la última vocal emitida
 * Lo que no reconoce lo deja tal cual; el campo es editable en la UI.
 */
export function toRomaji(kana: string): string {
  const chars = [...kana];
  let out = '';
  let i = 0;

  while (i < chars.length) {
    const ch = chars[i];

    if (SOKUON.has(ch)) {
      // Mirar la sílaba siguiente para saber qué consonante duplicar.
      const next = MAP[chars.slice(i + 1, i + 3).join('')] ?? MAP[chars[i + 1] ?? ''];
      if (next && !VOWELS.has(next[0])) out += next[0];
      i += 1;
      continue;
    }

    if (ch === CHOONPU) {
      const last = out.at(-1);
      if (last && VOWELS.has(last)) out += last;
      i += 1;
      continue;
    }

    // Dos caracteres primero: きゃ tiene que ganarle a き.
    const pair = chars.slice(i, i + 2).join('');
    if (pair.length === 2 && MAP[pair]) {
      out += MAP[pair];
      i += 2;
      continue;
    }

    if (MAP[ch]) {
      out += MAP[ch];
      i += 1;
      continue;
    }

    out += ch; // kanji, latino, puntuación
    i += 1;
  }

  return out;
}
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `npx vitest run tests/kana/transliterate.test.ts`
Expected: PASS, 7 tests.

Si `ざっし` devuelve `zassi` en vez de `zasshi`, revisar que se esté tomando
`romaji[0]` (Hepburn) y no otra alternativa.

- [ ] **Step 5: Commit**

```bash
git add lib/kana/transliterate.ts tests/kana/transliterate.test.ts
git commit -m "feat: transliterador de kana a romaji con sokuon y vocal larga"
```

---

### Task 5: Normalización y validación de respuestas

**Files:**
- Create: `lib/kana/normalize.ts`
- Create: `tests/kana/normalize.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  ```ts
  export function normalizeAnswer(raw: string): string;
  export function matchesAnswer(typed: string, accepted: string[]): boolean;
  ```
  Los consume el motor del quiz (Task 6) y el seed (Task 7).

- [ ] **Step 1: Escribir el test que falla**

`tests/kana/normalize.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { normalizeAnswer, matchesAnswer } from '../../lib/kana/normalize';

describe('normalizeAnswer', () => {
  it('pasa a minúsculas y recorta', () => {
    expect(normalizeAnswer('  KA  ')).toBe('ka');
    expect(normalizeAnswer('Shi')).toBe('shi');
  });

  it('colapsa espacios internos', () => {
    expect(normalizeAnswer('kon  nichi   wa')).toBe('kon nichi wa');
  });

  it('normaliza a NFC', () => {
    // "ā" compuesta y descompuesta tienen que dar lo mismo.
    expect(normalizeAnswer('ā')).toBe(normalizeAnswer('ā'));
  });
});

describe('matchesAnswer', () => {
  it('acepta la primaria y las alternativas por igual', () => {
    expect(matchesAnswer('shi', ['shi', 'si'])).toBe(true);
    expect(matchesAnswer('si', ['shi', 'si'])).toBe(true);
  });

  it('ignora mayúsculas y espacios de más', () => {
    expect(matchesAnswer('  SHI ', ['shi', 'si'])).toBe(true);
  });

  it('rechaza lo que no está en la lista', () => {
    expect(matchesAnswer('ma', ['ne'])).toBe(false);
  });

  it('rechaza la cadena vacía', () => {
    // Apretar Enter sin escribir nada no puede contar como acierto.
    expect(matchesAnswer('', ['ka'])).toBe(false);
    expect(matchesAnswer('   ', ['ka'])).toBe(false);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run tests/kana/normalize.test.ts`
Expected: FAIL — `Cannot find module '../../lib/kana/normalize'`

- [ ] **Step 3: Escribir la implementación**

`lib/kana/normalize.ts`:

```ts
/**
 * Deja una respuesta en forma canónica para poder compararla. Se aplica a los
 * dos lados: a lo que escribe el usuario y a lo guardado en card_answer.
 */
export function normalizeAnswer(raw: string): string {
  return raw.normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Una respuesta es correcta si coincide con CUALQUIERA de las romanizaciones
 * aceptadas. `is_primary` no participa: solo decide qué se muestra al revelar.
 */
export function matchesAnswer(typed: string, accepted: string[]): boolean {
  const n = normalizeAnswer(typed);
  if (n.length === 0) return false;
  return accepted.some((a) => normalizeAnswer(a) === n);
}
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `npx vitest run tests/kana/normalize.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/kana/normalize.ts tests/kana/normalize.test.ts
git commit -m "feat: normalización y validación de respuestas en romaji"
```

---

### Task 6: Motor del quiz

**Files:**
- Create: `lib/quiz/engine.ts`
- Create: `tests/quiz/engine.test.ts`

**Interfaces:**
- Consumes: `matchesAnswer` de `lib/kana/normalize.ts` (Task 5).
- Produces:
  ```ts
  export type QuizCard = {
    id: number; prompt: string; meaning: string | null;
    answers: string[]; primary: string;
  };
  export type RoundState = {
    queue: QuizCard[]; correct: number; incorrect: number; revealedCurrent: boolean;
  };
  export function shuffle<T>(items: T[], rng?: () => number): T[];
  export function startRound(cards: QuizCard[], rng?: () => number): RoundState;
  export function currentCard(state: RoundState): QuizCard | null;
  export function submit(state: RoundState, typed: string):
    { state: RoundState; outcome: 'correct' | 'incorrect' };
  export function reveal(state: RoundState): { state: RoundState; answer: string };
  export function isFinished(state: RoundState): boolean;
  export function accuracy(state: RoundState): number;
  ```
  Lo consume `components/quiz/QuizRunner.tsx` (Task 12).

Es la lógica con más riesgo de la app. Vive fuera de React para poder testearla
sin montar nada.

- [ ] **Step 1: Escribir el test que falla**

`tests/quiz/engine.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  startRound, submit, reveal, currentCard, isFinished, accuracy, shuffle,
  type QuizCard,
} from '../../lib/quiz/engine';

const card = (id: number, prompt: string, ...answers: string[]): QuizCard => ({
  id, prompt, meaning: null, answers, primary: answers[0],
});

const DECK = [card(1, 'か', 'ka'), card(2, 'し', 'shi', 'si'), card(3, 'ね', 'ne')];

/** RNG determinístico para que el barajado sea reproducible. */
const seeded = (seed: number) => () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};

describe('shuffle', () => {
  it('conserva todos los elementos', () => {
    const out = shuffle(DECK, seeded(1));
    expect(out).toHaveLength(3);
    expect(out.map((c) => c.id).sort()).toEqual([1, 2, 3]);
  });

  it('no muta el array original', () => {
    const original = [...DECK];
    shuffle(DECK, seeded(7));
    expect(DECK).toEqual(original);
  });
});

describe('ronda', () => {
  it('arranca con todas las cartas y los contadores en cero', () => {
    const s = startRound(DECK, seeded(1));
    expect(s.queue).toHaveLength(3);
    expect(s.correct).toBe(0);
    expect(s.incorrect).toBe(0);
    expect(isFinished(s)).toBe(false);
  });

  it('al acertar saca la carta y avanza', () => {
    const s = startRound([card(1, 'か', 'ka')], seeded(1));
    const r = submit(s, 'ka');
    expect(r.outcome).toBe('correct');
    expect(r.state.correct).toBe(1);
    expect(r.state.queue).toHaveLength(0);
    expect(isFinished(r.state)).toBe(true);
  });

  it('al errar deja la carta en su lugar y no la re-encola', () => {
    const s = startRound(DECK, seeded(1));
    const first = currentCard(s)!;
    const r = submit(s, 'zzz');

    expect(r.outcome).toBe('incorrect');
    expect(r.state.incorrect).toBe(1);
    expect(r.state.queue).toHaveLength(3);
    // La MISMA carta sigue al frente: no avanza hasta acertarla.
    expect(currentCard(r.state)!.id).toBe(first.id);
  });

  it('acepta cualquiera de las romanizaciones', () => {
    const s = startRound([card(2, 'し', 'shi', 'si')], seeded(1));
    expect(submit(s, 'si').outcome).toBe('correct');
    expect(submit(s, 'shi').outcome).toBe('correct');
  });

  it('revelar cuenta como error y deja la carta', () => {
    const s = startRound([card(1, 'か', 'ka')], seeded(1));
    const r = reveal(s);
    expect(r.answer).toBe('ka');
    expect(r.state.incorrect).toBe(1);
    expect(r.state.revealedCurrent).toBe(true);
    expect(r.state.queue).toHaveLength(1);
  });

  it('limpia la marca de revelado al pasar de carta', () => {
    let s = startRound([card(1, 'か', 'ka'), card(3, 'ね', 'ne')], seeded(1));
    s = reveal(s).state;
    expect(s.revealedCurrent).toBe(true);
    s = submit(s, currentCard(s)!.primary).state;
    expect(s.revealedCurrent).toBe(false);
  });

  it('una ronda entera termina en cero restantes', () => {
    let s = startRound(DECK, seeded(1));
    while (!isFinished(s)) s = submit(s, currentCard(s)!.primary).state;
    expect(s.correct).toBe(3);
    expect(s.queue).toHaveLength(0);
  });

  it('calcula accuracy sobre intentos, no sobre cartas', () => {
    let s = startRound([card(1, 'か', 'ka')], seeded(1));
    s = submit(s, 'zzz').state;   // 1 error
    s = submit(s, 'ka').state;    // 1 acierto
    expect(accuracy(s)).toBeCloseTo(0.5);
  });

  it('accuracy es 1 antes del primer intento, no NaN', () => {
    expect(accuracy(startRound(DECK, seeded(1)))).toBe(1);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run tests/quiz/engine.test.ts`
Expected: FAIL — `Cannot find module '../../lib/quiz/engine'`

- [ ] **Step 3: Escribir el motor**

`lib/quiz/engine.ts`:

```ts
import { matchesAnswer } from '../kana/normalize';

export type QuizCard = {
  id: number;
  prompt: string;
  meaning: string | null;
  answers: string[];
  primary: string;
};

export type RoundState = {
  /** Cartas que faltan. La actual es queue[0]. */
  queue: QuizCard[];
  correct: number;
  incorrect: number;
  /** Si se reveló la carta actual, para no premiar el acierto posterior. */
  revealedCurrent: boolean;
};

/** Fisher-Yates. El rng es inyectable para que los tests sean reproducibles. */
export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function startRound(cards: QuizCard[], rng: () => number = Math.random): RoundState {
  return { queue: shuffle(cards, rng), correct: 0, incorrect: 0, revealedCurrent: false };
}

export function currentCard(state: RoundState): QuizCard | null {
  return state.queue[0] ?? null;
}

export function isFinished(state: RoundState): boolean {
  return state.queue.length === 0;
}

/** Aciertos sobre intentos totales. 1 cuando todavía no hubo ninguno. */
export function accuracy(state: RoundState): number {
  const total = state.correct + state.incorrect;
  return total === 0 ? 1 : state.correct / total;
}

export function submit(
  state: RoundState,
  typed: string,
): { state: RoundState; outcome: 'correct' | 'incorrect' } {
  const card = currentCard(state);
  if (!card) return { state, outcome: 'incorrect' };

  if (!matchesAnswer(typed, card.answers)) {
    // La carta NO se re-encola: se queda al frente hasta que se acierte.
    return { state: { ...state, incorrect: state.incorrect + 1 }, outcome: 'incorrect' };
  }

  return {
    state: {
      queue: state.queue.slice(1),
      correct: state.correct + 1,
      incorrect: state.incorrect,
      revealedCurrent: false,
    },
    outcome: 'correct',
  };
}

/** Revelar cuenta como error: si no, la métrica mentiría. */
export function reveal(state: RoundState): { state: RoundState; answer: string } {
  const card = currentCard(state);
  if (!card) return { state, answer: '' };
  return {
    state: { ...state, incorrect: state.incorrect + 1, revealedCurrent: true },
    answer: card.primary,
  };
}
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `npx vitest run tests/quiz/engine.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Correr toda la suite**

Run: `npm test`
Expected: PASS — tema, esquema, tablas, transliterador, normalización y motor.

- [ ] **Step 6: Commit**

```bash
git add lib/quiz tests/quiz
git commit -m "feat: motor de ronda del quiz con cola, revelado y accuracy"
```

---

### Task 7: Seed de los mazos de kana

**Files:**
- Create: `lib/db/seed.ts`, `scripts/seed.ts`
- Create: `tests/db/seed.test.ts`

**Interfaces:**
- Consumes: `HIRAGANA`, `KATAKANA` (Task 3); `normalizeAnswer` (Task 5); esquema y `createDb`/`migrate` (Task 2).
- Produces: `export function seedKana(db: Db): void`. Idempotente: se puede correr mil veces.

- [ ] **Step 1: Escribir el test que falla**

`tests/db/seed.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { eq, and } from 'drizzle-orm';
import { createDb, migrate, type Db } from '../../lib/db/client';
import { seedKana } from '../../lib/db/seed';
import { deck, cardGroup, card, cardAnswer } from '../../lib/db/schema';

let db: Db;
beforeEach(() => {
  db = createDb(':memory:');
  migrate(db);
});

const deckByName = (name: string) => db.select().from(deck).where(eq(deck.name, name)).all()[0];
const groupsOf = (deckId: number) =>
  db.select().from(cardGroup).where(eq(cardGroup.deckId, deckId)).all();

describe('seedKana', () => {
  it('crea los dos mazos marcados como incluidos en la app', () => {
    seedKana(db);
    expect(deckByName('Hiragana').isBuiltin).toBe(true);
    expect(deckByName('Katakana').isBuiltin).toBe(true);
  });

  it('carga hiragana con 26 grupos y 104 cartas', () => {
    seedKana(db);
    const d = deckByName('Hiragana');
    const groups = groupsOf(d.id);
    expect(groups).toHaveLength(26);

    const ids = new Set(groups.map((g) => g.id));
    const cards = db.select().from(card).all().filter((c) => ids.has(c.groupId));
    expect(cards).toHaveLength(104);
  });

  it('carga katakana con 33 grupos y 131 cartas', () => {
    seedKana(db);
    const d = deckByName('Katakana');
    const groups = groupsOf(d.id);
    expect(groups).toHaveLength(33);

    const ids = new Set(groups.map((g) => g.id));
    const cards = db.select().from(card).all().filter((c) => ids.has(c.groupId));
    expect(cards).toHaveLength(131);
  });

  it('guarda la sección de cada grupo para los encabezados de la grilla', () => {
    seedKana(db);
    const groups = groupsOf(deckByName('Hiragana').id);
    expect(groups.find((g) => g.name === 'か行')!.section).toBe('Básicos');
    expect(groups.find((g) => g.name === 'が行')!.section).toBe('Dakuten');
    expect(groups.find((g) => g.name === 'きゃ行')!.section).toBe('Contracciones');
  });

  it('guarda las alternativas con una sola primaria por carta', () => {
    seedKana(db);
    const shi = db.select().from(card).where(eq(card.prompt, 'し')).all()[0];
    const answers = db.select().from(cardAnswer).where(eq(cardAnswer.cardId, shi.id)).all();

    expect(answers.map((a) => a.romaji).sort()).toEqual(['shi', 'si']);
    expect(answers.filter((a) => a.isPrimary)).toHaveLength(1);
    expect(answers.find((a) => a.isPrimary)!.romaji).toBe('shi');
  });

  it('respeta el orden de las cartas dentro del grupo', () => {
    seedKana(db);
    const ka = groupsOf(deckByName('Hiragana').id).find((g) => g.name === 'か行')!;
    const cards = db.select().from(card).where(eq(card.groupId, ka.id)).all()
      .sort((a, b) => a.sortOrder - b.sortOrder);
    expect(cards.map((c) => c.prompt)).toEqual(['か', 'き', 'く', 'け', 'こ']);
  });

  it('es idempotente: correrlo dos veces no duplica nada', () => {
    seedKana(db);
    seedKana(db);
    expect(db.select().from(deck).all()).toHaveLength(2);
    expect(db.select().from(cardGroup).all()).toHaveLength(26 + 33);
    expect(db.select().from(card).all()).toHaveLength(104 + 131);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run tests/db/seed.test.ts`
Expected: FAIL — `Cannot find module '../../lib/db/seed'`

- [ ] **Step 3: Escribir el seed**

`lib/db/seed.ts`:

```ts
import { eq } from 'drizzle-orm';
import type { Db } from './client';
import { deck, cardGroup, card, cardAnswer } from './schema';
import { HIRAGANA, KATAKANA, type KanaGroup } from '../kana/tables';
import { normalizeAnswer } from '../kana/normalize';

function seedDeck(db: Db, name: string, sortOrder: number, groups: KanaGroup[]) {
  // Idempotencia por nombre: si ya está, no se toca.
  const existing = db.select().from(deck).where(eq(deck.name, name)).all();
  if (existing.length > 0) return;

  const [d] = db
    .insert(deck)
    .values({ name, isBuiltin: true, sortOrder })
    .returning()
    .all();

  groups.forEach((g, gi) => {
    const [row] = db
      .insert(cardGroup)
      .values({ deckId: d.id, name: g.name, section: g.section, sortOrder: gi })
      .returning()
      .all();

    g.cards.forEach((c, ci) => {
      const [cardRow] = db
        .insert(card)
        .values({ groupId: row.id, prompt: c.prompt, meaning: null, sortOrder: ci })
        .returning()
        .all();

      // La primera romanización de la tabla es siempre la primaria (Hepburn).
      c.romaji.forEach((r, ri) => {
        db.insert(cardAnswer)
          .values({ cardId: cardRow.id, romaji: normalizeAnswer(r), isPrimary: ri === 0 })
          .run();
      });
    });
  });
}

/** Carga los mazos incluidos en la app. Seguro de correr varias veces. */
export function seedKana(db: Db): void {
  db.transaction((tx) => {
    seedDeck(tx as Db, 'Hiragana', 0, HIRAGANA);
    seedDeck(tx as Db, 'Katakana', 1, KATAKANA);
  });
}
```

`scripts/seed.ts`:

```ts
import { db, migrate } from '../lib/db/client';
import { seedKana } from '../lib/db/seed';

migrate(db);
seedKana(db);
console.log('mazos de kana cargados');
```

Agregar a `package.json`: `"db:seed": "tsx scripts/seed.ts"`

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `npx vitest run tests/db/seed.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Cargar la base de desarrollo**

Run: `npm run db:migrate && npm run db:seed`
Expected: `mazos de kana cargados`, y aparece `kana-drill.db` en la raíz.

- [ ] **Step 6: Commit**

```bash
git add lib/db/seed.ts scripts tests/db/seed.test.ts package.json
git commit -m "feat: seed idempotente de los mazos de hiragana y katakana"
```

---

### Task 8: Services de mazos, grupos y cartas

**Files:**
- Create: `lib/services/errors.ts`, `lib/services/decks.ts`
- Create: `tests/services/decks.test.ts`

**Interfaces:**
- Consumes: esquema y `Db` (Task 2); `AuthContext` (Task 2).
- Produces:
  ```ts
  // lib/services/errors.ts
  export class AppError extends Error { constructor(message: string, public status: number) }
  export const notFound  = (what: string) => new AppError(`${what} no encontrado`, 404);
  export const forbidden = (why: string)  => new AppError(why, 403);

  // lib/services/decks.ts
  export type GroupSummary = {
    id: number; name: string; section: string | null;
    sortOrder: number; cardCount: number; preview: string[];
  };
  export type DeckSummary = {
    id: number; name: string; isBuiltin: boolean;
    groupCount: number; cardCount: number; groups: GroupSummary[];
  };
  export function listDecks(db: Db): DeckSummary[];
  export function getDeck(db: Db, id: number): DeckSummary;
  export function createDeck(db: Db, input: { name: string; groups?: string[] }): DeckSummary;
  export function renameDeck(db: Db, id: number, name: string): void;
  export function deleteDeck(db: Db, id: number): void;
  export function createGroup(db: Db, deckId: number, name: string): GroupSummary;
  export function renameGroup(db: Db, id: number, name: string): void;
  export function deleteGroup(db: Db, id: number): void;
  export function createCard(db: Db, groupId: number,
    input: { prompt: string; meaning?: string | null; answers: string[] }): { id: number };
  export function updateCard(db: Db, id: number,
    input: { prompt?: string; meaning?: string | null; answers?: string[]; groupId?: number }): void;
  export function deleteCard(db: Db, id: number): void;
  ```
  Los consumen la capa de API (Task 9) y las páginas 01, 04 y 05.

**`preview`** implementa la regla de las seis cartas: trae los prompts solo si el
grupo tiene 6 cartas o menos; si tiene más, viene vacío y la UI muestra el conteo.

- [ ] **Step 1: Escribir el test que falla**

`tests/services/decks.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createDb, migrate, type Db } from '../../lib/db/client';
import { seedKana } from '../../lib/db/seed';
import {
  listDecks, getDeck, createDeck, renameDeck, deleteDeck,
  createGroup, deleteGroup, createCard, updateCard, deleteCard,
} from '../../lib/services/decks';
import { AppError } from '../../lib/services/errors';

let db: Db;
beforeEach(() => {
  db = createDb(':memory:');
  migrate(db);
  seedKana(db);
});

describe('listDecks', () => {
  it('devuelve los mazos incluidos con sus conteos', () => {
    const decks = listDecks(db);
    const hira = decks.find((d) => d.name === 'Hiragana')!;
    expect(hira.isBuiltin).toBe(true);
    expect(hira.groupCount).toBe(26);
    expect(hira.cardCount).toBe(104);
  });

  it('previsualiza los grupos de 6 cartas o menos y deja vacío el resto', () => {
    const hira = listDecks(db).find((d) => d.name === 'Hiragana')!;
    // か行 tiene 5 cartas: se previsualiza.
    expect(hira.groups.find((g) => g.name === 'か行')!.preview)
      .toEqual(['か', 'き', 'く', 'け', 'こ']);
  });
});

describe('createDeck', () => {
  it('crea el mazo con los grupos que se le pasan', () => {
    const d = createDeck(db, { name: 'Comidas', groups: ['Pescado', 'Verdura', 'Frutas'] });
    expect(d.name).toBe('Comidas');
    expect(d.isBuiltin).toBe(false);
    expect(d.groups.map((g) => g.name)).toEqual(['Pescado', 'Verdura', 'Frutas']);
  });

  it('sin grupos crea uno llamado General, para que la carta siempre tenga padre', () => {
    const d = createDeck(db, { name: 'N5' });
    expect(d.groups).toHaveLength(1);
    expect(d.groups[0].name).toBe('General');
  });

  it('deja la sección en null: los mazos propios no tienen encabezados', () => {
    const d = createDeck(db, { name: 'Comidas', groups: ['Pescado'] });
    expect(d.groups[0].section).toBeNull();
  });
});

describe('deleteDeck', () => {
  it('borra un mazo propio y todo lo que cuelga', () => {
    const d = createDeck(db, { name: 'Comidas', groups: ['Pescado'] });
    createCard(db, d.groups[0].id, { prompt: 'さかな', meaning: 'pescado', answers: ['sakana'] });
    deleteDeck(db, d.id);
    expect(listDecks(db).find((x) => x.name === 'Comidas')).toBeUndefined();
  });

  it('se niega a borrar un mazo incluido en la app', () => {
    const hira = listDecks(db).find((d) => d.name === 'Hiragana')!;
    expect(() => deleteDeck(db, hira.id)).toThrow(AppError);
    try {
      deleteDeck(db, hira.id);
    } catch (e) {
      expect((e as AppError).status).toBe(403);
    }
  });
});

describe('cartas', () => {
  it('crea la carta con su romaji normalizado y una sola primaria', () => {
    const d = createDeck(db, { name: 'Comidas' });
    const { id } = createCard(db, d.groups[0].id, {
      prompt: 'さかな', meaning: 'pescado', answers: ['  SAKANA  '],
    });
    const deck = getDeck(db, d.id);
    expect(deck.cardCount).toBe(1);
    expect(id).toBeGreaterThan(0);
  });

  it('acepta varias romanizaciones y la primera es la primaria', () => {
    const d = createDeck(db, { name: 'Prestamos' });
    const { id } = createCard(db, d.groups[0].id, {
      prompt: 'スーパー', meaning: 'supermercado', answers: ['suupaa', 'sūpā'],
    });
    updateCard(db, id, { meaning: 'súper' });
    expect(getDeck(db, d.id).cardCount).toBe(1);
  });

  it('mover una carta de grupo no la borra', () => {
    const d = createDeck(db, { name: 'Comidas', groups: ['Pescado', 'Verdura'] });
    const { id } = createCard(db, d.groups[1].id, { prompt: 'まぐろ', answers: ['maguro'] });
    updateCard(db, id, { groupId: d.groups[0].id });

    const after = getDeck(db, d.id);
    expect(after.groups.find((g) => g.name === 'Pescado')!.cardCount).toBe(1);
    expect(after.groups.find((g) => g.name === 'Verdura')!.cardCount).toBe(0);
  });

  it('borrar la carta se lleva sus respuestas', () => {
    const d = createDeck(db, { name: 'Comidas' });
    const { id } = createCard(db, d.groups[0].id, { prompt: 'えび', answers: ['ebi'] });
    deleteCard(db, id);
    expect(getDeck(db, d.id).cardCount).toBe(0);
  });
});

describe('grupos', () => {
  it('agrega un grupo a un mazo existente', () => {
    const d = createDeck(db, { name: 'Comidas', groups: ['Pescado'] });
    createGroup(db, d.id, 'Frutas');
    expect(getDeck(db, d.id).groups.map((g) => g.name)).toEqual(['Pescado', 'Frutas']);
  });

  it('borrar el grupo se lleva sus cartas', () => {
    const d = createDeck(db, { name: 'Comidas', groups: ['Pescado'] });
    createCard(db, d.groups[0].id, { prompt: 'さかな', answers: ['sakana'] });
    deleteGroup(db, d.groups[0].id);
    expect(getDeck(db, d.id).cardCount).toBe(0);
  });
});

describe('errores', () => {
  it('404 al pedir un mazo que no existe', () => {
    expect(() => getDeck(db, 9999)).toThrow(AppError);
  });

  it('404 al renombrar un mazo que no existe', () => {
    expect(() => renameDeck(db, 9999, 'x')).toThrow(AppError);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run tests/services/decks.test.ts`
Expected: FAIL — `Cannot find module '../../lib/services/decks'`

- [ ] **Step 3: Escribir los errores**

`lib/services/errors.ts`:

```ts
/** Error de dominio con el status HTTP que le corresponde. */
export class AppError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'AppError';
  }
}

export const notFound = (what: string) => new AppError(`${what} no encontrado`, 404);
export const forbidden = (why: string) => new AppError(why, 403);
export const badRequest = (why: string) => new AppError(why, 400);
```

- [ ] **Step 4: Escribir el service**

`lib/services/decks.ts`:

```ts
import { eq, inArray, asc } from 'drizzle-orm';
import type { Db } from '../db/client';
import { deck, cardGroup, card, cardAnswer } from '../db/schema';
import { normalizeAnswer } from '../kana/normalize';
import { notFound, forbidden, badRequest } from './errors';

/** Un grupo con 6 cartas o menos se previsualiza; con más, se muestra el conteo. */
const PREVIEW_LIMIT = 6;

export type GroupSummary = {
  id: number; name: string; section: string | null;
  sortOrder: number; cardCount: number; preview: string[];
};

export type DeckSummary = {
  id: number; name: string; isBuiltin: boolean;
  groupCount: number; cardCount: number; groups: GroupSummary[];
};

function buildSummaries(db: Db, deckRows: (typeof deck.$inferSelect)[]): DeckSummary[] {
  if (deckRows.length === 0) return [];
  const deckIds = deckRows.map((d) => d.id);

  const groups = db.select().from(cardGroup)
    .where(inArray(cardGroup.deckId, deckIds))
    .orderBy(asc(cardGroup.sortOrder)).all();

  const groupIds = groups.map((g) => g.id);
  const cards = groupIds.length
    ? db.select().from(card).where(inArray(card.groupId, groupIds))
        .orderBy(asc(card.sortOrder)).all()
    : [];

  const byGroup = new Map<number, typeof cards>();
  for (const c of cards) {
    const list = byGroup.get(c.groupId) ?? [];
    list.push(c);
    byGroup.set(c.groupId, list);
  }

  return deckRows.map((d) => {
    const own = groups.filter((g) => g.deckId === d.id).map<GroupSummary>((g) => {
      const list = byGroup.get(g.id) ?? [];
      return {
        id: g.id, name: g.name, section: g.section, sortOrder: g.sortOrder,
        cardCount: list.length,
        preview: list.length <= PREVIEW_LIMIT ? list.map((c) => c.prompt) : [],
      };
    });
    return {
      id: d.id, name: d.name, isBuiltin: d.isBuiltin,
      groupCount: own.length,
      cardCount: own.reduce((n, g) => n + g.cardCount, 0),
      groups: own,
    };
  });
}

export function listDecks(db: Db): DeckSummary[] {
  return buildSummaries(db, db.select().from(deck).orderBy(asc(deck.sortOrder)).all());
}

export function getDeck(db: Db, id: number): DeckSummary {
  const rows = db.select().from(deck).where(eq(deck.id, id)).all();
  if (rows.length === 0) throw notFound('El mazo');
  return buildSummaries(db, rows)[0];
}

export function createDeck(db: Db, input: { name: string; groups?: string[] }): DeckSummary {
  const name = input.name.trim();
  if (!name) throw badRequest('El mazo necesita un nombre');

  // Una carta siempre cuelga de un grupo. Si no se pasa ninguno, se crea uno
  // solo llamado General y la UI esconde el nivel de grupos.
  const names = (input.groups ?? []).map((g) => g.trim()).filter(Boolean);
  const groupNames = names.length > 0 ? names : ['General'];

  let newId = 0;
  db.transaction((tx) => {
    const t = tx as Db;
    const max = t.select().from(deck).all().reduce((n, d) => Math.max(n, d.sortOrder), -1);
    const [d] = t.insert(deck).values({ name, isBuiltin: false, sortOrder: max + 1 })
      .returning().all();
    newId = d.id;
    groupNames.forEach((n, i) => {
      // section queda null: los mazos propios no tienen encabezados de grilla.
      t.insert(cardGroup).values({ deckId: d.id, name: n, section: null, sortOrder: i }).run();
    });
  });

  return getDeck(db, newId);
}

export function renameDeck(db: Db, id: number, name: string): void {
  const trimmed = name.trim();
  if (!trimmed) throw badRequest('El mazo necesita un nombre');
  const res = db.update(deck).set({ name: trimmed }).where(eq(deck.id, id)).run();
  if (res.changes === 0) throw notFound('El mazo');
}

export function deleteDeck(db: Db, id: number): void {
  const rows = db.select().from(deck).where(eq(deck.id, id)).all();
  if (rows.length === 0) throw notFound('El mazo');
  if (rows[0].isBuiltin) {
    throw forbidden('Hiragana y Katakana vienen con la app y no se pueden borrar');
  }
  // El resto cae por ON DELETE CASCADE (requiere PRAGMA foreign_keys = ON).
  db.delete(deck).where(eq(deck.id, id)).run();
}

export function createGroup(db: Db, deckId: number, name: string): GroupSummary {
  const trimmed = name.trim();
  if (!trimmed) throw badRequest('El grupo necesita un nombre');
  const parent = getDeck(db, deckId);
  const max = parent.groups.reduce((n, g) => Math.max(n, g.sortOrder), -1);

  const [row] = db.insert(cardGroup)
    .values({ deckId, name: trimmed, section: null, sortOrder: max + 1 })
    .returning().all();

  return { id: row.id, name: row.name, section: row.section, sortOrder: row.sortOrder,
           cardCount: 0, preview: [] };
}

export function renameGroup(db: Db, id: number, name: string): void {
  const trimmed = name.trim();
  if (!trimmed) throw badRequest('El grupo necesita un nombre');
  const res = db.update(cardGroup).set({ name: trimmed }).where(eq(cardGroup.id, id)).run();
  if (res.changes === 0) throw notFound('El grupo');
}

export function deleteGroup(db: Db, id: number): void {
  const res = db.delete(cardGroup).where(eq(cardGroup.id, id)).run();
  if (res.changes === 0) throw notFound('El grupo');
}

function writeAnswers(db: Db, cardId: number, answers: string[]) {
  const clean = answers.map(normalizeAnswer).filter(Boolean);
  if (clean.length === 0) throw badRequest('La carta necesita al menos una romanización');
  const unique = [...new Set(clean)];

  db.delete(cardAnswer).where(eq(cardAnswer.cardId, cardId)).run();
  unique.forEach((romaji, i) => {
    // La primera es la primaria: es la que se muestra al revelar.
    db.insert(cardAnswer).values({ cardId, romaji, isPrimary: i === 0 }).run();
  });
}

export function createCard(
  db: Db, groupId: number,
  input: { prompt: string; meaning?: string | null; answers: string[] },
): { id: number } {
  const prompt = input.prompt.trim();
  if (!prompt) throw badRequest('La carta necesita un texto en japonés');

  const groups = db.select().from(cardGroup).where(eq(cardGroup.id, groupId)).all();
  if (groups.length === 0) throw notFound('El grupo');

  let id = 0;
  db.transaction((tx) => {
    const t = tx as Db;
    const siblings = t.select().from(card).where(eq(card.groupId, groupId)).all();
    const max = siblings.reduce((n, c) => Math.max(n, c.sortOrder), -1);
    const [row] = t.insert(card)
      .values({ groupId, prompt, meaning: input.meaning?.trim() || null, sortOrder: max + 1 })
      .returning().all();
    id = row.id;
    writeAnswers(t, id, input.answers);
  });

  return { id };
}

export function updateCard(
  db: Db, id: number,
  input: { prompt?: string; meaning?: string | null; answers?: string[]; groupId?: number },
): void {
  const rows = db.select().from(card).where(eq(card.id, id)).all();
  if (rows.length === 0) throw notFound('La carta');

  db.transaction((tx) => {
    const t = tx as Db;
    const patch: Partial<typeof card.$inferInsert> = {};
    if (input.prompt !== undefined) patch.prompt = input.prompt.trim();
    if (input.meaning !== undefined) patch.meaning = input.meaning?.trim() || null;
    // Mover de grupo es solo esto. attempt apunta a la carta, no al grupo,
    // así que el historial de métricas viaja con ella.
    if (input.groupId !== undefined) patch.groupId = input.groupId;
    if (Object.keys(patch).length > 0) {
      t.update(card).set(patch).where(eq(card.id, id)).run();
    }
    if (input.answers) writeAnswers(t, id, input.answers);
  });
}

export function deleteCard(db: Db, id: number): void {
  const res = db.delete(card).where(eq(card.id, id)).run();
  if (res.changes === 0) throw notFound('La carta');
}
```

- [ ] **Step 5: Correr los tests y verificar que pasan**

Run: `npx vitest run tests/services/decks.test.ts`
Expected: PASS, 14 tests.

- [ ] **Step 6: Commit**

```bash
git add lib/services tests/services
git commit -m "feat: services de mazos, grupos y cartas"
```

---

### Task 9: Capa de API para mazos

**Files:**
- Create: `lib/api/handler.ts`, `lib/api/schemas.ts`
- Create: `app/api/decks/route.ts`, `app/api/decks/[id]/route.ts`, `app/api/decks/[id]/groups/route.ts`
- Create: `app/api/groups/[id]/route.ts`, `app/api/groups/[id]/cards/route.ts`
- Create: `app/api/cards/[id]/route.ts`
- Create: `tests/api/handler.test.ts`

**Interfaces:**
- Consumes: todo lo que exporta `lib/services/decks.ts` y `lib/services/errors.ts` (Task 8); `db` (Task 2).
- Produces:
  ```ts
  // lib/api/handler.ts
  export function ok<T>(data: T, status?: number): Response;
  export function route<T>(fn: () => T | Promise<T>, status?: number): Promise<Response>;
  export function idFrom(ctx: { params: Promise<{ id: string }> }): Promise<number>;
  ```
  Lo consumen todas las rutas de las tareas 11, 12, 15 y 16.

El wrapper es el equivalente a un filtro de excepciones de .NET: convierte un
`AppError` en su status y cualquier otra cosa en un 500, sin repetir try/catch
en cada ruta.

- [ ] **Step 1: Escribir el test que falla**

`tests/api/handler.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { route } from '../../lib/api/handler';
import { AppError } from '../../lib/services/errors';

describe('route', () => {
  it('devuelve 200 con el JSON del service', async () => {
    const res = await route(() => ({ hola: 'mundo' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ hola: 'mundo' });
  });

  it('acepta un status explícito para los 201', async () => {
    const res = await route(() => ({ id: 1 }), 201);
    expect(res.status).toBe(201);
  });

  it('traduce un AppError a su status con el mensaje', async () => {
    const res = await route(() => { throw new AppError('El mazo no existe', 404); });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'El mazo no existe' });
  });

  it('respeta el 403 de los mazos incluidos', async () => {
    const res = await route(() => { throw new AppError('no se puede borrar', 403); });
    expect(res.status).toBe(403);
  });

  it('convierte cualquier otro error en 500 sin filtrar el detalle', async () => {
    const res = await route(() => { throw new Error('connection reset at 0x7f'); });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Error interno');
    expect(JSON.stringify(body)).not.toContain('0x7f');
  });

  it('soporta services asincrónicos', async () => {
    const res = await route(async () => ({ ok: true }));
    expect(await res.json()).toEqual({ ok: true });
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run tests/api/handler.test.ts`
Expected: FAIL — `Cannot find module '../../lib/api/handler'`

- [ ] **Step 3: Escribir el wrapper y los esquemas**

`lib/api/handler.ts`:

```ts
import { ZodError } from 'zod';
import { AppError } from '../services/errors';

export function ok<T>(data: T, status = 200): Response {
  return Response.json(data as object, { status });
}

/**
 * Envuelve la lógica de una ruta y traduce errores a HTTP.
 * Equivale a un filtro de excepciones: evita repetir try/catch en cada handler.
 */
export async function route<T>(fn: () => T | Promise<T>, status = 200): Promise<Response> {
  try {
    return ok(await fn(), status);
  } catch (e) {
    if (e instanceof AppError) {
      return Response.json({ error: e.message }, { status: e.status });
    }
    if (e instanceof ZodError) {
      return Response.json(
        { error: 'Datos inválidos', issues: e.issues.map((i) => i.message) },
        { status: 400 },
      );
    }
    // No se filtra el detalle al cliente, pero sí al log del servidor.
    console.error(e);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
}

/** En el App Router los params son una promesa. */
export async function idFrom(ctx: { params: Promise<{ id: string }> }): Promise<number> {
  const { id } = await ctx.params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) throw new AppError('Id inválido', 400);
  return n;
}
```

`lib/api/schemas.ts`:

```ts
import { z } from 'zod';

export const createDeckSchema = z.object({
  name: z.string().min(1, 'El mazo necesita un nombre'),
  groups: z.array(z.string()).optional(),
});

export const renameSchema = z.object({
  name: z.string().min(1, 'Hace falta un nombre'),
});

export const createCardSchema = z.object({
  prompt: z.string().min(1, 'La carta necesita un texto en japonés'),
  meaning: z.string().nullish(),
  answers: z.array(z.string().min(1)).min(1, 'Hace falta al menos una romanización'),
});

export const updateCardSchema = z.object({
  prompt: z.string().min(1).optional(),
  meaning: z.string().nullish(),
  answers: z.array(z.string().min(1)).min(1).optional(),
  groupId: z.number().int().positive().optional(),
});
```

- [ ] **Step 4: Escribir las rutas**

`app/api/decks/route.ts`:

```ts
import { db } from '@/lib/db/client';
import { route } from '@/lib/api/handler';
import { createDeckSchema } from '@/lib/api/schemas';
import { listDecks, createDeck } from '@/lib/services/decks';

export const GET = () => route(() => listDecks(db));

export const POST = async (req: Request) =>
  route(async () => createDeck(db, createDeckSchema.parse(await req.json())), 201);
```

`app/api/decks/[id]/route.ts`:

```ts
import { db } from '@/lib/db/client';
import { route, idFrom } from '@/lib/api/handler';
import { renameSchema } from '@/lib/api/schemas';
import { getDeck, renameDeck, deleteDeck } from '@/lib/services/decks';

type Ctx = { params: Promise<{ id: string }> };

export const GET = (_req: Request, ctx: Ctx) =>
  route(async () => getDeck(db, await idFrom(ctx)));

export const PATCH = (req: Request, ctx: Ctx) =>
  route(async () => {
    const { name } = renameSchema.parse(await req.json());
    renameDeck(db, await idFrom(ctx), name);
    return { ok: true };
  });

export const DELETE = (_req: Request, ctx: Ctx) =>
  route(async () => {
    deleteDeck(db, await idFrom(ctx));
    return { ok: true };
  });
```

`app/api/decks/[id]/groups/route.ts`:

```ts
import { db } from '@/lib/db/client';
import { route, idFrom } from '@/lib/api/handler';
import { renameSchema } from '@/lib/api/schemas';
import { createGroup } from '@/lib/services/decks';

type Ctx = { params: Promise<{ id: string }> };

export const POST = (req: Request, ctx: Ctx) =>
  route(async () => {
    const { name } = renameSchema.parse(await req.json());
    return createGroup(db, await idFrom(ctx), name);
  }, 201);
```

`app/api/groups/[id]/route.ts`:

```ts
import { db } from '@/lib/db/client';
import { route, idFrom } from '@/lib/api/handler';
import { renameSchema } from '@/lib/api/schemas';
import { renameGroup, deleteGroup } from '@/lib/services/decks';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = (req: Request, ctx: Ctx) =>
  route(async () => {
    const { name } = renameSchema.parse(await req.json());
    renameGroup(db, await idFrom(ctx), name);
    return { ok: true };
  });

export const DELETE = (_req: Request, ctx: Ctx) =>
  route(async () => {
    deleteGroup(db, await idFrom(ctx));
    return { ok: true };
  });
```

`app/api/groups/[id]/cards/route.ts`:

```ts
import { db } from '@/lib/db/client';
import { route, idFrom } from '@/lib/api/handler';
import { createCardSchema } from '@/lib/api/schemas';
import { createCard } from '@/lib/services/decks';

type Ctx = { params: Promise<{ id: string }> };

export const POST = (req: Request, ctx: Ctx) =>
  route(async () => {
    const body = createCardSchema.parse(await req.json());
    return createCard(db, await idFrom(ctx), body);
  }, 201);
```

`app/api/cards/[id]/route.ts`:

```ts
import { db } from '@/lib/db/client';
import { route, idFrom } from '@/lib/api/handler';
import { updateCardSchema } from '@/lib/api/schemas';
import { updateCard, deleteCard } from '@/lib/services/decks';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = (req: Request, ctx: Ctx) =>
  route(async () => {
    const body = updateCardSchema.parse(await req.json());
    updateCard(db, await idFrom(ctx), body);
    return { ok: true };
  });

export const DELETE = (_req: Request, ctx: Ctx) =>
  route(async () => {
    deleteCard(db, await idFrom(ctx));
    return { ok: true };
  });
```

- [ ] **Step 5: Correr los tests y verificar que pasan**

Run: `npx vitest run tests/api/handler.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 6: Probar el API a mano**

Run: `npm run dev` y en otra terminal:

```bash
curl -s localhost:3000/api/decks | head -c 300
curl -s -X POST localhost:3000/api/decks \
  -H 'content-type: application/json' \
  -d '{"name":"Comidas","groups":["Pescado","Verdura"]}'
```

Expected: el GET lista Hiragana y Katakana con sus conteos; el POST devuelve 201
con el mazo nuevo y sus dos grupos.

Probar que el 403 funciona (el id de Hiragana suele ser 1):

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X DELETE localhost:3000/api/decks/1
```

Expected: `403`

- [ ] **Step 7: Commit**

```bash
git add lib/api app/api tests/api
git commit -m "feat: API de mazos, grupos y cartas con traducción de errores"
```

---

### Task 10: Componentes compartidos del sistema visual

**Files:**
- Create: `components/AppShell.tsx`, `components/GroupCard.tsx`, `components/GroupGrid.tsx`
- Create: `components/ActionBar.tsx`, `components/MetricTile.tsx`, `components/ListRow.tsx`
- Create: `components/BuiltinDot.tsx`
- Create: `app/globals.css`
- Modify: `app/layout.tsx` (envolver con `AppShell`)

**Interfaces:**
- Consumes: `GroupSummary` de `lib/services/decks.ts` (Task 8).
- Produces:
  ```tsx
  export function AppShell({ children }: { children: React.ReactNode }): JSX.Element;
  export function BuiltinDot(): JSX.Element;
  export function GroupCard(props: {
    group: GroupSummary; checked: boolean; onToggle: (id: number, on: boolean) => void;
  }): JSX.Element;
  export function GroupGrid(props: {
    groups: GroupSummary[]; selected: Set<number>;
    onToggle: (id: number, on: boolean) => void;
  }): JSX.Element;
  export function ActionBar(props: { children: React.ReactNode }): JSX.Element;
  export function MetricTile(props: {
    label: string; value: string | number; hint?: string; tone?: 'normal' | 'bad';
  }): JSX.Element;
  export function ListRow(props: {
    icon?: React.ReactNode; title: React.ReactNode; subtitle?: string;
    actions?: React.ReactNode;
  }): JSX.Element;
  ```
  Los consumen las pantallas 01, 04, 05 y 07.

Estas son **las cinco piezas** más el punto. Ninguna pantalla puede inventar una
sexta: ahí es donde se pierde la consistencia.

- [ ] **Step 1: Escribir los estilos globales**

`app/globals.css`:

```css
html, body { height: 100%; }
body { margin: 0; }

/* Zen Kaku Gothic New para todo kana: es una tipografía japonesa real,
   así que ぬ y め se distinguen de verdad. */
.kana { font-family: "Zen Kaku Gothic New", sans-serif; }
.romaji { font-family: "IBM Plex Mono", ui-monospace, monospace; }
.tabular { font-variant-numeric: tabular-nums; }

/* La barra de pestañas de móvil tiene que despejar el indicador de inicio. */
.safe-bottom { padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px)); }
```

- [ ] **Step 2: Escribir el punto de mazo incluido**

`components/BuiltinDot.tsx`:

```tsx
import { Tooltip, Box } from '@mantine/core';

/**
 * Marca los mazos que vienen con la app. Es solo un punto, a propósito:
 * una etiqueta de texto agregaría una palabra más al vocabulario de la UI
 * para decir algo que el botón Borrar ausente ya comunica.
 */
export function BuiltinDot() {
  return (
    <Tooltip label="Incluido en la app · no se puede borrar" withArrow>
      <Box
        component="span"
        w={7}
        h={7}
        ml={7}
        style={{ borderRadius: '50%', background: 'var(--mantine-color-jade-6)', display: 'inline-block' }}
      />
    </Tooltip>
  );
}
```

- [ ] **Step 3: Escribir la tarjeta de grupo**

`components/GroupCard.tsx`:

```tsx
'use client';

import { Card, Switch, Stack, Text } from '@mantine/core';
import type { GroupSummary } from '@/lib/services/decks';

/**
 * La regla de las seis cartas: si el grupo trae preview, se muestran las cartas
 * (y か行 se ve como la columna de kana); si no, se muestra el conteo.
 * Es presentación pura, no hay ninguna condición en el modelo de datos.
 */
export function GroupCard({
  group, checked, onToggle,
}: { group: GroupSummary; checked: boolean; onToggle: (id: number, on: boolean) => void }) {
  return (
    <Card
      withBorder
      padding="xs"
      onClick={() => onToggle(group.id, !checked)}
      style={{
        cursor: 'pointer',
        borderColor: checked ? 'var(--mantine-color-jade-8)' : undefined,
      }}
    >
      <Stack gap={6} align="center">
        <Switch
          size="xs"
          checked={checked}
          onChange={(e) => onToggle(group.id, e.currentTarget.checked)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Practicar ${group.name}`}
        />
        <Text size="xs" c="dimmed" className="kana">{group.name}</Text>

        {group.preview.length > 0 ? (
          <Stack gap={0} align="center">
            {group.preview.map((p) => (
              <Text key={p} className="kana" size="md" lh={1.5}>{p}</Text>
            ))}
          </Stack>
        ) : (
          <Text size="xs" c="dimmed" className="tabular">{group.cardCount} palabras</Text>
        )}
      </Stack>
    </Card>
  );
}
```

- [ ] **Step 4: Escribir la grilla seccionada**

`components/GroupGrid.tsx`:

```tsx
'use client';

import { Stack, SimpleGrid, Group, Text, Divider } from '@mantine/core';
import type { GroupSummary } from '@/lib/services/decks';
import { GroupCard } from './GroupCard';

/** Agrupa por `section` conservando el orden de aparición. NULL = un solo bloque sin título. */
function bySection(groups: GroupSummary[]): { label: string | null; items: GroupSummary[] }[] {
  const out: { label: string | null; items: GroupSummary[] }[] = [];
  for (const g of groups) {
    const last = out.at(-1);
    if (last && last.label === g.section) last.items.push(g);
    else out.push({ label: g.section, items: [g] });
  }
  return out;
}

export function GroupGrid({
  groups, selected, onToggle,
}: {
  groups: GroupSummary[];
  selected: Set<number>;
  onToggle: (id: number, on: boolean) => void;
}) {
  return (
    <Stack gap="lg">
      {bySection(groups).map((section, i) => (
        <Stack gap="xs" key={section.label ?? `sin-seccion-${i}`}>
          {section.label && (
            <Group gap="sm" wrap="nowrap">
              <Text size="xs" tt="uppercase" c="dimmed" style={{ letterSpacing: '0.11em' }}>
                {section.label}
              </Text>
              <Divider style={{ flex: 1 }} />
            </Group>
          )}
          {/* 8 columnas en escritorio, 3 en teléfono. */}
          <SimpleGrid cols={{ base: 3, sm: 5, md: 8 }} spacing="xs">
            {section.items.map((g) => (
              <GroupCard
                key={g.id}
                group={g}
                checked={selected.has(g.id)}
                onToggle={onToggle}
              />
            ))}
          </SimpleGrid>
        </Stack>
      ))}
    </Stack>
  );
}
```

- [ ] **Step 5: Escribir las piezas restantes**

`components/ActionBar.tsx`:

```tsx
import { Group, Paper } from '@mantine/core';

/** Barra inferior pegajosa. Siempre lleva el conteo a la izquierda y la acción a la derecha. */
export function ActionBar({ children }: { children: React.ReactNode }) {
  return (
    <Paper
      withBorder
      p="sm"
      radius={0}
      pos="sticky"
      bottom={0}
      style={{ borderLeft: 0, borderRight: 0, borderBottom: 0, zIndex: 2 }}
    >
      <Group gap="md">{children}</Group>
    </Paper>
  );
}
```

`components/MetricTile.tsx`:

```tsx
import { Paper, Stack, Text } from '@mantine/core';

export function MetricTile({
  label, value, hint, tone = 'normal',
}: { label: string; value: string | number; hint?: string; tone?: 'normal' | 'bad' }) {
  return (
    <Paper withBorder p="sm">
      <Stack gap={2}>
        <Text size="xs" tt="uppercase" c="dimmed" style={{ letterSpacing: '0.06em' }}>
          {label}
        </Text>
        <Text size="xl" fw={600} className="tabular" c={tone === 'bad' ? 'shu.6' : undefined}>
          {value}
        </Text>
        {hint && <Text size="xs" c="dimmed">{hint}</Text>}
      </Stack>
    </Paper>
  );
}
```

`components/ListRow.tsx`:

```tsx
import { Group, Stack, Text, Box } from '@mantine/core';

export function ListRow({
  icon, title, subtitle, actions,
}: {
  icon?: React.ReactNode; title: React.ReactNode;
  subtitle?: string; actions?: React.ReactNode;
}) {
  return (
    <Group wrap="nowrap" gap="md" px="sm" py="xs">
      {icon && <Box w={34} className="kana">{icon}</Box>}
      <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
        <Text size="sm" fw={500} className="kana">{title}</Text>
        {subtitle && <Text size="xs" c="dimmed">{subtitle}</Text>}
      </Stack>
      {actions && <Group gap="xs" wrap="nowrap">{actions}</Group>}
    </Group>
  );
}
```

- [ ] **Step 6: Escribir el shell con navegación responsive**

`components/AppShell.tsx`:

```tsx
'use client';

import { AppShell as MantineShell, Group, Text, Anchor, Box } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const LINKS = [
  { href: '/', label: 'Práctica', glyph: 'あ' },
  { href: '/mazos', label: 'Mazos', glyph: '▤' },
  { href: '/estadisticas', label: 'Estadísticas', glyph: '◷' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const isPhone = useMediaQuery('(max-width: 640px)');
  const path = usePathname();

  // El quiz se muestra a pantalla completa: sin navegación que distraiga.
  if (path === '/practicar') return <>{children}</>;

  return (
    <MantineShell header={{ height: 48 }} padding="md">
      <MantineShell.Header>
        <Group h="100%" px="md" gap="xl">
          <Group gap={7}>
            <Text className="kana" fw={700} size="sm">あ</Text>
            <Text fw={700} size="sm">Kana Drill</Text>
          </Group>
          {!isPhone && (
            <Group gap={4}>
              {LINKS.map((l) => (
                <Anchor
                  key={l.href}
                  component={Link}
                  href={l.href}
                  size="sm"
                  c={path === l.href ? undefined : 'dimmed'}
                  underline="never"
                >
                  {l.label}
                </Anchor>
              ))}
            </Group>
          )}
        </Group>
      </MantineShell.Header>

      <MantineShell.Main pb={isPhone ? 72 : undefined}>{children}</MantineShell.Main>

      {isPhone && (
        <Box
          pos="fixed"
          bottom={0}
          left={0}
          right={0}
          className="safe-bottom"
          pt={6}
          style={{
            display: 'flex',
            background: 'var(--mantine-color-dark-6)',
            borderTop: '1px solid var(--mantine-color-default-border)',
            zIndex: 100,
          }}
        >
          {LINKS.map((l) => (
            <Anchor
              key={l.href}
              component={Link}
              href={l.href}
              underline="never"
              style={{ flex: 1, textAlign: 'center' }}
              c={path === l.href ? 'jade.6' : 'dimmed'}
            >
              <Text className="kana" size="lg" lh={1.2}>{l.glyph}</Text>
              <Text size="9px">{l.label}</Text>
            </Anchor>
          ))}
        </Box>
      )}
    </MantineShell>
  );
}
```

Modificar `app/layout.tsx`: envolver `{children}` con `<AppShell>` dentro del
`MantineProvider`.

- [ ] **Step 7: Verificar a ojo**

Run: `npm run dev`, abrir `/mazos` (todavía 404) y luego `/`.

Expected: barra superior con "Kana Drill". Achicar la ventana a menos de 640px:
la navegación de arriba desaparece y aparece la barra de pestañas abajo.

- [ ] **Step 8: Commit**

```bash
git add components app/globals.css app/layout.tsx
git commit -m "feat: componentes compartidos y navegación responsive"
```

---

### Task 11: Pantalla 01 Práctica, cookie de selección y apertura de ronda

**Files:**
- Create: `lib/selection-cookie.ts`, `lib/services/sessions.ts`
- Create: `app/api/sessions/route.ts`
- Create: `components/PracticeBoard.tsx`
- Modify: `app/page.tsx`
- Create: `tests/selection-cookie.test.ts`, `tests/services/sessions.test.ts`

**Interfaces:**
- Consumes: `listDecks`, `GroupSummary` (Task 8); `route` (Task 9); `GroupGrid`, `ActionBar` (Task 10).
- Produces:
  ```ts
  // lib/selection-cookie.ts
  export const SELECTION_COOKIE = 'grupos';
  export function parseSelection(raw: string | undefined): number[];
  export function serializeSelection(ids: number[]): string;

  // lib/services/sessions.ts
  export type RoundPayload = {
    sessionId: number;
    groupIds: number[];
    cards: { id: number; prompt: string; meaning: string | null; answers: string[]; primary: string }[];
  };
  export function openRound(db: Db, groupIds: number[], mode?: 'normal' | 'review'): RoundPayload;
  export function recordAttempt(db: Db, input: {
    sessionId: number; cardId: number; typed: string;
    isCorrect: boolean; revealed: boolean; ms: number;
  }): void;
  export function closeRound(db: Db, sessionId: number): void;
  ```
  Los consumen las tareas 12, 13 y 15.

**Por qué cookie y no `localStorage`:** con SSR, `localStorage` obliga a
renderizar la grilla vacía y después parpadear. La cookie la lee el servidor y
la grilla llega con los toggles puestos. De paso es el mismo mecanismo que va a
usar la sesión de login.

- [ ] **Step 1: Escribir los tests que fallan**

`tests/selection-cookie.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseSelection, serializeSelection } from '../lib/selection-cookie';

describe('cookie de selección', () => {
  it('serializa y vuelve a leer la misma selección', () => {
    expect(parseSelection(serializeSelection([3, 1, 2]))).toEqual([1, 2, 3]);
  });

  it('devuelve vacío si la cookie no existe', () => {
    expect(parseSelection(undefined)).toEqual([]);
    expect(parseSelection('')).toEqual([]);
  });

  it('descarta basura sin romperse', () => {
    // Una cookie corrupta no puede tirar abajo la home.
    expect(parseSelection('1,abc,,3,-5,2.7')).toEqual([1, 3]);
  });

  it('deduplica', () => {
    expect(parseSelection('2,2,2')).toEqual([2]);
  });
});
```

`tests/services/sessions.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { createDb, migrate, type Db } from '../../lib/db/client';
import { seedKana } from '../../lib/db/seed';
import { listDecks } from '../../lib/services/decks';
import { openRound, recordAttempt, closeRound } from '../../lib/services/sessions';
import { session, sessionGroup, attempt } from '../../lib/db/schema';
import { AppError } from '../../lib/services/errors';

let db: Db;
let kaGroupId: number;
let saGroupId: number;

beforeEach(() => {
  db = createDb(':memory:');
  migrate(db);
  seedKana(db);
  const hira = listDecks(db).find((d) => d.name === 'Hiragana')!;
  kaGroupId = hira.groups.find((g) => g.name === 'か行')!.id;
  saGroupId = hira.groups.find((g) => g.name === 'さ行')!.id;
});

describe('openRound', () => {
  it('devuelve las cartas de los grupos elegidos', () => {
    const r = openRound(db, [kaGroupId]);
    expect(r.cards).toHaveLength(5);
    expect(r.cards.map((c) => c.prompt).sort()).toEqual(['か', 'き', 'く', 'け', 'こ']);
  });

  it('junta varios grupos', () => {
    expect(openRound(db, [kaGroupId, saGroupId]).cards).toHaveLength(10);
  });

  it('trae todas las romanizaciones y marca la primaria', () => {
    const shi = openRound(db, [saGroupId]).cards.find((c) => c.prompt === 'し')!;
    expect(shi.answers.sort()).toEqual(['shi', 'si']);
    expect(shi.primary).toBe('shi');
  });

  it('registra qué grupos entraron en la ronda', () => {
    const r = openRound(db, [kaGroupId, saGroupId]);
    const rows = db.select().from(sessionGroup)
      .where(eq(sessionGroup.sessionId, r.sessionId)).all();
    expect(rows.map((x) => x.groupId).sort()).toEqual([kaGroupId, saGroupId].sort());
  });

  it('guarda el total y deja la ronda abierta', () => {
    const r = openRound(db, [kaGroupId]);
    const s = db.select().from(session).where(eq(session.id, r.sessionId)).all()[0];
    expect(s.total).toBe(5);
    expect(s.finishedAt).toBeNull();
    expect(s.mode).toBe('normal');
  });

  it('rechaza una ronda sin grupos', () => {
    expect(() => openRound(db, [])).toThrow(AppError);
  });

  it('rechaza grupos que no existen', () => {
    expect(() => openRound(db, [999999])).toThrow(AppError);
  });
});

describe('recordAttempt y closeRound', () => {
  it('guarda un intento por cada Enter', () => {
    const r = openRound(db, [kaGroupId]);
    const card = r.cards[0];
    recordAttempt(db, { sessionId: r.sessionId, cardId: card.id, typed: 'zz', isCorrect: false, revealed: false, ms: 900 });
    recordAttempt(db, { sessionId: r.sessionId, cardId: card.id, typed: card.primary, isCorrect: true, revealed: false, ms: 400 });

    const rows = db.select().from(attempt).where(eq(attempt.sessionId, r.sessionId)).all();
    expect(rows).toHaveLength(2);
    expect(rows[0].isCorrect).toBe(false);
    expect(rows[1].isCorrect).toBe(true);
  });

  it('distingue un revelado de un error tipeado', () => {
    const r = openRound(db, [kaGroupId]);
    recordAttempt(db, { sessionId: r.sessionId, cardId: r.cards[0].id, typed: '', isCorrect: false, revealed: true, ms: 0 });
    const row = db.select().from(attempt).where(eq(attempt.sessionId, r.sessionId)).all()[0];
    expect(row.revealed).toBe(true);
    expect(row.isCorrect).toBe(false);
  });

  it('closeRound consolida los totales desde los intentos', () => {
    const r = openRound(db, [kaGroupId]);
    recordAttempt(db, { sessionId: r.sessionId, cardId: r.cards[0].id, typed: 'zz', isCorrect: false, revealed: false, ms: 1 });
    recordAttempt(db, { sessionId: r.sessionId, cardId: r.cards[0].id, typed: 'x', isCorrect: true, revealed: false, ms: 1 });
    recordAttempt(db, { sessionId: r.sessionId, cardId: r.cards[1].id, typed: 'y', isCorrect: true, revealed: false, ms: 1 });

    closeRound(db, r.sessionId);

    const s = db.select().from(session).where(eq(session.id, r.sessionId)).all()[0];
    expect(s.correct).toBe(2);
    expect(s.incorrect).toBe(1);
    expect(s.finishedAt).not.toBeNull();
  });
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `npx vitest run tests/selection-cookie.test.ts tests/services/sessions.test.ts`
Expected: FAIL — módulos inexistentes.

- [ ] **Step 3: Escribir la cookie**

`lib/selection-cookie.ts`:

```ts
export const SELECTION_COOKIE = 'grupos';

/** Tolerante a basura: una cookie corrupta no puede tirar abajo la home. */
export function parseSelection(raw: string | undefined): number[] {
  if (!raw) return [];
  const ids = raw
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
  return [...new Set(ids)].sort((a, b) => a - b);
}

export function serializeSelection(ids: number[]): string {
  return [...new Set(ids)].sort((a, b) => a - b).join(',');
}
```

- [ ] **Step 4: Escribir el service de sesiones**

`lib/services/sessions.ts`:

```ts
import { eq, inArray, asc } from 'drizzle-orm';
import type { Db } from '../db/client';
import { cardGroup, card, cardAnswer, session, sessionGroup, attempt } from '../db/schema';
import { badRequest, notFound } from './errors';

export type RoundCard = {
  id: number; prompt: string; meaning: string | null;
  answers: string[]; primary: string;
};
export type RoundPayload = { sessionId: number; groupIds: number[]; cards: RoundCard[] };

/** Arma las cartas de un conjunto de grupos, con todas sus romanizaciones. */
export function cardsForGroups(db: Db, groupIds: number[]): RoundCard[] {
  if (groupIds.length === 0) return [];
  const cards = db.select().from(card)
    .where(inArray(card.groupId, groupIds)).orderBy(asc(card.sortOrder)).all();
  if (cards.length === 0) return [];

  const answers = db.select().from(cardAnswer)
    .where(inArray(cardAnswer.cardId, cards.map((c) => c.id))).all();

  const byCard = new Map<number, typeof answers>();
  for (const a of answers) {
    const list = byCard.get(a.cardId) ?? [];
    list.push(a);
    byCard.set(a.cardId, list);
  }

  return cards.map((c) => {
    const list = byCard.get(c.id) ?? [];
    return {
      id: c.id,
      prompt: c.prompt,
      meaning: c.meaning,
      answers: list.map((a) => a.romaji),
      // La primaria es la que se muestra al revelar. Si faltara, se usa la primera.
      primary: (list.find((a) => a.isPrimary) ?? list[0])?.romaji ?? '',
    };
  });
}

export function openRound(
  db: Db, groupIds: number[], mode: 'normal' | 'review' = 'normal',
): RoundPayload {
  if (groupIds.length === 0) throw badRequest('Elegí al menos un grupo para practicar');

  const found = db.select().from(cardGroup).where(inArray(cardGroup.id, groupIds)).all();
  if (found.length !== new Set(groupIds).size) throw notFound('Alguno de los grupos');

  const cards = cardsForGroups(db, groupIds);
  if (cards.length === 0) throw badRequest('Los grupos elegidos no tienen cartas');

  let sessionId = 0;
  db.transaction((tx) => {
    const t = tx as Db;
    const [s] = t.insert(session).values({ mode, total: cards.length }).returning().all();
    sessionId = s.id;
    for (const gid of new Set(groupIds)) {
      t.insert(sessionGroup).values({ sessionId: s.id, groupId: gid }).run();
    }
  });

  return { sessionId, groupIds: [...new Set(groupIds)], cards };
}

/** Una fila por cada Enter. Se llama fire-and-forget desde el cliente. */
export function recordAttempt(db: Db, input: {
  sessionId: number; cardId: number; typed: string;
  isCorrect: boolean; revealed: boolean; ms: number;
}): void {
  db.insert(attempt).values({
    sessionId: input.sessionId,
    cardId: input.cardId,
    typed: input.typed,
    isCorrect: input.isCorrect,
    revealed: input.revealed,
    ms: input.ms,
  }).run();
}

/** Consolida desde attempt, que es la fuente de verdad. */
export function closeRound(db: Db, sessionId: number): void {
  const rows = db.select().from(attempt).where(eq(attempt.sessionId, sessionId)).all();
  const correct = rows.filter((r) => r.isCorrect).length;

  const res = db.update(session).set({
    finishedAt: new Date().toISOString(),
    correct,
    incorrect: rows.length - correct,
  }).where(eq(session.id, sessionId)).run();

  if (res.changes === 0) throw notFound('La ronda');
}
```

- [ ] **Step 5: Escribir la ruta de apertura de ronda**

`app/api/sessions/route.ts`:

```ts
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { route } from '@/lib/api/handler';
import { openRound } from '@/lib/services/sessions';

const schema = z.object({
  groupIds: z.array(z.number().int().positive()).min(1, 'Elegí al menos un grupo'),
});

export const POST = async (req: Request) =>
  route(async () => openRound(db, schema.parse(await req.json()).groupIds), 201);
```

- [ ] **Step 6: Escribir la pantalla**

`components/PracticeBoard.tsx`:

```tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Stack, Group, SegmentedControl, Button, Text } from '@mantine/core';
import { GroupGrid } from './GroupGrid';
import { ActionBar } from './ActionBar';
import { SELECTION_COOKIE, serializeSelection } from '@/lib/selection-cookie';
import type { DeckSummary } from '@/lib/services/decks';

export function PracticeBoard({
  decks, initialSelection,
}: { decks: DeckSummary[]; initialSelection: number[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [deckId, setDeckId] = useState(String(decks[0]?.id ?? ''));
  const [selected, setSelected] = useState(new Set(initialSelection));

  const deck = decks.find((d) => String(d.id) === deckId) ?? decks[0];

  function persist(next: Set<number>) {
    setSelected(next);
    // Un año. La lee el servidor en el próximo render: sin parpadeo.
    document.cookie =
      `${SELECTION_COOKIE}=${serializeSelection([...next])}; path=/; max-age=31536000; samesite=lax`;
  }

  const toggle = (id: number, on: boolean) => {
    const next = new Set(selected);
    on ? next.add(id) : next.delete(id);
    persist(next);
  };

  const setAll = (on: boolean) => {
    const next = new Set(selected);
    for (const g of deck.groups) on ? next.add(g.id) : next.delete(g.id);
    persist(next);
  };

  const chosen = deck.groups.filter((g) => selected.has(g.id));
  const cardCount = chosen.reduce((n, g) => n + g.cardCount, 0);

  async function begin() {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ groupIds: chosen.map((g) => g.id) }),
    });
    if (!res.ok) return;
    const round = await res.json();
    sessionStorage.setItem('ronda', JSON.stringify(round));
    start(() => router.push('/practicar'));
  }

  return (
    <Stack gap="md">
      <Group>
        <SegmentedControl
          value={deckId}
          onChange={setDeckId}
          data={decks.map((d) => ({ value: String(d.id), label: d.name }))}
        />
        <Button variant="subtle" size="compact-xs" ml="auto" onClick={() => setAll(true)}>
          Todos
        </Button>
        <Button variant="subtle" size="compact-xs" onClick={() => setAll(false)}>
          Ninguno
        </Button>
      </Group>

      <GroupGrid groups={deck.groups} selected={selected} onToggle={toggle} />

      <ActionBar>
        <Text size="sm" c="dimmed">
          <b>{chosen.length}</b> grupos · <b>{cardCount}</b> cartas
        </Text>
        <Button
          ml="auto"
          onClick={begin}
          loading={pending}
          disabled={chosen.length === 0}
        >
          Empezar ronda →
        </Button>
      </ActionBar>
    </Stack>
  );
}
```

`app/page.tsx`:

```tsx
import { cookies } from 'next/headers';
import { db } from '@/lib/db/client';
import { listDecks } from '@/lib/services/decks';
import { SELECTION_COOKIE, parseSelection } from '@/lib/selection-cookie';
import { PracticeBoard } from '@/components/PracticeBoard';

export default async function Page() {
  // Server Component: llama al service directo, sin fetch a sí mismo.
  const decks = listDecks(db);
  const jar = await cookies();
  const selection = parseSelection(jar.get(SELECTION_COOKIE)?.value);

  return <PracticeBoard decks={decks} initialSelection={selection} />;
}
```

- [ ] **Step 7: Correr los tests y verificar que pasan**

Run: `npx vitest run tests/selection-cookie.test.ts tests/services/sessions.test.ts`
Expected: PASS, 4 + 10 tests.

- [ ] **Step 8: Verificar la pantalla a ojo**

Run: `npm run dev`, abrir `/`

Expected: tres bloques con encabezado (Básicos, Dakuten, Contracciones), 26
tarjetas con kana visible, barra inferior con el conteo. Prender algunos grupos,
recargar con F5: los toggles quedan puestos **sin parpadeo**, porque vienen del
servidor. Con cero grupos el botón queda deshabilitado.

- [ ] **Step 9: Commit**

```bash
git add lib/selection-cookie.ts lib/services/sessions.ts app/api/sessions app/page.tsx components/PracticeBoard.tsx tests
git commit -m "feat: pantalla de práctica con selección persistida en cookie"
```

---

### Task 12: Pantalla 02 Quiz

**Files:**
- Create: `app/practicar/page.tsx`, `components/quiz/QuizRunner.tsx`
- Create: `app/api/attempts/route.ts`, `app/api/sessions/[id]/route.ts`

**Interfaces:**
- Consumes: todo `lib/quiz/engine.ts` (Task 6); `recordAttempt`, `closeRound` (Task 11); `route`, `idFrom` (Task 9).
- Produces: `QuizRunner` consumido por `app/practicar/page.tsx`. El overlay de fin de ronda llega en la Task 13.

- [ ] **Step 1: Escribir las rutas de intentos y cierre**

`app/api/attempts/route.ts`:

```ts
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { route } from '@/lib/api/handler';
import { recordAttempt } from '@/lib/services/sessions';

const schema = z.object({
  sessionId: z.number().int().positive(),
  cardId: z.number().int().positive(),
  typed: z.string(),
  isCorrect: z.boolean(),
  revealed: z.boolean(),
  ms: z.number().int().nonnegative(),
});

export const POST = async (req: Request) =>
  route(async () => {
    recordAttempt(db, schema.parse(await req.json()));
    return { ok: true };
  }, 201);
```

`app/api/sessions/[id]/route.ts`:

```ts
import { db } from '@/lib/db/client';
import { route, idFrom } from '@/lib/api/handler';
import { closeRound } from '@/lib/services/sessions';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = (_req: Request, ctx: Ctx) =>
  route(async () => {
    closeRound(db, await idFrom(ctx));
    return { ok: true };
  });
```

- [ ] **Step 2: Escribir el runner**

`components/quiz/QuizRunner.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Stack, Group, Text, TextInput, Button, Progress, Paper, Box, Kbd } from '@mantine/core';
import {
  startRound, submit, reveal, currentCard, isFinished, accuracy,
  type QuizCard, type RoundState,
} from '@/lib/quiz/engine';

export type Round = { sessionId: number; groupIds: number[]; cards: QuizCard[] };

export function QuizRunner({ round }: { round: Round }) {
  const router = useRouter();
  const [state, setState] = useState<RoundState>(() => startRound(round.cards));
  const [typed, setTyped] = useState('');
  const [flash, setFlash] = useState<'none' | 'wrong'>('none');
  const [shown, setShown] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const shownAt = useRef(Date.now());

  const card = currentCard(state);
  const done = state.correct + state.incorrect;
  const remaining = state.queue.length;

  // El foco arranca y vuelve siempre al input: el mouse nunca es obligatorio.
  useEffect(() => { inputRef.current?.focus(); }, [card?.id]);
  useEffect(() => { shownAt.current = Date.now(); }, [card?.id]);

  function send(body: Record<string, unknown>) {
    // Fire-and-forget: no bloquea el tipeo. Si se cierra la pestaña a mitad de
    // ronda, lo ya respondido quedó guardado.
    void fetch('/api/attempts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId: round.sessionId, ...body }),
    }).catch(() => {});
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!card) return;

    const r = submit(state, typed);
    send({
      cardId: card.id, typed, isCorrect: r.outcome === 'correct',
      revealed: false, ms: Date.now() - shownAt.current,
    });

    if (r.outcome === 'correct') {
      setState(r.state);
      setTyped('');
      setFlash('none');
      setShown(null);
      if (isFinished(r.state)) {
        void fetch(`/api/sessions/${round.sessionId}`, { method: 'PATCH' }).catch(() => {});
      }
    } else {
      // La carta se queda: solo se limpia el input y se marca el error.
      setState(r.state);
      setTyped('');
      setFlash('wrong');
      setTimeout(() => setFlash('none'), 600);
    }
  }

  function onReveal() {
    if (!card) return;
    const r = reveal(state);
    setState(r.state);
    setShown(r.answer);
    send({ cardId: card.id, typed: '', isCorrect: false, revealed: true, ms: 0 });
    inputRef.current?.focus();
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') router.push('/');
      // Espacio revela, pero solo si el input está vacío: si no, no se podría
      // escribir una respuesta con espacio.
      if (e.key === ' ' && typed === '') { e.preventDefault(); onReveal(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <Stack gap={0} h="100%">
      <Group px="md" py="xs" justify="space-between">
        <Text size="xs" c="dimmed">Kana Drill</Text>
        <Text size="xs" c="dimmed"><Kbd>Esc</Kbd> salir</Text>
      </Group>

      <Box style={{ flex: 1, display: 'grid', placeItems: 'center' }} py="xl">
        <Stack align="center" gap="xs">
          <Text
            className="kana"
            style={{ fontSize: 'clamp(64px, 18vw, 108px)', lineHeight: 1 }}
            c={flash === 'wrong' ? 'shu.6' : undefined}
          >
            {card?.prompt ?? ''}
          </Text>
          {shown && <Text className="romaji" c="dimmed">es {shown}</Text>}
          {flash === 'wrong' && <Text size="sm" c="shu.6">no es esa, probá de nuevo</Text>}
        </Stack>
      </Box>

      <Progress value={(done && (round.cards.length - remaining) / round.cards.length * 100) || 0} size="xs" radius={0} />

      <Paper withBorder radius={0} p="sm" style={{ borderLeft: 0, borderRight: 0, borderBottom: 0 }}>
        <Group gap="md" wrap="nowrap">
          <Group gap="lg" visibleFrom="sm">
            <Text size="xs" c="dimmed">Aciertos <b className="tabular">{Math.round(accuracy(state) * 100)}%</b></Text>
            <Text size="xs" c="dimmed">Restantes <b className="tabular">{remaining}</b></Text>
            <Text size="xs" c="dimmed">Errores <b className="tabular" style={{ color: 'var(--mantine-color-shu-6)' }}>{state.incorrect}</b></Text>
          </Group>

          <form onSubmit={onSubmit} style={{ flex: 1 }}>
            <TextInput
              ref={inputRef}
              id="respuesta"
              value={typed}
              onChange={(e) => setTyped(e.currentTarget.value)}
              placeholder="escribí el romaji"
              ta="center"
              error={flash === 'wrong'}
              // Sin esto iOS convierte "ka" en "Ka" y sugiere corregir "shi":
              // se contarían errores que nunca se cometieron.
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
              autoComplete="off"
            />
          </form>

          <Button variant="default" size="compact-sm" onClick={onReveal}>Revelar</Button>
        </Group>
      </Paper>
    </Stack>
  );
}
```

`app/practicar/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Center, Loader } from '@mantine/core';
import { QuizRunner, type Round } from '@/components/quiz/QuizRunner';

export default function Page() {
  const router = useRouter();
  const [round, setRound] = useState<Round | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('ronda');
    if (!raw) { router.replace('/'); return; }
    setRound(JSON.parse(raw) as Round);
  }, [router]);

  if (!round) return <Center h="100vh"><Loader /></Center>;
  return <QuizRunner round={round} />;
}
```

- [ ] **Step 3: Probar el flujo completo a mano**

Run: `npm run dev`, abrir `/`, elegir か行, "Empezar ronda".

Expected:
- Aparece un kana grande y el cursor ya está en el input, sin hacer clic.
- Escribir mal + Enter: el kana se pone rojo, el input se limpia, **el mismo kana sigue ahí**, el contador de errores sube.
- Escribir bien + Enter: pasa al siguiente, restantes baja.
- Espacio con el input vacío: muestra la respuesta y suma un error.
- `Esc`: vuelve a la home.

- [ ] **Step 4: Verificar que los intentos se guardan**

```bash
sqlite3 kana-drill.db "select typed, is_correct, revealed from attempt order by id desc limit 5;"
```

Expected: una fila por cada Enter, con el revelado en `revealed = 1` y `is_correct = 0`.

- [ ] **Step 5: Commit**

```bash
git add app/practicar app/api/attempts app/api/sessions components/quiz
git commit -m "feat: pantalla del quiz con registro de intentos"
```

---

### Task 13: Pantalla 03 Fin de ronda

**Files:**
- Create: `components/quiz/RoundSummary.tsx`
- Modify: `components/quiz/QuizRunner.tsx` (mostrar el overlay y encadenar la ronda siguiente)

**Interfaces:**
- Consumes: `RoundState`, `startRound`, `accuracy` (Task 6).
- Produces:
  ```tsx
  export function RoundSummary(props: {
    state: RoundState; elapsedMs: number; misses: { prompt: string; primary: string; count: number }[];
    onContinue: () => void; onExit: () => void;
  }): JSX.Element;
  ```

**El requisito:** volver a empezar sin apretar nada. La ronda siguiente ya está
barajada detrás del overlay y el foco nunca sale del input; la primera tecla que
se toque es la primera letra de la carta nueva. Si no se toca nada, arranca sola
a los 6 segundos.

- [ ] **Step 1: Escribir el overlay**

`components/quiz/RoundSummary.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { Box, Paper, Stack, Group, Text, Progress, Kbd } from '@mantine/core';
import { accuracy, type RoundState } from '@/lib/quiz/engine';

const AUTO_CONTINUE_MS = 6000;

export function RoundSummary({
  state, elapsedMs, misses, onContinue, onExit,
}: {
  state: RoundState;
  elapsedMs: number;
  misses: { prompt: string; primary: string; count: number }[];
  onContinue: () => void;
  onExit: () => void;
}) {
  // Si no se toca nada, arranca sola. El requisito es que el flujo no se corte.
  useEffect(() => {
    const t = setTimeout(onContinue, AUTO_CONTINUE_MS);
    return () => clearTimeout(t);
  }, [onContinue]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onExit(); return; }
      // Cualquier tecla imprimible arranca la ronda siguiente, y ese mismo
      // carácter queda como la primera letra de la carta nueva.
      if (e.key.length === 1) onContinue();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onContinue, onExit]);

  const mins = Math.floor(elapsedMs / 60000);
  const secs = Math.floor((elapsedMs % 60000) / 1000);
  const worst = misses[0]?.count ?? 1;

  return (
    <Box
      pos="absolute"
      inset={0}
      style={{ background: 'rgba(15,18,32,.93)', display: 'grid', placeItems: 'center', zIndex: 10 }}
    >
      <Paper withBorder p="lg" maw={400} w="90%">
        <Stack gap="md">
          <Text fw={700} className="kana">Ronda completa</Text>

          <Group gap="xl">
            <Stack gap={0}>
              <Text size="xl" fw={600} className="tabular">{Math.round(accuracy(state) * 100)}%</Text>
              <Text size="xs" c="dimmed" tt="uppercase">Aciertos</Text>
            </Stack>
            <Stack gap={0}>
              <Text size="xl" fw={600} className="tabular">{state.correct}</Text>
              <Text size="xs" c="dimmed" tt="uppercase">Cartas</Text>
            </Stack>
            <Stack gap={0}>
              <Text size="xl" fw={600} className="tabular" c="shu.6">{state.incorrect}</Text>
              <Text size="xs" c="dimmed" tt="uppercase">Errores</Text>
            </Stack>
            <Stack gap={0}>
              <Text size="xl" fw={600} className="tabular">{mins}:{String(secs).padStart(2, '0')}</Text>
              <Text size="xs" c="dimmed" tt="uppercase">Tiempo</Text>
            </Stack>
          </Group>

          {misses.length > 0 && (
            <Stack gap={5}>
              <Text size="xs" tt="uppercase" c="dimmed">Las que te costaron</Text>
              {misses.slice(0, 5).map((m) => (
                <Group key={m.prompt} gap="sm" wrap="nowrap">
                  <Text className="kana" w={34}>{m.prompt}</Text>
                  <Text className="romaji" size="xs" c="dimmed" w={46}>{m.primary}</Text>
                  <Progress value={(m.count / worst) * 100} color="shu.6" size="xs" style={{ flex: 1 }} />
                  <Text size="xs" c="dimmed" className="tabular">{m.count}</Text>
                </Group>
              ))}
            </Stack>
          )}

          <Text size="xs" c="dimmed">
            <Kbd>escribí</Kbd> para seguir con otra ronda · <Kbd>Esc</Kbd> para salir
          </Text>
        </Stack>
      </Paper>
    </Box>
  );
}
```

- [ ] **Step 2: Encadenar rondas en el runner**

En `components/quiz/QuizRunner.tsx`:

1. Agregar estado para el conteo de errores por carta y el inicio de la ronda:

```tsx
const [misses, setMisses] = useState<Record<number, number>>({});
const [roundStart, setRoundStart] = useState(() => Date.now());
const [sessionId, setSessionId] = useState(round.sessionId);
```

2. En la rama de error de `onSubmit`, y también en `onReveal`, sumar al conteo:

```tsx
setMisses((m) => ({ ...m, [card.id]: (m[card.id] ?? 0) + 1 }));
```

3. Agregar la función que arranca la ronda siguiente:

```tsx
async function nextRound() {
  // Abrir una sesión nueva con los MISMOS grupos: se reusa el payload original.
  const res = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ groupIds: round.groupIds }),
  });
  if (res.ok) {
    const next = await res.json();
    setSessionId(next.sessionId);
  }
  setState(startRound(round.cards));
  setMisses({});
  setTyped('');
  setShown(null);
  setRoundStart(Date.now());
  inputRef.current?.focus();
}
```

4. Renderizar el overlay cuando la ronda terminó, dentro del `Box` del kana:

```tsx
{isFinished(state) && (
  <RoundSummary
    state={state}
    elapsedMs={Date.now() - roundStart}
    misses={Object.entries(misses)
      .map(([id, count]) => {
        const c = round.cards.find((x) => x.id === Number(id))!;
        return { prompt: c.prompt, primary: c.primary, count };
      })
      .sort((a, b) => b.count - a.count)}
    onContinue={nextRound}
    onExit={() => router.push('/')}
  />
)}
```

5. El `Box` del kana necesita `pos="relative"` para que el overlay se ancle ahí.

6. `send()` tiene que usar `sessionId` del estado, no `round.sessionId`, para que
   los intentos de la segunda ronda vayan a la sesión nueva.

- [ ] **Step 3: Verificar que `groupIds` viaja en el payload**

`openRound` ya devuelve `groupIds` desde la Task 11, y `Round` ya lo declara en
`QuizRunner.tsx`. `nextRound()` lo necesita para abrir la sesión siguiente con
los mismos grupos. Confirmar que ambos lo tienen antes de seguir.

- [ ] **Step 4: Correr los tests de sesiones**

Run: `npx vitest run tests/services/sessions.test.ts`
Expected: PASS, sin cambios.

- [ ] **Step 5: Probar el encadenado a mano**

Run: `npm run dev`, empezar una ronda de か行 (5 cartas) y completarla.

Expected:
- Al acertar la quinta aparece el resumen con accuracy, cartas, errores y tiempo.
- **Escribir cualquier letra hace desaparecer el overlay** y arranca una ronda nueva, sin haber tocado ningún botón.
- Sin tocar nada, a los 6 segundos arranca sola.
- `Esc` vuelve a la home.

- [ ] **Step 6: Commit**

```bash
git add components/quiz lib/services/sessions.ts
git commit -m "feat: resumen de ronda que encadena la siguiente sin apretar nada"
```

---

### Task 14: Pantallas 04 Mis mazos y 05 Editor de mazo

**Files:**
- Create: `app/mazos/page.tsx`, `app/mazos/[id]/page.tsx`
- Create: `components/DeckList.tsx`, `components/DeckEditor.tsx`
- Modify: ninguno

**Interfaces:**
- Consumes: `listDecks`, `getDeck`, `DeckSummary`, `GroupSummary` (Task 8); `ListRow`, `BuiltinDot` (Task 10); `toRomaji` (Task 4); las rutas de la Task 9.
- Produces: `DeckEditor`, que en la Task 16 suma el panel de diccionario. El botón que lo abre ya se deja puesto acá, deshabilitado hasta esa tarea.

- [ ] **Step 1: Escribir la lista de mazos**

`components/DeckList.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Stack, Group, Text, Button, Paper, Divider, Modal, TextInput } from '@mantine/core';
import { ListRow } from './ListRow';
import { BuiltinDot } from './BuiltinDot';
import type { DeckSummary } from '@/lib/services/decks';

export function DeckList({ decks }: { decks: DeckSummary[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [groups, setGroups] = useState('');
  const [confirm, setConfirm] = useState<DeckSummary | null>(null);

  async function create() {
    const res = await fetch('/api/decks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name,
        groups: groups.split(',').map((g) => g.trim()).filter(Boolean),
      }),
    });
    if (res.ok) {
      setCreating(false);
      setName('');
      setGroups('');
      router.refresh();
    }
  }

  async function remove(d: DeckSummary) {
    const res = await fetch(`/api/decks/${d.id}`, { method: 'DELETE' });
    if (res.ok) { setConfirm(null); router.refresh(); }
  }

  const totalCards = decks.reduce((n, d) => n + d.cardCount, 0);

  return (
    <Stack gap="md">
      <Group>
        <Text size="xs" tt="uppercase" c="dimmed">
          {decks.length} mazos · {totalCards} cartas
        </Text>
        <Button ml="auto" size="compact-sm" onClick={() => setCreating(true)}>
          + Nuevo mazo
        </Button>
      </Group>

      <Paper withBorder>
        {decks.map((d, i) => (
          <div key={d.id}>
            {i > 0 && <Divider />}
            <ListRow
              icon={d.name === 'Hiragana' ? 'あ' : d.name === 'Katakana' ? 'ア' : '▤'}
              title={<>{d.name}{d.isBuiltin && <BuiltinDot />}</>}
              subtitle={`${d.groupCount} grupos · ${d.cardCount} cartas`}
              actions={
                <>
                  {/* Los incluidos no muestran Borrar: eso ya dice que no se pueden borrar. */}
                  {!d.isBuiltin && (
                    <Button variant="subtle" color="shu" size="compact-xs" onClick={() => setConfirm(d)}>
                      Borrar
                    </Button>
                  )}
                  <Button variant="subtle" size="compact-xs" onClick={() => router.push(`/mazos/${d.id}`)}>
                    {d.isBuiltin ? 'Ver cartas' : 'Editar'}
                  </Button>
                  <Button variant="default" size="compact-xs" onClick={() => router.push('/')}>
                    Practicar
                  </Button>
                </>
              }
            />
          </div>
        ))}
      </Paper>

      <Modal opened={creating} onClose={() => setCreating(false)} title="Nuevo mazo">
        <Stack>
          <TextInput
            id="deck-name" label="Nombre" placeholder="Comidas"
            value={name} onChange={(e) => setName(e.currentTarget.value)}
          />
          <TextInput
            id="deck-groups" label="Grupos (opcional, separados por coma)"
            placeholder="Pescado, Verdura, Frutas"
            description="Si lo dejás vacío se crea un solo grupo y la app esconde ese nivel."
            value={groups} onChange={(e) => setGroups(e.currentTarget.value)}
          />
          <Button onClick={create} disabled={!name.trim()}>Crear</Button>
        </Stack>
      </Modal>

      <Modal opened={!!confirm} onClose={() => setConfirm(null)} title="¿Borrar el mazo?">
        <Stack>
          {/* Las cascadas son reales: hay que mostrarlas antes de ejecutarlas. */}
          <Text size="sm">
            Se va <b>{confirm?.name}</b>, sus {confirm?.groupCount} grupos,
            sus {confirm?.cardCount} cartas y todos los intentos registrados.
          </Text>
          <Group>
            <Button variant="default" onClick={() => setConfirm(null)}>Cancelar</Button>
            <Button color="shu" onClick={() => confirm && remove(confirm)}>Borrar</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
```

`app/mazos/page.tsx`:

```tsx
import { db } from '@/lib/db/client';
import { listDecks } from '@/lib/services/decks';
import { DeckList } from '@/components/DeckList';

export default function Page() {
  return <DeckList decks={listDecks(db)} />;
}
```

- [ ] **Step 2: Escribir el editor**

`components/DeckEditor.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Stack, Group, Text, Button, Paper, TextInput, Divider, Box } from '@mantine/core';
import { toRomaji } from '@/lib/kana/transliterate';
import type { DeckSummary } from '@/lib/services/decks';

export type EditorCard = {
  id: number; prompt: string; meaning: string | null; primary: string; groupId: number;
};

export function DeckEditor({
  deck, cards,
}: { deck: DeckSummary; cards: EditorCard[] }) {
  const router = useRouter();
  // El panel de diccionario se conecta en la Task 16.
  const [dictOpen, setDictOpen] = useState(false);
  const [groupId, setGroupId] = useState(deck.groups[0]?.id ?? 0);
  const [prompt, setPrompt] = useState('');
  const [romaji, setRomaji] = useState('');
  const [meaning, setMeaning] = useState('');
  // Si el usuario tocó el romaji, dejamos de pisárselo con el autocompletado.
  const [romajiTouched, setRomajiTouched] = useState(false);

  // Un solo grupo: se esconde la columna y se ve una lista plana.
  const showGroups = deck.groups.length > 1;
  const visible = cards.filter((c) => c.groupId === groupId);

  function onPrompt(value: string) {
    setPrompt(value);
    if (!romajiTouched) setRomaji(toRomaji(value));
  }

  async function add() {
    const res = await fetch(`/api/groups/${groupId}/cards`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt, meaning: meaning || null, answers: [romaji] }),
    });
    if (res.ok) {
      setPrompt(''); setRomaji(''); setMeaning(''); setRomajiTouched(false);
      router.refresh();
    }
  }

  async function removeCard(id: number) {
    const res = await fetch(`/api/cards/${id}`, { method: 'DELETE' });
    if (res.ok) router.refresh();
  }

  async function addGroup() {
    const name = window.prompt('Nombre del grupo');
    if (!name) return;
    const res = await fetch(`/api/decks/${deck.id}/groups`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) router.refresh();
  }

  return (
    <Stack gap="md">
      <Group>
        <Text c="dimmed" size="sm">Mazos /</Text>
        <Text fw={700} className="kana">{deck.name}</Text>
        <Group ml="auto" gap="xs">
          {!deck.isBuiltin && (
            <Button variant="default" size="compact-sm" onClick={() => setDictOpen(true)}>
              Buscar en el diccionario
            </Button>
          )}
        </Group>
      </Group>

      <Group align="flex-start" wrap="wrap" gap="md">
        {showGroups && (
          <Stack gap={3} w={180}>
            <Text size="xs" tt="uppercase" c="dimmed">Grupos</Text>
            {deck.groups.map((g) => (
              <Button
                key={g.id}
                variant={g.id === groupId ? 'light' : 'subtle'}
                justify="space-between"
                rightSection={<Text size="xs" c="dimmed" className="tabular">{g.cardCount}</Text>}
                onClick={() => setGroupId(g.id)}
                fullWidth
              >
                {g.name}
              </Button>
            ))}
            <Button variant="subtle" c="dimmed" onClick={addGroup} fullWidth>+ Nuevo grupo</Button>
          </Stack>
        )}

        <Stack gap="sm" style={{ flex: 1, minWidth: 280 }}>
          <Paper withBorder>
            {visible.map((c, i) => (
              <Box key={c.id}>
                {i > 0 && <Divider />}
                <Group px="sm" py="xs" wrap="nowrap">
                  <Text className="kana" w={90}>{c.prompt}</Text>
                  <Text className="romaji" size="sm" c="dimmed" w={80}>{c.primary}</Text>
                  <Text size="sm" c="dimmed" style={{ flex: 1 }}>{c.meaning ?? ''}</Text>
                  {!deck.isBuiltin && (
                    <Button variant="subtle" color="shu" size="compact-xs" onClick={() => removeCard(c.id)}>
                      ✕
                    </Button>
                  )}
                </Group>
              </Box>
            ))}
            {visible.length === 0 && (
              <Text p="md" size="sm" c="dimmed">Todavía no hay cartas en este grupo.</Text>
            )}
          </Paper>

          {!deck.isBuiltin && (
            <Paper withBorder p="sm">
              <Stack gap="xs">
                <Text size="xs" fw={600}>Nueva palabra</Text>
                <Group gap="xs" align="flex-end" wrap="wrap">
                  <TextInput
                    id="nueva-kana" label="Kana" placeholder="えび" w={130}
                    value={prompt} onChange={(e) => onPrompt(e.currentTarget.value)}
                  />
                  <TextInput
                    id="nueva-romaji" label="Romaji" placeholder="ebi" w={120}
                    value={romaji}
                    onChange={(e) => { setRomajiTouched(true); setRomaji(e.currentTarget.value); }}
                  />
                  <TextInput
                    id="nueva-meaning" label="Significado" placeholder="camarón" w={160}
                    value={meaning} onChange={(e) => setMeaning(e.currentTarget.value)}
                  />
                  <Button onClick={add} disabled={!prompt.trim() || !romaji.trim()}>Agregar</Button>
                </Group>
                <Text size="xs" c="dimmed">
                  El romaji se completa solo desde el kana. Editalo si hace falta:
                  la っ de がっこう o las vocales largas de スーパー no siempre salen solas.
                </Text>
              </Stack>
            </Paper>
          )}
        </Stack>
      </Group>
    </Stack>
  );
}
```

`app/mazos/[id]/page.tsx`:

```tsx
import { db } from '@/lib/db/client';
import { getDeck } from '@/lib/services/decks';
import { cardsForGroups } from '@/lib/services/sessions';
import { DeckEditor, type EditorCard } from '@/components/DeckEditor';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deck = getDeck(db, Number(id));

  // Se reusa cardsForGroups: ya resuelve las respuestas y la primaria.
  const cards: EditorCard[] = deck.groups.flatMap((g) =>
    cardsForGroups(db, [g.id]).map((c) => ({
      id: c.id, prompt: c.prompt, meaning: c.meaning, primary: c.primary, groupId: g.id,
    })),
  );

  return <DeckEditor deck={deck} cards={cards} />;
}
```

- [ ] **Step 3: Probar el flujo completo a mano**

Run: `npm run dev`, abrir `/mazos`

Expected:
- Hiragana y Katakana con **punto** al lado del nombre (no la palabra "sembrado"), sin botón Borrar.
- "Nuevo mazo" → nombre `Comidas`, grupos `Pescado, Verdura, Frutas` → aparece en la lista con 3 grupos y 0 cartas.
- Entrar a Comidas: columna de grupos a la izquierda.
- Escribir `さかな` en Kana → **el campo Romaji se completa solo con `sakana`**.
- Agregar → aparece en la lista.
- Crear un mazo sin grupos → al entrar, la columna izquierda no aparece.
- Borrar Comidas → el diálogo dice cuántos grupos y cartas se lleva.

- [ ] **Step 4: Commit**

```bash
git add app/mazos components/DeckList.tsx components/DeckEditor.tsx
git commit -m "feat: pantallas de mazos y editor con autocompletado de romaji"
```

---

### Task 15: Estadísticas y repaso dirigido

**Files:**
- Create: `lib/services/stats.ts`
- Create: `app/api/stats/overview/route.ts`, `app/api/stats/worst/route.ts`, `app/api/sessions/review/route.ts`
- Create: `app/estadisticas/page.tsx`, `components/StatsBoard.tsx`
- Create: `tests/services/stats.test.ts`

**Interfaces:**
- Consumes: esquema (Task 2); `openRound`, `recordAttempt` (Task 11); `MetricTile` (Task 10).
- Produces:
  ```ts
  export type Window = '7d' | '30d' | 'all';
  export type WorstCard = {
    cardId: number; prompt: string; primary: string;
    seen: number; errors: number; rate: number;
  };
  export type GroupAccuracy = { groupId: number; name: string; accuracy: number; attempts: number };
  export type Overview = {
    attempts: number; correct: number; incorrect: number; accuracy: number;
    rounds: number; mastered: number; totalCards: number;
    byGroup: GroupAccuracy[];
    history: { id: number; startedAt: string; total: number; correct: number;
               incorrect: number; accuracy: number; label: string }[];
  };
  export function worstCards(db: Db, window: Window, limit?: number): WorstCard[];
  export function overview(db: Db, window: Window): Overview;
  export function openReviewRound(db: Db, limit: number): RoundPayload;
  ```

**Reglas del spec que hay que respetar al pie:** el ranking ordena por *tasa*
(errores / veces vista), no por errores absolutos, con **mínimo 5 apariciones**;
"dominada" es ≥5 intentos y ≥90% de aciertos.

- [ ] **Step 1: Escribir el test que falla**

`tests/services/stats.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createDb, migrate, type Db } from '../../lib/db/client';
import { seedKana } from '../../lib/db/seed';
import { listDecks } from '../../lib/services/decks';
import { openRound, recordAttempt, closeRound } from '../../lib/services/sessions';
import { worstCards, overview, openReviewRound } from '../../lib/services/stats';

let db: Db;
let kaGroupId: number;

beforeEach(() => {
  db = createDb(':memory:');
  migrate(db);
  seedKana(db);
  const hira = listDecks(db).find((d) => d.name === 'Hiragana')!;
  kaGroupId = hira.groups.find((g) => g.name === 'か行')!.id;
});

/** Registra `n` intentos de una carta, `errs` de ellos fallados. */
function drill(sessionId: number, cardId: number, n: number, errs: number) {
  for (let i = 0; i < n; i++) {
    recordAttempt(db, {
      sessionId, cardId, typed: i < errs ? 'zz' : 'ok',
      isCorrect: i >= errs, revealed: false, ms: 100,
    });
  }
}

describe('worstCards', () => {
  it('ordena por tasa de error, no por errores absolutos', () => {
    const r = openRound(db, [kaGroupId]);
    const [a, b] = r.cards;
    drill(r.sessionId, a.id, 40, 8);  // 20% de error, 8 errores
    drill(r.sessionId, b.id, 10, 5);  // 50% de error, 5 errores
    closeRound(db, r.sessionId);

    const worst = worstCards(db, 'all');
    // b tiene menos errores absolutos pero peor tasa: va primero.
    expect(worst[0].cardId).toBe(b.id);
    expect(worst[0].rate).toBeCloseTo(0.5);
  });

  it('excluye las cartas con menos de 5 apariciones', () => {
    const r = openRound(db, [kaGroupId]);
    drill(r.sessionId, r.cards[0].id, 4, 4);  // 100% de error pero solo 4 veces
    drill(r.sessionId, r.cards[1].id, 10, 3);
    closeRound(db, r.sessionId);

    const worst = worstCards(db, 'all');
    // Una carta nueva no puede encabezar el ranking por accidente.
    expect(worst.map((w) => w.cardId)).not.toContain(r.cards[0].id);
    expect(worst.map((w) => w.cardId)).toContain(r.cards[1].id);
  });

  it('trae el prompt y la romanización primaria', () => {
    const r = openRound(db, [kaGroupId]);
    drill(r.sessionId, r.cards[0].id, 10, 5);
    closeRound(db, r.sessionId);

    const w = worstCards(db, 'all')[0];
    expect(w.prompt).toBe(r.cards[0].prompt);
    expect(w.primary).toBe(r.cards[0].primary);
    expect(w.seen).toBe(10);
    expect(w.errors).toBe(5);
  });

  it('respeta el límite', () => {
    const r = openRound(db, [kaGroupId]);
    for (const c of r.cards) drill(r.sessionId, c.id, 10, 5);
    closeRound(db, r.sessionId);
    expect(worstCards(db, 'all', 2)).toHaveLength(2);
  });
});

describe('overview', () => {
  it('cuenta intentos, aciertos y accuracy global', () => {
    const r = openRound(db, [kaGroupId]);
    drill(r.sessionId, r.cards[0].id, 10, 2);
    closeRound(db, r.sessionId);

    const o = overview(db, 'all');
    expect(o.attempts).toBe(10);
    expect(o.correct).toBe(8);
    expect(o.incorrect).toBe(2);
    expect(o.accuracy).toBeCloseTo(0.8);
    expect(o.rounds).toBe(1);
  });

  it('cuenta como dominada una carta con 5+ intentos y 90%+ de aciertos', () => {
    const r = openRound(db, [kaGroupId]);
    drill(r.sessionId, r.cards[0].id, 10, 1);  // 90% → dominada
    drill(r.sessionId, r.cards[1].id, 10, 5);  // 50% → no
    drill(r.sessionId, r.cards[2].id, 3, 0);   // 100% pero pocas veces → no
    closeRound(db, r.sessionId);

    expect(overview(db, 'all').mastered).toBe(1);
  });

  it('calcula accuracy por grupo', () => {
    const r = openRound(db, [kaGroupId]);
    drill(r.sessionId, r.cards[0].id, 10, 2);
    closeRound(db, r.sessionId);

    const g = overview(db, 'all').byGroup.find((x) => x.groupId === kaGroupId)!;
    expect(g.name).toBe('か行');
    expect(g.accuracy).toBeCloseTo(0.8);
  });

  it('devuelve ceros sin datos, no NaN', () => {
    const o = overview(db, 'all');
    expect(o.attempts).toBe(0);
    expect(o.accuracy).toBe(0);
    expect(o.byGroup).toEqual([]);
    expect(o.history).toEqual([]);
  });
});

describe('openReviewRound', () => {
  it('arma una ronda con las peores cartas y la marca como repaso', () => {
    const r = openRound(db, [kaGroupId]);
    drill(r.sessionId, r.cards[0].id, 10, 6);
    drill(r.sessionId, r.cards[1].id, 10, 5);
    closeRound(db, r.sessionId);

    const review = openReviewRound(db, 2);
    expect(review.cards).toHaveLength(2);
    expect(review.cards.map((c) => c.id).sort())
      .toEqual([r.cards[0].id, r.cards[1].id].sort());
  });

  it('falla si todavía no hay errores que repasar', () => {
    expect(() => openReviewRound(db, 20)).toThrow();
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run tests/services/stats.test.ts`
Expected: FAIL — `Cannot find module '../../lib/services/stats'`

- [ ] **Step 3: Escribir el service**

`lib/services/stats.ts`:

```ts
import { gte, desc, inArray } from 'drizzle-orm';
import type { Db } from '../db/client';
import { attempt, card, cardAnswer, cardGroup, session, sessionGroup } from '../db/schema';
import { badRequest } from './errors';
import { cardsForGroups, type RoundPayload } from './sessions';
import { shuffle } from '../quiz/engine';

export type Window = '7d' | '30d' | 'all';

/** Mínimo de apariciones para entrar al ranking: una carta nueva no lo encabeza. */
const MIN_SEEN = 5;
/** Dominada: al menos 5 intentos y 90% de aciertos. */
const MASTERY_MIN_ATTEMPTS = 5;
const MASTERY_ACCURACY = 0.9;

function since(window: Window): string | null {
  if (window === 'all') return null;
  const days = window === '7d' ? 7 : 30;
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function attemptsIn(db: Db, window: Window) {
  const from = since(window);
  const q = db.select().from(attempt);
  return from ? q.where(gte(attempt.createdAt, from)).all() : q.all();
}

export type WorstCard = {
  cardId: number; prompt: string; primary: string;
  seen: number; errors: number; rate: number;
};

export function worstCards(db: Db, window: Window, limit = 20): WorstCard[] {
  const rows = attemptsIn(db, window);
  if (rows.length === 0) return [];

  const agg = new Map<number, { seen: number; errors: number }>();
  for (const r of rows) {
    const a = agg.get(r.cardId) ?? { seen: 0, errors: 0 };
    a.seen += 1;
    if (!r.isCorrect) a.errors += 1;
    agg.set(r.cardId, a);
  }

  const eligible = [...agg.entries()]
    .filter(([, a]) => a.seen >= MIN_SEEN && a.errors > 0)
    // Por TASA, no por errores absolutos: 8 de 40 es mejor que 5 de 10.
    .sort((x, y) => y[1].errors / y[1].seen - x[1].errors / x[1].seen)
    .slice(0, limit);

  if (eligible.length === 0) return [];

  const ids = eligible.map(([id]) => id);
  const cards = db.select().from(card).where(inArray(card.id, ids)).all();
  const answers = db.select().from(cardAnswer).where(inArray(cardAnswer.cardId, ids)).all();

  return eligible.map(([cardId, a]) => {
    const c = cards.find((x) => x.id === cardId);
    const own = answers.filter((x) => x.cardId === cardId);
    return {
      cardId,
      prompt: c?.prompt ?? '',
      primary: (own.find((x) => x.isPrimary) ?? own[0])?.romaji ?? '',
      seen: a.seen,
      errors: a.errors,
      rate: a.errors / a.seen,
    };
  });
}

export type GroupAccuracy = { groupId: number; name: string; accuracy: number; attempts: number };

export type Overview = {
  attempts: number; correct: number; incorrect: number; accuracy: number;
  rounds: number; mastered: number; totalCards: number;
  byGroup: GroupAccuracy[];
  history: { id: number; startedAt: string; total: number; correct: number;
             incorrect: number; accuracy: number; label: string }[];
};

export function overview(db: Db, window: Window): Overview {
  const rows = attemptsIn(db, window);
  const correct = rows.filter((r) => r.isCorrect).length;
  const totalCards = db.select().from(card).all().length;

  // Dominio por carta.
  const perCard = new Map<number, { n: number; ok: number }>();
  for (const r of rows) {
    const a = perCard.get(r.cardId) ?? { n: 0, ok: 0 };
    a.n += 1;
    if (r.isCorrect) a.ok += 1;
    perCard.set(r.cardId, a);
  }
  const mastered = [...perCard.values()]
    .filter((a) => a.n >= MASTERY_MIN_ATTEMPTS && a.ok / a.n >= MASTERY_ACCURACY).length;

  // Accuracy por grupo: attempt → card → card_group.
  const cards = db.select().from(card).all();
  const groupOf = new Map(cards.map((c) => [c.id, c.groupId]));
  const perGroup = new Map<number, { n: number; ok: number }>();
  for (const r of rows) {
    const gid = groupOf.get(r.cardId);
    if (gid === undefined) continue;
    const a = perGroup.get(gid) ?? { n: 0, ok: 0 };
    a.n += 1;
    if (r.isCorrect) a.ok += 1;
    perGroup.set(gid, a);
  }

  const groupIds = [...perGroup.keys()];
  const groups = groupIds.length
    ? db.select().from(cardGroup).where(inArray(cardGroup.id, groupIds)).all()
    : [];

  const byGroup: GroupAccuracy[] = groupIds.map((gid) => {
    const a = perGroup.get(gid)!;
    return {
      groupId: gid,
      name: groups.find((g) => g.id === gid)?.name ?? '',
      accuracy: a.ok / a.n,
      attempts: a.n,
    };
  }).sort((x, y) => x.accuracy - y.accuracy);

  // Historial: solo rondas cerradas.
  const from = since(window);
  const all = db.select().from(session).orderBy(desc(session.startedAt)).all();
  const closed = all
    .filter((s) => s.finishedAt !== null && (!from || s.startedAt >= from))
    .slice(0, 20);

  const links = closed.length
    ? db.select().from(sessionGroup).where(inArray(sessionGroup.sessionId, closed.map((s) => s.id))).all()
    : [];
  const allGroups = db.select().from(cardGroup).all();

  const history = closed.map((s) => {
    const n = s.correct + s.incorrect;
    const gids = links.filter((l) => l.sessionId === s.id).map((l) => l.groupId);
    const names = gids.map((g) => allGroups.find((x) => x.id === g)?.name).filter(Boolean);
    return {
      id: s.id, startedAt: s.startedAt, total: s.total,
      correct: s.correct, incorrect: s.incorrect,
      accuracy: n === 0 ? 0 : s.correct / n,
      label: s.mode === 'review'
        ? `Repaso · ${s.total} cartas`
        : `${gids.length} grupos · ${s.total} cartas${names[0] ? ` (${names[0]}…)` : ''}`,
    };
  });

  return {
    attempts: rows.length,
    correct,
    incorrect: rows.length - correct,
    accuracy: rows.length === 0 ? 0 : correct / rows.length,
    rounds: closed.length,
    mastered,
    totalCards,
    byGroup,
    history,
  };
}

/** Arma una ronda con las peores cartas. Es el repaso dirigido. */
export function openReviewRound(db: Db, limit: number): RoundPayload {
  const worst = worstCards(db, '30d', limit);
  if (worst.length === 0) throw badRequest('Todavía no hay errores suficientes para repasar');

  const ids = new Set(worst.map((w) => w.cardId));
  const cards = db.select().from(card).where(inArray(card.id, [...ids])).all();
  const groupIds = [...new Set(cards.map((c) => c.groupId))];

  // Se reusa cardsForGroups y después se filtra a las cartas del ranking.
  const pool = cardsForGroups(db, groupIds).filter((c) => ids.has(c.id));

  let sessionId = 0;
  db.transaction((tx) => {
    const t = tx as Db;
    const [s] = t.insert(session).values({ mode: 'review', total: pool.length }).returning().all();
    sessionId = s.id;
    for (const gid of groupIds) {
      t.insert(sessionGroup).values({ sessionId: s.id, groupId: gid }).run();
    }
  });

  return { sessionId, groupIds, cards: shuffle(pool) };
}
```

- [ ] **Step 4: Escribir las rutas**

`app/api/stats/overview/route.ts`:

```ts
import { db } from '@/lib/db/client';
import { route } from '@/lib/api/handler';
import { overview, type Window } from '@/lib/services/stats';

export const GET = (req: Request) =>
  route(() => {
    const w = new URL(req.url).searchParams.get('window');
    const window: Window = w === '7d' || w === 'all' ? w : '30d';
    return overview(db, window);
  });
```

`app/api/stats/worst/route.ts`:

```ts
import { db } from '@/lib/db/client';
import { route } from '@/lib/api/handler';
import { worstCards, type Window } from '@/lib/services/stats';

export const GET = (req: Request) =>
  route(() => {
    const params = new URL(req.url).searchParams;
    const w = params.get('window');
    const window: Window = w === '7d' || w === 'all' ? w : '30d';
    const limit = Math.min(Number(params.get('limit') ?? 20) || 20, 100);
    return worstCards(db, window, limit);
  });
```

`app/api/sessions/review/route.ts`:

```ts
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { route } from '@/lib/api/handler';
import { openReviewRound } from '@/lib/services/stats';

const schema = z.object({ limit: z.number().int().positive().max(100).default(20) });

export const POST = async (req: Request) =>
  route(async () => {
    const body = await req.json().catch(() => ({}));
    return openReviewRound(db, schema.parse(body).limit);
  }, 201);
```

- [ ] **Step 5: Escribir la pantalla**

`components/StatsBoard.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Stack, Group, SegmentedControl, Button, SimpleGrid, Paper, Text, Progress, Divider } from '@mantine/core';
import { MetricTile } from './MetricTile';
import type { Overview, WorstCard } from '@/lib/services/stats';

/** Semáforo del spec: verde ≥85, ámbar 60–85, rojo <60. */
function tone(acc: number) {
  if (acc >= 0.85) return 'jade.6';
  if (acc >= 0.6) return 'yellow.6';
  return 'shu.6';
}

export function StatsBoard({
  overview: o, worst, window,
}: { overview: Overview; worst: WorstCard[]; window: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function review() {
    setBusy(true);
    const res = await fetch('/api/sessions/review', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ limit: 20 }),
    });
    setBusy(false);
    if (!res.ok) return;
    sessionStorage.setItem('ronda', JSON.stringify(await res.json()));
    router.push('/practicar');
  }

  return (
    <Stack gap="md">
      <Group>
        <SegmentedControl
          value={window}
          onChange={(v) => router.push(`/estadisticas?window=${v}`)}
          data={[
            { value: '7d', label: '7 días' },
            { value: '30d', label: '30 días' },
            { value: 'all', label: 'Siempre' },
          ]}
        />
        <Button ml="auto" onClick={review} loading={busy} disabled={worst.length === 0}>
          Practicar mis {Math.min(20, worst.length)} peores →
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
        <MetricTile label="Aciertos" value={`${Math.round(o.accuracy * 100)}%`}
          hint={`${o.correct} de ${o.attempts}`} />
        <MetricTile label="Errores" value={o.incorrect} tone="bad" />
        <MetricTile label="Rondas" value={o.rounds} />
        <MetricTile label="Dominadas" value={o.mastered} hint={`de ${o.totalCards} cartas`} />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Paper withBorder p="sm">
          <Stack gap="xs">
            <Group>
              <Text size="xs" fw={600}>Las que más errás</Text>
              <Text size="xs" c="dimmed" ml="auto">errores / veces vista</Text>
            </Group>
            {worst.length === 0 && <Text size="sm" c="dimmed">Todavía no hay datos suficientes.</Text>}
            {worst.slice(0, 8).map((w) => (
              <Group key={w.cardId} gap="sm" wrap="nowrap">
                <Text className="kana" w={44}>{w.prompt}</Text>
                <Text className="romaji" size="xs" c="dimmed" w={54}>{w.primary}</Text>
                <Progress value={w.rate * 100} color="shu.6" size="xs" style={{ flex: 1 }} />
                <Text size="xs" c="dimmed" className="tabular">{w.errors}/{w.seen}</Text>
              </Group>
            ))}
          </Stack>
        </Paper>

        <Paper withBorder p="sm">
          <Stack gap="xs">
            <Text size="xs" fw={600}>Aciertos por grupo</Text>
            {o.byGroup.length === 0 && <Text size="sm" c="dimmed">Todavía no practicaste nada.</Text>}
            {o.byGroup.slice(0, 10).map((g) => (
              <Group key={g.groupId} gap="sm" wrap="nowrap">
                <Text className="kana" size="sm" w={66} c="dimmed">{g.name}</Text>
                <Progress value={g.accuracy * 100} color={tone(g.accuracy)} size="sm" style={{ flex: 1 }} />
                <Text size="xs" c="dimmed" className="tabular" w={34} ta="right">
                  {Math.round(g.accuracy * 100)}%
                </Text>
              </Group>
            ))}
          </Stack>
        </Paper>
      </SimpleGrid>

      <Paper withBorder p="sm">
        <Stack gap={6}>
          <Text size="xs" fw={600}>Historial de rondas</Text>
          {o.history.length === 0 && <Text size="sm" c="dimmed">Sin rondas terminadas.</Text>}
          {o.history.map((h, i) => (
            <div key={h.id}>
              {i > 0 && <Divider mb={6} />}
              <Group gap="sm" wrap="nowrap">
                <Text size="xs" c="dimmed" w={130}>
                  {new Date(h.startedAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                </Text>
                <Text size="xs" c="dimmed" style={{ flex: 1 }}>{h.label}</Text>
                <Text size="xs" className="tabular" w={44} ta="right">
                  {Math.round(h.accuracy * 100)}%
                </Text>
              </Group>
            </div>
          ))}
        </Stack>
      </Paper>
    </Stack>
  );
}
```

`app/estadisticas/page.tsx`:

```tsx
import { db } from '@/lib/db/client';
import { overview, worstCards, type Window } from '@/lib/services/stats';
import { StatsBoard } from '@/components/StatsBoard';

export default async function Page({
  searchParams,
}: { searchParams: Promise<{ window?: string }> }) {
  const { window: raw } = await searchParams;
  const window: Window = raw === '7d' || raw === 'all' ? raw : '30d';

  return (
    <StatsBoard
      overview={overview(db, window)}
      worst={worstCards(db, window)}
      window={window}
    />
  );
}
```

- [ ] **Step 6: Correr los tests y verificar que pasan**

Run: `npx vitest run tests/services/stats.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 7: Verificar a ojo**

Run: `npm run dev`. Hacer dos o tres rondas errando a propósito varias veces la
misma carta, después abrir `/estadisticas`.

Expected: los cuatro tiles con números reales, la carta más errada arriba del
ranking, las barras por grupo con el semáforo, el historial con las rondas.
"Practicar mis N peores" arranca una ronda solo con esas cartas.

- [ ] **Step 8: Commit**

```bash
git add lib/services/stats.ts app/api/stats app/api/sessions/review app/estadisticas components/StatsBoard.tsx tests/services/stats.test.ts
git commit -m "feat: estadísticas con ranking por tasa de error y repaso dirigido"
```

---

### Task 16: Diccionario JMdict

**Files:**
- Create: `scripts/seed-dict.ts`, `lib/db/dict-fts.ts`, `lib/services/dict.ts`
- Create: `app/api/dict/search/route.ts`, `components/dict/DictSearchPanel.tsx`
- Modify: `app/mazos/[id]/page.tsx` y `components/DeckEditor.tsx` (abrir el panel)
- Create: `tests/services/dict.test.ts`

**Interfaces:**
- Consumes: `dictEntry`, `dictGloss` (Task 2); `toRomaji` (Task 4); `createCard` (Task 8).
- Produces:
  ```ts
  export type DictHit = {
    id: number; kana: string; kanji: string | null; romaji: string;
    pos: string | null; gloss: string; lang: 'spa' | 'eng';
  };
  export function createDictFts(db: Db): void;
  export function searchDict(db: Db, query: string, limit?: number): DictHit[];
  ```

**Estrategia del spec:** español primero; si hay pocos resultados, completar con
inglés marcado como tal. JMdict tiene ~39.000 entradas en castellano sobre más
de 200.000 totales.

- [ ] **Step 1: Escribir el test que falla**

`tests/services/dict.test.ts`:

```ts
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
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run tests/services/dict.test.ts`
Expected: FAIL — módulos inexistentes.

- [ ] **Step 3: Escribir la tabla FTS y el service**

Drizzle no modela tablas virtuales, así que el FTS5 se crea con SQL crudo.

`lib/db/dict-fts.ts`:

```ts
import { sql } from 'drizzle-orm';
import type { Db } from './client';

/**
 * Tabla FTS5 sobre las glosas, con contenido externo: no duplica el texto,
 * apunta a dict_gloss. Los triggers la mantienen sincronizada.
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
```

`lib/services/dict.ts`:

```ts
import { sql } from 'drizzle-orm';
import type { Db } from '../db/client';

export type DictHit = {
  id: number; kana: string; kanji: string | null; romaji: string;
  pos: string | null; gloss: string; lang: 'spa' | 'eng';
};

/**
 * FTS5 trata comillas, asteriscos y paréntesis como sintaxis de consulta.
 * Se envuelve cada término entre comillas dobles y se duplican las internas.
 */
function toMatchQuery(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => `"${t.replace(/"/g, '""')}"*`)
    .join(' ');
}

export function searchDict(db: Db, query: string, limit = 30): DictHit[] {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const match = toMatchQuery(trimmed);
  if (!match) return [];

  // Español primero, después inglés. Dentro de cada idioma, por relevancia
  // de FTS5 y priorizando las palabras comunes.
  const rows = db.all<{
    id: number; kana: string; kanji: string | null; romaji: string;
    pos: string | null; gloss: string; lang: 'spa' | 'eng';
  }>(sql`
    SELECT e.id, e.kana, e.kanji, e.romaji, e.pos, g.text AS gloss, g.lang
    FROM dict_fts f
    JOIN dict_gloss g ON g.id = f.rowid
    JOIN dict_entry e ON e.id = g.entry_id
    WHERE dict_fts MATCH ${match}
    ORDER BY (g.lang = 'spa') DESC, e.is_common DESC, rank
    LIMIT ${limit * 3}
  `);

  // Una entrada puede tener varias glosas que matchean: se queda la mejor.
  const seen = new Set<number>();
  const out: DictHit[] = [];
  for (const r of rows) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    out.push(r);
    if (out.length >= limit) break;
  }
  return out;
}
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `npx vitest run tests/services/dict.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Escribir el import de JMdict**

`scripts/seed-dict.ts`:

```ts
import { readFileSync } from 'node:fs';
import { db, migrate } from '../lib/db/client';
import { createDictFts } from '../lib/db/dict-fts';
import { dictEntry, dictGloss } from '../lib/db/schema';
import { toRomaji } from '../lib/kana/transliterate';

/**
 * Importa un build de scriptin/jmdict-simplified.
 * Descargar de https://github.com/scriptin/jmdict-simplified/releases
 * el archivo jmdict-spa-common-*.json (y opcionalmente jmdict-eng-common-*.json)
 * a data/.
 *
 * Uso: npm run db:seed:dict -- data/jmdict-spa-common.json spa
 */
type JmdictFile = {
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

const [file, lang] = process.argv.slice(2);
if (!file || (lang !== 'spa' && lang !== 'eng')) {
  console.error('uso: tsx scripts/seed-dict.ts <archivo.json> <spa|eng>');
  process.exit(1);
}

migrate(db);
createDictFts(db);

const data = JSON.parse(readFileSync(file, 'utf8')) as JmdictFile;
let entries = 0;
let glosses = 0;

db.transaction((tx) => {
  for (const w of data.words) {
    const kana = w.kana[0]?.text;
    if (!kana) continue;

    const texts = w.sense.flatMap((s) => s.gloss.filter((g) => g.lang === lang).map((g) => g.text));
    if (texts.length === 0) continue;

    const [e] = tx.insert(dictEntry).values({
      kana,
      kanji: w.kanji[0]?.text ?? null,
      // JMdict no trae romaji: se genera desde la lectura en kana.
      romaji: toRomaji(kana),
      pos: w.sense[0]?.partOfSpeech?.[0] ?? null,
      isCommon: w.kana[0]?.common ?? false,
    }).returning().all();
    entries += 1;

    for (const text of texts) {
      tx.insert(dictGloss).values({ entryId: e.id, lang, text }).run();
      glosses += 1;
    }
  }
});

console.log(`diccionario ${lang}: ${entries} entradas, ${glosses} glosas`);
```

Agregar a `package.json`: `"db:seed:dict": "tsx scripts/seed-dict.ts"`

Y agregar la creación de la tabla FTS a `scripts/migrate.ts`, para que exista en
toda base aunque nunca se importe el diccionario:

```ts
import { db, migrate } from '../lib/db/client';
import { createDictFts } from '../lib/db/dict-fts';

migrate(db);
createDictFts(db);
console.log('migraciones aplicadas');
```

- [ ] **Step 6: Correr el import**

```bash
mkdir -p data
# Descargar jmdict-spa-common-*.json de las releases de scriptin/jmdict-simplified
npm run db:seed:dict -- data/jmdict-spa-common.json spa
```

Expected: `diccionario spa: ~39000 entradas, ...`

Si el `.db` queda incómodamente grande, la alternativa que ya está anotada en el
spec es moverlo a un archivo SQLite aparte.

- [ ] **Step 7: Escribir la ruta y el panel**

`app/api/dict/search/route.ts`:

```ts
import { db } from '@/lib/db/client';
import { route } from '@/lib/api/handler';
import { searchDict } from '@/lib/services/dict';

export const GET = (req: Request) =>
  route(() => {
    const params = new URL(req.url).searchParams;
    const limit = Math.min(Number(params.get('limit') ?? 30) || 30, 100);
    return searchDict(db, params.get('q') ?? '', limit);
  });
```

`components/dict/DictSearchPanel.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal, Stack, TextInput, Group, Text, Button, Badge, Divider } from '@mantine/core';
import type { DictHit } from '@/lib/services/dict';

export function DictSearchPanel({
  opened, onClose, groupId, groupName,
}: { opened: boolean; onClose: () => void; groupId: number; groupName: string }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<DictHit[]>([]);

  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    // Debounce: no hace falta consultar en cada tecla.
    const t = setTimeout(async () => {
      const res = await fetch(`/api/dict/search?q=${encodeURIComponent(q)}`);
      if (res.ok) setHits(await res.json());
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  async function addHit(h: DictHit) {
    const res = await fetch(`/api/groups/${groupId}/cards`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        prompt: h.kana,
        // Las glosas de JMdict a veces son largas: se deja la primera acepción.
        meaning: h.gloss.split(',')[0].trim(),
        answers: [h.romaji],
      }),
    });
    if (res.ok) router.refresh();
  }

  return (
    <Modal opened={opened} onClose={onClose} size="lg" title="Buscar en el diccionario">
      <Stack gap="sm">
        <TextInput
          id="dict-q"
          placeholder="pescado"
          value={q}
          onChange={(e) => setQ(e.currentTarget.value)}
          autoFocus
          rightSection={<Text size="xs" c="dimmed">{hits.length}</Text>}
        />

        {hits.map((h, i) => (
          <div key={h.id}>
            {i > 0 && <Divider mb="sm" />}
            <Group wrap="nowrap" gap="sm">
              <Text className="kana" w={88}>{h.kana}</Text>
              <Text className="kana" c="dimmed" w={54}>{h.kanji ?? ''}</Text>
              <Text className="romaji" size="sm" c="dimmed" w={78}>{h.romaji}</Text>
              <Group gap={6} style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" c="dimmed" truncate>{h.gloss}</Text>
                {h.lang === 'eng' && <Badge size="xs" variant="outline" color="gray">en inglés</Badge>}
              </Group>
              <Button size="compact-xs" onClick={() => addHit(h)}>Agregar</Button>
            </Group>
          </div>
        ))}

        {q.trim().length >= 2 && hits.length === 0 && (
          <Text size="sm" c="dimmed">
            Sin resultados. JMdict tiene unas 39.000 entradas con traducción al
            castellano; para términos poco comunes puede no haber.
          </Text>
        )}

        <Text size="xs" c="dimmed">
          Se agrega al grupo <b>{groupName}</b>. Podés editar kana, romaji y significado después.
        </Text>
      </Stack>
    </Modal>
  );
}
```

- [ ] **Step 8: Conectar el panel al editor**

En `components/DeckEditor.tsx`:

Importar `DictSearchPanel`. El estado `dictOpen` y el botón que lo abre ya
quedaron puestos en la Task 14; solo falta renderizar el panel al final del
`Stack`:

```tsx
<DictSearchPanel
  opened={dictOpen}
  onClose={() => setDictOpen(false)}
  groupId={groupId}
  groupName={deck.groups.find((g) => g.id === groupId)?.name ?? ''}
/>
```

- [ ] **Step 9: Agregar la atribución**

En `components/AppShell.tsx`, al pie del `Main`:

```tsx
<Text size="xs" c="dimmed" ta="center" mt="xl">
  Datos de diccionario de JMdict · © EDRDG · CC BY-SA
</Text>
```

La licencia lo exige y es una línea.

- [ ] **Step 10: Probar a mano**

Run: `npm run dev`, entrar a un mazo propio, "Buscar en el diccionario", escribir
`pescado`.

Expected: aparece さかな / 魚 / sakana / "pescado, pez". "Agregar" la suma al
grupo con el significado recortado a la primera acepción. Un término raro
aparece con el badge "en inglés".

- [ ] **Step 11: Commit**

```bash
git add lib/db/dict-fts.ts lib/services/dict.ts scripts/seed-dict.ts app/api/dict components/dict components/DeckEditor.tsx components/AppShell.tsx tests/services/dict.test.ts
git commit -m "feat: diccionario JMdict local con búsqueda FTS5 en castellano"
```

---

### Task 17: Cierre responsive y pruebas en teléfono

**Files:**
- Create: `playwright.config.ts`, `e2e/quiz.spec.ts`
- Modify: `components/quiz/QuizRunner.tsx` (Visual Viewport API)
- Modify: `components/DeckEditor.tsx` (grupos como chips en teléfono)

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: `npm run e2e`.

**Este es el riesgo número uno del spec.** Si el teclado virtual tapa el input,
la app es inusable en el teléfono y era requisito.

- [ ] **Step 1: Arreglar el alto contra el viewport visual**

En `components/quiz/QuizRunner.tsx`, agregar:

```tsx
// El teclado virtual se come la mitad inferior de la pantalla. Con 100vh el
// input queda tapado abajo del teclado y la app es inusable en el teléfono.
// visualViewport.height sí refleja el espacio que queda libre.
const [viewportH, setViewportH] = useState<number | null>(null);

useEffect(() => {
  const vv = window.visualViewport;
  if (!vv) return;
  const sync = () => setViewportH(vv.height);
  sync();
  vv.addEventListener('resize', sync);
  vv.addEventListener('scroll', sync);
  return () => {
    vv.removeEventListener('resize', sync);
    vv.removeEventListener('scroll', sync);
  };
}, []);
```

y cambiar el `Stack` raíz por:

```tsx
<Stack gap={0} style={{ height: viewportH ? `${viewportH}px` : '100dvh' }}>
```

El kana ya usa `clamp(64px, 18vw, 108px)`, así que se achica solo cuando el
espacio se reduce.

- [ ] **Step 2: Apilar el editor en teléfono**

En `components/DeckEditor.tsx`, reemplazar la columna de grupos por una tira
horizontal cuando la pantalla es chica:

```tsx
import { useMediaQuery } from '@mantine/hooks';
// ...
const isPhone = useMediaQuery('(max-width: 640px)');
```

y envolver la lista de grupos:

```tsx
{showGroups && (
  isPhone ? (
    <Group gap={6} wrap="nowrap" style={{ overflowX: 'auto', width: '100%' }}>
      {deck.groups.map((g) => (
        <Button
          key={g.id}
          variant={g.id === groupId ? 'light' : 'subtle'}
          size="compact-sm"
          onClick={() => setGroupId(g.id)}
          style={{ flex: 'none' }}
        >
          {g.name} ({g.cardCount})
        </Button>
      ))}
    </Group>
  ) : (
    /* la Stack w={180} que ya estaba */
  )
)}
```

- [ ] **Step 3: Instalar y configurar Playwright**

```bash
npm install -D @playwright/test
npx playwright install chromium
```

`playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: { baseURL: 'http://localhost:3000' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] } },
    // El caso difícil: pantalla chica con teclado virtual.
    { name: 'telefono', use: { ...devices['Pixel 7'] } },
  ],
});
```

Agregar a `package.json`: `"e2e": "playwright test"`

- [ ] **Step 4: Escribir el test del flujo del quiz**

`e2e/quiz.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('una ronda completa: errar, corregir y encadenar', async ({ page }) => {
  await page.goto('/');

  // Dejar solo か行 prendido.
  await page.getByRole('button', { name: 'Ninguno' }).click();
  await page.getByLabel('Practicar か行').check();

  await expect(page.getByRole('button', { name: /Empezar ronda/ })).toBeEnabled();
  await page.getByRole('button', { name: /Empezar ronda/ }).click();

  const input = page.locator('#respuesta');
  await expect(input).toBeFocused();

  // Errar a propósito: la carta tiene que quedarse.
  const before = await page.locator('.kana').first().textContent();
  await input.fill('zzz');
  await input.press('Enter');
  const after = await page.locator('.kana').first().textContent();
  expect(after).toBe(before);
  await expect(input).toHaveValue('');
});

test('el botón queda deshabilitado sin ningún grupo', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ninguno' }).click();
  await expect(page.getByRole('button', { name: /Empezar ronda/ })).toBeDisabled();
});

test('el input del quiz no deja que el teléfono lo autocorrija', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ninguno' }).click();
  await page.getByLabel('Practicar か行').check();
  await page.getByRole('button', { name: /Empezar ronda/ }).click();

  const input = page.locator('#respuesta');
  // Sin esto iOS convierte "ka" en "Ka" y se cuentan errores inexistentes.
  await expect(input).toHaveAttribute('autocapitalize', 'off');
  await expect(input).toHaveAttribute('autocorrect', 'off');
  await expect(input).toHaveAttribute('spellcheck', 'false');
});

test('en teléfono el input queda visible con el teclado abierto', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'solo aplica al proyecto de teléfono');

  await page.goto('/');
  await page.getByRole('button', { name: 'Ninguno' }).click();
  await page.getByLabel('Practicar か行').check();
  await page.getByRole('button', { name: /Empezar ronda/ }).click();

  const input = page.locator('#respuesta');
  await input.click();
  // Si el layout usara 100vh, el input quedaría fuera del viewport visible.
  await expect(input).toBeInViewport();
});
```

- [ ] **Step 5: Correr los tests end to end**

Run: `npm run e2e`
Expected: PASS en los dos proyectos, escritorio y teléfono.

> Playwright emula un teléfono pero **no abre un teclado virtual real**. El test
> de viewport detecta un layout roto por `100vh`, no el comportamiento exacto
> de iOS. El riesgo del spec pide verificar además en un iPhone real; anotarlo
> como pendiente manual si no hay uno a mano.

- [ ] **Step 6: Correr toda la suite**

Run: `npm test && npm run e2e`
Expected: todo en verde.

- [ ] **Step 7: Verificar a ojo en pantalla chica**

Run: `npm run dev`, abrir las herramientas de desarrollo en modo teléfono (390px).

Expected:
- Barra de pestañas abajo con Práctica / Mazos / Estadísticas.
- Grilla en 3 columnas con los encabezados de sección visibles.
- En el editor, los grupos como tira horizontal.
- Estadísticas con los tiles en 2×2.
- Sin scroll horizontal en ninguna pantalla.

- [ ] **Step 8: Commit**

```bash
git add playwright.config.ts e2e components package.json
git commit -m "feat: layout de teléfono y pruebas end to end del quiz"
```

---

## Verificación final

- [ ] `npm test` en verde
- [ ] `npm run e2e` en verde
- [ ] `npm run build` sin errores de tipos
- [ ] La grilla muestra las contracciones (きゃ行 y compañía), que era lo que faltaba en jlptcards
- [ ] Errar deja la carta en pantalla; acertarla la saca y no vuelve en esa ronda
- [ ] Terminar una ronda y escribir una letra arranca la siguiente sin tocar ningún botón
- [ ] La palabra "sembrado" no aparece en ningún texto visible
- [ ] Buscar "pescado" en el diccionario devuelve さかな
- [ ] En 390px de ancho no hay scroll horizontal en ninguna pantalla
