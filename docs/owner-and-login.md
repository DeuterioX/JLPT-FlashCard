# De un solo usuario a varios: la cookie primero, el login después

Hoy Kitsune Cards no tiene idea de quién la está usando. Hay una base SQLite con
mazos, rondas e intentos, y todo eso es, implícitamente, de la única persona que
entra. Este documento describe cómo pasar a varios usuarios en dos pasos: primero
una cookie que identifica a una persona sin pedirle nada, y después, encima de
eso, un login con email y contraseña.

El orden importa. Si el primer paso se modela bien, el segundo son tres
sentencias SQL y no hay que mover ni una fila. Si se modela mal, el segundo paso
es una migración de datos. Casi todo este documento es sobre el primer paso.

El diagrama del cambio de esquema está en el canvas:
<https://claude.ai/artifact/72Qhv8PDDTtezCEGeyqaY3>

---

## 1. Qué problema hay que resolver

Ahora mismo, si dos personas entran a la app desde dos navegadores distintos, ven
exactamente lo mismo: los mismos mazos, las mismas estadísticas, el mismo
historial de rondas. No porque haya un usuario compartido, sino porque no hay
ningún usuario: las tablas no tienen ninguna columna que diga de quién es cada
fila.

Lo que queremos es que cada persona tenga sus mazos y sus respuestas, sin
obligarla a registrarse. Que entre, empiece a practicar, y lo que haga quede
asociado a ella. Y que más adelante, si quiere, le ponga email y contraseña a eso
que ya existe, para poder entrar desde el teléfono también.

---

## 2. Cómo funciona una cookie que identifica a alguien

Esta parte es mecánica y conviene tenerla clara antes de mirar el esquema.

### El token y su hash

El servidor genera un número al azar, largo y único. Eso es el **token**:

```ts
const token = randomBytes(32).toString('base64url');
// => "kQ7mZ2xV9pL4nR8tY1wB3cF6hJ0sD5gA7eK2oU4iT8M"
```

Ese token se le manda al navegador en una cookie. El navegador lo devuelve en
cada pedido, automáticamente, para siempre (la cookie no vence). Es la única
copia: el servidor **no guarda el token**.

Lo que el servidor guarda es el *hash* del token: el resultado de pasarlo por
SHA-256, que es una función que va para un solo lado. Con el token podés calcular
el hash; con el hash no podés recuperar el token.

```ts
const hash = createHash('sha256').update(token).digest('hex');
// => "a3f1...9e2c"  (siempre 64 caracteres, siempre el mismo para el mismo token)
```

Cuando llega un pedido, el servidor toma el token de la cookie, le calcula el
hash, y busca ese hash en la base. Si lo encuentra, sabe de quién es el pedido.

### Por qué guardar el hash y no el token

Es el mismo razonamiento que con las contraseñas. Si alguien se lleva una copia
de la base —el archivo `database.db`, un backup, un volcado— con los tokens
adentro podría ponerse esa cookie y entrar como cualquiera. Con los hashes no:
necesitaría invertir SHA-256, que es justamente lo que no se puede.

Cuesta una línea de código y es la diferencia entre "se filtró la base" y "se
filtró la base y además todas las sesiones".

### La cookie en sí

```
Set-Cookie: owner=kQ7mZ2x...; Path=/; HttpOnly; SameSite=Lax; Max-Age=315360000
```

- **`HttpOnly`**: el JavaScript de la página no puede leerla. Si algún día entra
  un script ajeno a la página, no se puede llevar el token.
- **`SameSite=Lax`**: no se manda cuando otro sitio hace un pedido a la app.
- **`Max-Age=315360000`**: diez años. "No vence" en la práctica; los navegadores
  descartan igual cualquier cookie con vencimientos absurdamente largos.
- **`Secure`**: habría que agregarlo cuando la app salga por HTTPS. Hoy anda por
  HTTP en la red local y con `Secure` el navegador no mandaría la cookie nunca.

