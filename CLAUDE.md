@AGENTS.md

## Spacing between inline elements in JSX

**Never separate adjacent inline elements (`Kbd`, `Text`, `Badge`, etc.) with literal
space/middle-dot characters in JSX text.** Always use a `Group`/flex container with an
explicit `gap` instead.

Why: a literal space sitting right after a tag's closing bracket on the same line
(`<Kbd>Esc</Kbd> salir`) can render with the space collapsed to **zero width** — the
string content has the space, but the browser doesn't always give it any visual width.
This happened for real, more than once, in `components/quiz/QuizRunner.tsx` and
`components/quiz/RoundSummary.tsx`: text like `<Kbd>Esc</Kbd> salir` rendered as
`Escsalir` with no visible gap. Padding out the gap with more spaces or `&nbsp;`
characters is also wrong — that's tuning an accident of text-collapsing behavior, not a
real, adjustable spacing value, and it doesn't survive across renders/whitespace
handling changes reliably either.

The correct pattern: wrap the elements in a `Group` (or any flex/grid container) and let
`gap` (in `rem`, matching the rest of the app's spacing scale — see the px→rem
guidance elsewhere in this codebase) provide the space:

```tsx
// Wrong: relies on a literal space character between elements
<Text><Kbd>Esc</Kbd> salir</Text>

// Right: gap does the spacing, explicitly and reliably
<Group gap="0.5rem">
  <Kbd>Esc</Kbd>
  <Text size="xs" c="dimmed">salir</Text>
</Group>
```

This applies anywhere inline elements sit next to text or each other — not just `Kbd`.
Before adding a new instance of "element + label" or "element · element" in JSX, reach
for `Group`+`gap` first.

## Identificadores en inglés, comentarios y textos en castellano

**Todo identificador va en inglés**: variables, funciones, componentes, props,
tipos, clases CSS y atributos `data-*`. Nada de `const palabras`, `function
Formulario`, `data-palabras` ni `.gcFila`.

**Todo lo que lee una persona va en castellano rioplatense (voseo)**: los
comentarios, los textos de la interfaz, los mensajes de error y los mensajes de
commit.

La mezcla no es arbitraria. El código se lee junto a React, Mantine y el DOM,
que están en inglés, y un `onToggle` al lado de un `onApretar` obliga a traducir
mentalmente en cada línea. Los comentarios y la interfaz, en cambio, no tienen
con qué chocar, y el castellano es el idioma en el que se piensa este proyecto.

Esto ya se corrigió en masa una vez, con un `git mv` de identificadores por todo
el repo. Volver a introducir uno en castellano es volver a pagar eso.

## Dónde va un componente

```
components/
  <los compartidos>          el armazón y el kit genérico
  practice/  decks/  stats/  quiz/
```

**En la carpeta de una pantalla** va lo que nombra un concepto de esa pantalla:
un mazo, un grupo, una carta, una métrica, una ronda. Si el nombre del
componente no significa nada fuera de esa pantalla, va ahí.

**En la raíz** quedan dos cosas: el armazón de la app -`AppShell`, `Screen`,
las navegaciones, la miga- y el kit genérico, que son las formas sin
significado de dominio: una fila (`ListRow`), una fila que se desliza
(`SwipeRow`), un modal (`ModalTitle`, `ModalActions`, `NameModal`,
`ConfirmModal`), un campo (`PaperField`), un ícono, un rótulo de sección.

La prueba para decidir: **¿una pantalla nueva lo usaría?** Si sí, va a la raíz
aunque hoy lo use una sola. Si no, va a la carpeta de su pantalla aunque hoy lo
usen tres.

No es la regla de «lo usa un solo archivo»: con esa, `ModalTitle` terminaba en
`decks/` porque hoy todos sus usuarios están ahí, y el próximo modal de otra
pantalla tendría que mudarlo de vuelta.

Esto es la variante conservadora. Next no opina -su documentación lista tres
estrategias y no elige-, y la alternativa idiomática de App Router era colocar
cada grupo al lado de su ruta (`app/decks/_components/`). Se eligió quedarse en
`components/` para no mezclar componentes con el árbol de rutas.

## Deploy en el LXC

