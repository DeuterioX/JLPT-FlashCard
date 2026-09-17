# Kitsune Cards

Kitsune Cards — Japanese Flashcards. App web para practicar hiragana y katakana escribiendo el romaji de cada
carta. Trae los mazos de kana cargados, deja armar mazos propios (con
búsqueda opcional en el diccionario JMdict para agregar palabras) y guarda
cada intento en una base SQLite local para mostrar estadísticas y un repaso
de las cartas que más te cuestan.

## Requisitos

- Node.js 22 o más nuevo (`better-sqlite3` pide `>=22`; probado con Node 24).
- npm.

## Puesta en marcha

```bash
npm install
npm run db:migrate   # crea database.db con el esquema (y la tabla de búsqueda del diccionario)
npm run db:seed      # carga los mazos de Hiragana y Katakana
npm run dev          # http://localhost:3000
```

En Windows sin las herramientas de C++ de Visual Studio, `npm install` puede
fallar porque npm intenta compilar `better-sqlite3` con node-gyp. El paquete ya
trae binarios precompilados, así que alcanza con `npm install --ignore-scripts`.

La base es `database.db` en la raíz del proyecto; se puede usar otra con la
variable de entorno `DATABASE_PATH`.

### Diccionario (opcional)

Sin este paso la app funciona igual, pero el buscador del editor de mazos
avisa que el diccionario no está cargado.

1. Bajar de [scriptin/jmdict-simplified](https://github.com/scriptin/jmdict-simplified/releases)
   (la versión vigente figura en
   `https://api.github.com/repos/scriptin/jmdict-simplified/releases/latest`)
   los assets `jmdict-spa-<versión>.json` (español) y
   `jmdict-eng-common-<versión>.json` (inglés, palabras comunes). Vienen
   comprimidos (`.json.zip` / `.json.tgz`).
2. Descomprimirlos en `data/` (carpeta ignorada por git).
3. Importarlos, cambiando la versión por la que bajaste:

```bash
npm run db:seed:dict -- data/jmdict-spa-3.6.2.json spa
npm run db:seed:dict -- data/jmdict-eng-common-3.6.2.json eng
```

## Pruebas

```bash
npm test        # unitarias (Vitest)
npm run e2e     # end to end (Playwright), escritorio y teléfono
```

`npm run e2e` levanta su propio servidor de Next en el puerto 3100 contra una
base aparte, `e2e.db`, que se borra, migra y carga de cero en cada corrida:
no toca `database.db`. La primera vez hace falta instalar el navegador con
`npx playwright install chromium`.

## Estructura

`app/` tiene las páginas del App Router (`/`, `/practicar`, `/mazos`,
`/estadisticas`) y la API en `app/api/`, cuyas rutas son finas y delegan en
`lib/services/` (mazos, sesiones, estadísticas, diccionario). `lib/db/` tiene
el esquema de Drizzle, las migraciones, el seed de kana y la importación de
JMdict; `lib/quiz/` la lógica pura de la ronda (motor, registro de intentos,
ronda guardada); `lib/kana/` las tablas y la normalización de respuestas.
`components/` son los componentes de React con Mantine, `scripts/` los
comandos `db:*`, `tests/` las pruebas unitarias y `e2e/` las de Playwright.
`docs/` guarda el spec y el plan de diseño.

## Atribución

Los datos del diccionario vienen de [JMdict](https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project),
© Electronic Dictionary Research and Development Group (EDRDG), bajo la
licencia [Creative Commons Attribution-ShareAlike 4.0](https://www.edrdg.org/edrdg/licence.html),
a través de [jmdict-simplified](https://github.com/scriptin/jmdict-simplified).
La cláusula ShareAlike aplica a los datos del diccionario, no al código.