---

## 3. El modelo de datos

### Primero, una trampa de nombres

**La tabla `session` ya existe en este proyecto y significa otra cosa**: una
ronda de quiz. Tiene `started_at`, `finished_at`, `total`, `correct`,
`incorrect`. Cuando apretás "Comenzar" se crea una fila de `session`; cuando
terminás la ronda se cierra.

Así que la cosa nueva no puede llamarse `session`, ni su tabla, ni su cookie, ni
las funciones que la manejan. Dos significados distintos para la misma palabra en
el mismo repo garantizan que alguien —nosotros, en tres meses— lea una y entienda
la otra.

En todo lo que sigue, la cosa nueva se llama **`owner`**: el dueño de los datos.

### Segundo, la decisión que define el costo del login

La tabla se llama `owner` y **no** `device`, `anon_session` ni `visitor`.

Parece un detalle de nomenclatura y es la decisión más importante del documento.
Una cookie sin vencimiento, con mazos y estadísticas colgados, no describe un
navegador: describe a una persona que todavía no eligió contraseña. Si la tabla
dice eso desde el principio, entonces:

- **Registrarse** es `UPDATE owner SET email=?, password_hash=? WHERE id=?`. La
  fila ya existe. Los mazos y los intentos ya cuelgan de ese `id`. No se mueve
  nada.
- Si en cambio la tabla se llamara `device`, el login traería una tabla `user`
  nueva, y habría que mover datos de un lado al otro, reapuntar claves foráneas,
  y decidir qué pasa con los `device` que quedaron sin `user`.

Mismo esfuerzo hoy. Un día de diferencia mañana.

### Las dos tablas nuevas

**`owner`** — una fila por persona.

| columna | tipo | para qué |
|---|---|---|
| `id` | integer PK | el identificador que va a aparecer en las otras tablas |
| `created_at` | text | cuándo apareció |
| `last_seen_at` | text | último pedido suyo, para poder limpiar dueños que nunca volvieron |

Nace anónima: sin nombre, sin email, sin nada. En el paso 2 gana dos columnas
más.

**`owner_token`** — una fila por cookie viva.

| columna | tipo | para qué |
|---|---|---|
| `token_hash` | text PK | el SHA-256 del token que está en la cookie |
| `owner_id` | integer FK → `owner.id` | de quién es esa cookie |
| `created_at` | text | cuándo se emitió |
| `last_seen_at` | text | último uso de esta cookie en particular |

**Por qué es una tabla y no una columna `token_hash` adentro de `owner`.** Hoy
sobraría: una cookie, un dueño. Pero una columna fija la relación en uno a uno, y
el día que alguien entre con su contraseña desde el teléfono hay que emitirle un
segundo token **sin invalidar el primero**. Con la tabla aparte eso ya funciona.
Además salen gratis dos cosas que si no serían otra migración:

- cerrar la sesión de un navegador = borrar una fila;
- cerrarlas todas = `DELETE FROM owner_token WHERE owner_id = ?`.

### Las tres columnas nuevas en tablas que ya existen

Sólo tres de las siete tablas existentes necesitan saber de quién son. Las otras
cuatro no, y la razón está en la sección siguiente.

**`deck.owner_id`** — anulable, y eso es deliberado.

`NULL` significa **"no es de nadie, y por eso es de todos"**: así quedan Hiragana
y Katakana, que vienen con la app. Existen una sola vez en el servidor y las ve
todo el mundo. Las consultas de mazos pasan a ser "los míos, más los que no son
de nadie":

```sql
WHERE owner_id = ? OR owner_id IS NULL
```

La alternativa era copiarle los dos mazos incluidos a cada dueño nuevo: 233
cartas duplicadas por persona, y la semilla (`npm run db:seed`) dejaría de ser
idempotente. No vale la pena, porque los mazos incluidos son de sólo lectura por
regla del modelo: no hay nada por usuario que guardar sobre ellos.