La app corre en el **LXC 118**: `root@192.168.1.86`, en `/opt/kitsune-cards`,
como el servicio de systemd `kitsune-cards.service`, que la corre con el usuario
`kitsune` (`npm run start`, puerto 3000, `DATABASE_PATH=/opt/kitsune-cards/database.db`).
No hay git en el server: se copia un `tar` del repo y se compila allá.

En Git Bash, desde la raíz del repo:

```bash
bash scripts/deploy.sh
```

El script ([scripts/deploy.sh](scripts/deploy.sh)) arma el `tar`, aborta si se
lleva una base, lo copia, para el servicio, hace backup de la base, extrae,
corre `npm install` y `npm run build`, levanta el servicio y muestra el health.
Es el único camino de deploy: cambiar un paso es cambiar el script, y queda en
git. Claude tiene permiso para correr exactamente ese comando y nada más contra
el server.

Antes de desplegar: `npx tsc --noEmit -p .`, `npx vitest run` y `npx playwright test`
en verde, y el cambio commiteado.

Lo que no se negocia, y por qué:

- **Los excludes de SQLite van los cuatro.** `--exclude='*.db'` no matchea
  `database.db-wal` ni `-shm`. El 2026-09-29 el tar se llevó el WAL local, pisó
  el del server y el build murió con `SQLITE_CORRUPT`: un WAL de OTRA base
  aplicado encima. El `grep` del script después del `tar` es el seguro: si
  encuentra una base adentro, aborta antes de copiar nada.
- **El servicio se para ANTES de extraer**, por lo mismo: con el proceso vivo la
  base tiene su WAL abierto.
- **`npm install`, nunca `npm ci`.** `npm ci` borra `node_modules` entero y el
  reinstalado deja `better-sqlite3` sin su binario nativo. El 2026-09-23 quedó
  `node_modules` vacío y el servicio seguía «activo» sólo porque Next ya tenía
  todo en memoria: habría muerto en el siguiente reinicio.
- **El `tar` no borra.** Un archivo que se borró o se movió en el repo sigue en
  el server. Si el cambio saca archivos, borrarlos a mano con un `ssh` aparte
  (`rm -f /opt/kitsune-cards/components/Viejo.tsx`).
- **Migraciones:** el script no las corre. Si el cambio trae una migración nueva
  en `lib/db/migrations`, el deploy se hace a mano siguiendo los pasos del script
  y agregando `su kitsune -s /bin/bash -c "npm run db:migrate"` después del
  `npm install` y antes del `build`, con el backup ya hecho.

Para comprobar que llegó, alcanza con leer: el health de arriba, y si el cambio es
de estilos, buscar la regla en el CSS servido:

```bash
for css in $(curl -s http://192.168.1.86:3000/ | grep -o '/_next/static/[^"]*\.css' | sort -u); do
  curl -s "http://192.168.1.86:3000$css"; done | grep -o 'la-regla-nueva[^}]*}'
```

**Contra el server, sólo lecturas.** Nada que arranque una ronda, revele o
califique una carta: cada una escribe una `session` o un `attempt` en la base de
verdad y ensucia las estadísticas. Lo que haya que probar interactuando se prueba
en `localhost` o en los e2e. Para probar con los datos reales, copiar la base:

```bash
ssh root@192.168.1.86 'cd /opt/kitsune-cards && node -e "const D=require(\"better-sqlite3\");
  new D(\"database.db\",{readonly:true}).backup(\"/tmp/copia.db\")"'
scp root@192.168.1.86:/tmp/copia.db ./copia.db
DATABASE_PATH=./copia.db npx next dev
```

`backup()` y no `cp`: con el servicio corriendo, un `cp` del `.db` solo se lleva
una base sin lo que todavía está en el WAL.

**Cambios de datos en el server** -importar un mazo, renombrar grupos- se corren
con el usuario `kitsune` y con un backup previo en una carpeta que sea suya:

```bash
B=backup-antes-de-X-$(date +%Y%m%d-%H%M%S); mkdir -p $B; chown kitsune:kitsune $B
su kitsune -s /bin/bash -c "node -e '...db.backup(\"$B/database.db\")...'"
```

Creada por `root` y sin el `chown`, el backup falla con `SQLITE_CANTOPEN`.