**`session.owner_id`** — quién jugó la ronda. Con esto Estadísticas deja de
mezclar el historial de dos personas.

**`attempt.owner_id`** — redundante a propósito. Vale la pena explicarlo.

Un intento cuelga de una ronda (`attempt.session_id`), y la ronda ya sabe de
quién es. Técnicamente la columna no hace falta: se podría llegar al dueño con un
*join*. Va igual porque la consulta de Estadísticas lee `attempt` **sola**,
filtrando sólo por fecha:

```ts
// lib/services/stats.ts
function attemptsIn(db: Db, range: StatsRange) {
  const from = since(range);
  const q = db.select().from(attempt);
  return from ? q.where(gte(attempt.createdAt, from)).all() : q.all();
}
```

Para eso existe el índice `ix_attempt_created`, y el comentario que lo acompaña
en el esquema explica que `attempt` es la tabla que peor escala: crece una fila
por cada vez que apretás Enter en el quiz. Si para filtrar por dueño hay que
agregarle un *join* a `session`, la consulta más caliente de la app pasa a tocar
dos tablas en vez de una. Con la columna, sigue siendo recorrer un índice
compuesto `(owner_id, created_at)`.

Guardar el mismo dato en dos lugares (desnormalizar) tiene un costo: hay que
mantenerlo consistente. Acá ese costo es chico y está acotado a un lugar, porque
**el `owner_id` de un intento se copia del de su ronda, del lado del servidor, y
nunca llega del cliente**. Más sobre esto en la sección 7.

### Las cinco tablas que no cambian

`card_group`, `card`, `card_answer` y `session_group` **no llevan columna nueva**.
El dueño se deduce siguiendo la clave foránea hacia arriba:

```
card_answer → card → card_group → deck → owner
```

Una carta es de quien es su mazo. Agregarles `owner_id` sería repetir el mismo
dato en cuatro lugares más, con cuatro oportunidades más de que se desincronice,
y sin ninguna consulta que lo necesite (ninguna de esas cuatro tablas se consulta
sola, siempre se llega a ellas desde su padre).

`dict_entry` y `dict_gloss` tampoco, y éstas nunca van a llevarlo: son el
diccionario JMdict, que es el mismo para todo el mundo, como las tipografías.

**La cookie `grupos`** (la que recuerda qué grupos tenés tildados en la pantalla
de práctica) también se queda igual. Eso es del navegador, no de la cuenta: si
entrás de la compu y del teléfono, es razonable que tengas tildado algo distinto
en cada uno.

---

## 4. Las migraciones

El proyecto usa Drizzle. `npm run db:generate` compara el esquema de
`lib/db/schema.ts` con el estado anterior y escribe un `.sql` nuevo en
`lib/db/migrations/`; `npm run db:migrate` los aplica en orden.

### Paso 1 — `0002_*.sql`

```sql
CREATE TABLE `owner` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` text NOT NULL,
	`last_seen_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `owner_token` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`owner_id` integer NOT NULL REFERENCES `owner`(`id`) ON DELETE CASCADE,
	`created_at` text NOT NULL,
	`last_seen_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ix_owner_token_owner` ON `owner_token` (`owner_id`);
--> statement-breakpoint
ALTER TABLE `deck`    ADD `owner_id` integer REFERENCES `owner`(`id`) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE `session` ADD `owner_id` integer REFERENCES `owner`(`id`) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE `attempt` ADD `owner_id` integer REFERENCES `owner`(`id`) ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX `ix_deck_owner`            ON `deck`    (`owner_id`,`sort_order`);
--> statement-breakpoint
CREATE INDEX `ix_session_owner`         ON `session` (`owner_id`,`started_at`);
--> statement-breakpoint
CREATE INDEX `ix_attempt_owner_created` ON `attempt` (`owner_id`,`created_at`);
```

Detalle de SQLite que explica por qué las tres columnas son anulables:
`ALTER TABLE ... ADD COLUMN` sólo acepta una cláusula `REFERENCES` si el valor
por defecto de la columna es `NULL`. Una columna `NOT NULL` con clave foránea no
se puede agregar a una tabla que ya tiene filas. Acá no es una concesión: para
`deck` queríamos `NULL` igual.

**El backfill, que Drizzle no genera y hay que escribir a mano** en el mismo
archivo. La base del servidor ya tiene mazos propios, rondas e intentos. Con la
migración sola quedan todos en `owner_id = NULL`, o sea confundidos con los mazos
que vienen con la app:

```sql
--> statement-breakpoint
INSERT INTO `owner` (`created_at`,`last_seen_at`) VALUES (datetime('now'),datetime('now'));
--> statement-breakpoint
UPDATE `deck`    SET `owner_id` = (SELECT max(`id`) FROM `owner`) WHERE `is_builtin` = 0;
--> statement-breakpoint
UPDATE `session` SET `owner_id` = (SELECT max(`id`) FROM `owner`);
--> statement-breakpoint
UPDATE `attempt` SET `owner_id` = (SELECT max(`id`) FROM `owner`);
```

Notá el `WHERE is_builtin = 0` en el `UPDATE` de `deck`: Hiragana y Katakana se
quedan en `NULL` a propósito.

Ese dueño nuevo queda **sin ningún token**, así que ningún navegador lo alcanza
todavía. Hay que generar un token a mano una vez, guardar su hash en
`owner_token`, y pegar la cookie en el navegador desde las devtools. Es una base
de un solo usuario: se hace una vez y queda.

### Paso 2 — `0003_*.sql`

```sql
ALTER TABLE `owner` ADD `email` text;
--> statement-breakpoint
ALTER TABLE `owner` ADD `password_hash` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_owner_email` ON `owner` (`email`);
```

Y nada más. Tres sentencias, todas aditivas, ninguna fila que mover.

En SQLite un índice único **ignora los `NULL`**: podés tener mil filas con
`email = NULL` sin que el índice se queje. Por eso todos los dueños anónimos
conviven sin pisarse, y "anónimo" no necesita ninguna bandera: es simplemente un
dueño que todavía tiene el email en `NULL`.

---

## 5. Cómo está armado el código hoy

Esta sección no propone nada; describe lo que hay, para que la siguiente se
entienda.

La app tiene cuatro capas:

```
app/           pantallas (Server Components) y rutas de API
  ↓
lib/services/  la lógica: decks.ts, sessions.ts, stats.ts, dict.ts
  ↓
lib/db/        el esquema y la conexión (Drizzle sobre better-sqlite3)
  ↓
database.db
```

**Un "service" acá es un archivo de funciones sueltas**, no una clase. Cada
función recibe la conexión como primer argumento y hace su consulta:

```ts
// lib/services/decks.ts
export function listDecks(db: Db): DeckSummary[] {
  return buildSummaries(db, db.select().from(deck).orderBy(asc(deck.sortOrder)).all());
}
```

Y quien la llama le pasa la conexión:

```ts
// app/api/decks/route.ts
export const GET = () => route(() => listDecks(db));
```

Hay 18 funciones exportadas así, repartidas en los tres services principales.

**La frontera con la base está limpia, y esto lo verifiqué, no lo supuse.** Las
tablas del esquema las importan exactamente tres archivos: `lib/services/decks.ts`,
`sessions.ts` y `stats.ts`. Ningún componente, ninguna ruta y ninguna pantalla
toca Drizzle, el esquema ni better-sqlite3. Lo único de base que llega a `app/`
es la conexión, y sólo para pasársela al service en el mismo renglón.

**Lo que no hay es una capa de repositorios.** Las consultas están escritas en
línea dentro de cada función, no centralizadas por entidad. En números:

| archivo | `.from()` | `.insert()` | `.update()` | `.delete()` |
|---|---|---|---|---|
| `decks.ts` | 14 | 5 | 3 | 4 |
| `sessions.ts` | 6 | 3 | 1 | — |
| `stats.ts` | 9 | 2 | — | — |

Son unos 47 puntos de consulta. Eso tiene una consecuencia directa para este
trabajo: **el filtro por dueño no se agrega en un lugar, se agrega en cada
consulta que toca una de las tres tablas raíz.** No es difícil, es volumen.

Hay además cuatro consultas escritas como SQL crudo (`db.all(sql\`…\`)`): dos en
`decks.ts` para las previsualizaciones de las cartas y dos en `dict.ts`. Ahí
TypeScript no ayuda, porque para él es un string. Las de `dict.ts` no importan
(el diccionario no tiene dueño) y la de `decks.ts` filtra por grupos que ya
vienen de un mazo verificado, así que hereda el filtro — pero son los cuatro
lugares que hay que revisar con los ojos.

---

## 6. Los cambios en el código, paso 1

### 6.1 `proxy.ts` (nuevo, en la raíz) — crear la cookie

Acá hay una restricción de Next que conviene conocer antes de escribir nada.
**No se puede setear una cookie durante el renderizado de un Server Component.**
De la documentación de esta versión (Next 16.3.5, `cookies`):

> HTTP does not allow setting cookies after streaming starts, so you must use
> `.set` in a Server Function or Route Handler.

Y `app/page.tsx` es justamente un Server Component que llama a `listDecks`. O sea
que la pantalla principal puede *leer* la cookie pero no puede *crearla*.

La solución es interceptar el pedido antes de que llegue a cualquier pantalla.
En Next 16 eso **ya no se llama `middleware.ts`**: se renombró a `proxy.ts`,
y el archivo viejo está deprecado.

```ts
// proxy.ts
import { randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { OWNER_COOKIE, OWNER_COOKIE_MAX_AGE } from './lib/auth/cookie';

/**
 * Emite la cookie del dueño cuando el navegador llega sin ella.
 *
 * Va acá y no en una pantalla porque Next no permite setear cookies mientras
 * renderiza un Server Component: `app/page.tsx` puede leerla pero no crearla.
 *
 * No toca la base a propósito. La documentación de `proxy` avisa que esto corre
 * aparte del código de renderizado y que no hay que apoyarse en módulos
 * compartidos ni en globales -el `db` de este proyecto es un singleton en
 * `globalThis`-. Acá sólo se acuña el token; la fila de `owner` la crea el
 * primer service que necesite saber de quién es el pedido.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(OWNER_COOKIE)) return NextResponse.next();

  const token = randomBytes(32).toString('base64url');

  // En el pedido ADEMÁS de en la respuesta: sin esto, la pantalla que se está
  // renderizando ahora mismo no ve la cookie que recién se creó, y el primer
  // pedido de un navegador nuevo se quedaría sin dueño.
  request.cookies.set(OWNER_COOKIE, token);

  const res = NextResponse.next({ request });
  res.cookies.set({
    name: OWNER_COOKIE,
    value: token,
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: OWNER_COOKIE_MAX_AGE,
    // secure: true -- cuando la app salga por HTTPS. Hoy anda por HTTP en la
    // red local, y con `secure` el navegador no mandaría la cookie nunca.
  });
  return res;
}

export const config = {
  // Sin matcher esto corre también para el CSS, las fuentes y las imágenes.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|webp|woff2)$).*)'],
};
```

Dos cosas que verifiqué en la documentación de esta versión y conviene no
olvidar:

- `proxy` corre en el **runtime de Node por defecto** desde Next 16, así que
  `node:crypto` funciona. (Además, la opción `runtime` no se puede usar en este
  archivo: tirar error es el comportamiento documentado.)
- Sin `matcher`, corre en **todos** los pedidos, incluidos los archivos
  estáticos.

### 6.2 `lib/auth/owner.ts` (nuevo) — resolver el dueño

Ya existe `lib/auth/context.ts`, que es un esqueleto que nadie llama todavía y
que dice exactamente esto en un comentario:

> Seam para el login futuro. Hoy la app es de un solo usuario local. Cuando entre
> el login, esta función lee la cookie de sesión y se agrega `owner_id` a `deck`
> y `session`.

Este archivo lo reemplaza con la versión de verdad:

```ts
// lib/auth/owner.ts
import { cookies } from 'next/headers';
import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db, type Db } from '../db/client';
import { owner, ownerToken } from '../db/schema';
import { OWNER_COOKIE } from './cookie';

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/**
 * El dueño del pedido actual. Lo crea si es su primera vez.
 *
 * Nunca setea la cookie: de eso se encarga `proxy.ts`, que corre antes. Acá la
 * cookie ya existe; lo que puede faltar es su fila en la base.
 */
export async function currentOwnerId(): Promise<number> {
  const raw = (await cookies()).get(OWNER_COOKIE)?.value;
  // Sin cookie no hay nada que resolver. Pasa sólo si alguien pega contra la
  // API sin pasar por el proxy, p. ej. con curl.
  if (!raw) throw new AppError('Falta la cookie de sesión', 401);

  const tokenHash = hashToken(raw);

  const found = db.select({ ownerId: ownerToken.ownerId }).from(ownerToken)
    .where(eq(ownerToken.tokenHash, tokenHash)).all();
  if (found.length > 0) return found[0].ownerId;

  // Primera vez de esta cookie: el dueño y su token nacen juntos o no nacen.
  let id = 0;
  db.transaction((tx) => {
    const t = tx as Db;
    const [o] = t.insert(owner).values({}).returning().all();
    t.insert(ownerToken).values({ tokenHash, ownerId: o.id }).run();
    id = o.id;
  });
  return id;
}
```

### 6.3 Los services llevan `ownerId`

El dueño entra por el mismo lugar que la conexión, al lado:

```ts
// antes
export function listDecks(db: Db): DeckSummary[] { … }

// después
export function listDecks(db: Db, ownerId: number): DeckSummary[] { … }
```

Y quien llama lo resuelve:

```ts
// app/api/decks/route.ts
export const GET = () => route(async () => listDecks(db, await currentOwnerId()));
```

Esto es volumen, no dificultad: agregás el parámetro, TypeScript marca en rojo
cada lugar que falta, y vas apagando rojos hasta que compila. Alcanza a 18
firmas, 13 rutas de API, 3 pantallas y los 225 casos de test (que van a necesitar
un dueño en el fixture).

### 6.4 `lib/db/owned.ts` (nuevo) — la regla en un solo lugar

Como las consultas están en línea en 47 lugares, el `WHERE` del dueño se va a
repetir muchas veces. Lo que **no** conviene repetir es la *regla*:

```ts
// lib/db/owned.ts
import { or, eq, isNull } from 'drizzle-orm';
import { deck, session, attempt } from './schema';

/** «Mío, o de nadie»: un mazo en NULL viene con la app y lo ve todo el mundo. */
export const ownedDeck = (ownerId: number) =>
  or(eq(deck.ownerId, ownerId), isNull(deck.ownerId));

/** Las rondas y los intentos NO tienen el caso «de nadie»: o son tuyos o no. */
export const ownedSession = (ownerId: number) => eq(session.ownerId, ownerId);
export const ownedAttempt = (ownerId: number) => eq(attempt.ownerId, ownerId);
```

Son veinte líneas y es la diferencia entre escribir catorce veces el mismo
`or(...)` —y tener que acertar las catorce el día que cambie la regla de los
mazos incluidos— y escribir catorce veces `ownedDeck(ownerId)`.

Deliberadamente **no** armamos una capa de repositorios ahora. Sería un segundo
cambio grande al mismo tiempo que éste, y el día que algo salga mal no vamos a
saber cuál de los dos lo rompió.

---

## 7. Los tres lugares que van a compilar bien y estar mal

Las nueve sentencias SQL son la parte fácil. Lo que hay que mirar con cuidado son
tres consultas que después del cambio compilan perfecto y devuelven o aceptan
cosas que no deberían. TypeScript no dice nada de ninguna de las tres.

### 7.1 `overview()` cuenta las cartas de todos

En `lib/services/stats.ts`:

```ts
const allCards = db.select().from(card).all();
const totalCards = allCards.length;
```

Sin filtro. Con un solo dueño da bien; con dos, el porcentaje de cartas dominadas
de cada uno se calcula contra el total de cartas **de todo el servidor**. Hay que
llegar a `deck` para filtrar.

### 7.2 `openRound()` acepta grupos ajenos

En `lib/services/sessions.ts`, `openRound` recibe los `groupIds` del cliente y no
verifica de quién son. Hoy es inofensivo. Con varios dueños, un pedido armado a
mano arranca una ronda con los grupos de otra persona.

### 7.3 `recordAttempt()` acepta rondas ajenas

Mismo archivo. Recibe `sessionId` del cliente y lo único que chequea es que la
ronda esté abierta:

```ts
export function recordAttempt(db: Db, input: {
  sessionId: number; cardId: number; …
}): void {
  openSession(db, input.sessionId);
  …
}
```

El `sessionId` viaja por `sessionStorage` en el navegador (ver
`lib/quiz/stored-round.ts`), así que es trivial de cambiar desde las devtools.
Con varios dueños, eso mete intentos en la ronda de otro. `closeRound` tiene la
misma forma.

Y acá está el otro motivo por el que importa: **el `owner_id` del intento se
saca de la fila de `session`, no del pedido.** Si el servidor copiara el dueño de
lo que manda el cliente, la columna desnormalizada se convertiría en una manera
de mentir sobre de quién es un intento.

### La regla general

Con un solo dueño, "verificar que esto es tuyo" no significaba nada y por eso no
está escrito en ninguna parte. Con varios, **todo id que venga del cliente
necesita un chequeo de dueño antes de usarse**. Hoy existe algo parecido pero con
otro propósito: `assertEditable` en `decks.ts`, que verifica que un mazo no sea
de los incluidos. El chequeo de dueño es el hermano de ése, y va en el mismo
lugar —el service, no la ruta— por la misma razón que explica su comentario: es
una regla del modelo, así que tiene que rebotar venga de la API, de un script o
de un test.

---

## 8. El login, paso 2

Después de todo lo anterior, el login es corto.

### Qué cambia en la base

Las tres sentencias de la sección 4. Nada más.

### Qué cambia en el flujo

**Registrarse desde una sesión anónima.** La persona ya es un `owner` con sus
mazos y sus rondas. Registrarse es ponerle email y contraseña a la fila que ya
existe:

```sql
UPDATE owner SET email = ?, password_hash = ? WHERE id = ?
```

Todo lo que hizo se queda donde está, porque siempre estuvo colgado de ese `id`.
No hay import, no hay migración, no hay pantalla de "¿querés traerte tus datos?".

**Entrar desde otro navegador.** Buscar el `owner` por email, verificar la
contraseña contra `password_hash`, insertar un `owner_token` nuevo, setear la
cookie. El token opaco sigue siendo el mismo mecanismo de la sección 2: la
contraseña es sólo otra forma de conseguir uno.

**Cerrar sesión.** Borrar la fila de `owner_token` de esta cookie, y borrar la
cookie. En todos los dispositivos: borrar todas las filas de ese `owner_id`.

### Lo que hay que escribir

- Tres rutas: registrarse, entrar, salir. Tienen que ser **Route Handlers o
  Server Functions**, no Server Components, por la misma restricción de cookies
  de la sección 6.1.
- Dos o tres pantallas.
- Hashear la contraseña. **Usar `scrypt` de `node:crypto`**, que ya viene con
  Node, y no argon2 ni bcrypt, que son dependencias nativas: este proyecto ya se
  quemó una vez con el binario nativo de better-sqlite3 en el servidor (ver la
  sección 9). Una dependencia nativa menos es un problema de deploy menos.
- Límite de intentos en el POST de login, para que no se pueda probar
  contraseñas a mano alzada.

### El esfuerzo relativo

| | paso 1 (cookie) | paso 2 (login) |
|---|---|---|
| esquema | 2 tablas, 3 columnas, 3 índices, backfill | 2 columnas, 1 índice |
| services | las 18 funciones llevan `ownerId` | ninguno |
| consultas | ~47 puntos a revisar | ninguno |
| rutas de API | las 13 resuelven el dueño | +3 nuevas |
| pantallas | las 3 pasan el dueño | +2 nuevas |
| tests | los 225 casos necesitan un dueño | +10 casos |
| chequeos de dueño | 3 agujeros a tapar | ninguno |

**El paso 1 es alrededor del 80% del trabajo.** El login encima es un día.

---

## 9. Deploy

El servidor es el LXC 118 (`root@192.168.1.86`), la app vive en
`/opt/kitsune-cards` y escucha en el puerto 3000. Esto es una migración sobre una
base con datos reales, así que:

1. **Backup de la base antes de migrar.** Copiar `database.db` **y** sus archivos
   `-wal` y `-shm`, o hacer un `VACUUM INTO`. El backfill de la sección 4 no se
   puede deshacer solo.
2. **Parar el servicio antes de extraer** el tar.
3. **El tar nunca se lleva la base.** Los excludes tienen que incluir
   `--exclude='*.db' --exclude='*.db-wal' --exclude='*.db-shm' --exclude='*.sqlite*'`.
   `*.db` **no** matchea `database.db-wal`, y mandar un WAL ajeno sobre una base
   que está corriendo la corrompe. Ya pasó una vez.
4. **`npm install`, nunca `npm ci`.** `npm ci` borra `node_modules` y deja al
   servidor sin el binario nativo de better-sqlite3.
5. Recién después, `npm run db:migrate` y levantar el servicio.

---

## 10. Orden de trabajo

1. `lib/db/schema.ts`: las dos tablas nuevas y las tres columnas.
2. `npm run db:generate`, y escribir el backfill a mano en el `.sql` que salga.
3. `lib/auth/cookie.ts` (el nombre y el `maxAge`) y `proxy.ts`.
4. `lib/auth/owner.ts` con `currentOwnerId()`, reemplazando a
   `lib/auth/context.ts`.
5. `lib/db/owned.ts` con los predicados.
6. Los services, uno por uno, empezando por `decks.ts`. Apagar los rojos de
   TypeScript hasta que compile.
7. Las 13 rutas y las 3 pantallas.
8. **Los tres agujeros de la sección 7**, que son el único trabajo que requiere
   pensar.
9. Los tests: un fixture que cree un dueño, y un caso nuevo por cada agujero de
   la sección 7 —que son los que no compilan en rojo y por lo tanto son los que
   necesitan un test que los cuide.
10. Las cuatro consultas de SQL crudo, revisadas a mano.
11. Deploy según la sección 9.
12. Paso 2.

---

## 11. Decisiones que quedan abiertas

- **Qué hacer con un dueño anónimo que no vuelve nunca.** `last_seen_at` está en
  las dos tablas justamente para poder barrerlos, pero no hay política definida.
  Mientras sea una app para pocas personas, ninguna.
- **Si los mazos propios se van a poder compartir.** Si en algún momento sí,
  `deck.owner_id` deja de alcanzar y aparece una tabla de permisos. No hay que
  diseñarla ahora; sólo conviene saber que `owner_id` responde "de quién es" y no
  "quién lo puede ver", y que `is_builtin` sigue respondiendo "quién lo puede
  editar". Hoy las tres respuestas coinciden; ese día dejan de coincidir.
- **`Secure` en la cookie**, que depende de poner la app detrás de HTTPS.
