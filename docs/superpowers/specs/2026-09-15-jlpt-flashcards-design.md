# Kana Drill — diseño

Fecha: 2026-09-15
Estado: aprobado, listo para plan de implementación

App web de flashcards para practicar hiragana, katakana y vocabulario propio.
Se muestra un carácter o una palabra en japonés y se responde escribiendo el
romaji. Inspirada en jlptcards.com, con dos diferencias deliberadas: incluye las
contracciones (yōon) que allá faltan, y permite cargar vocabulario propio
agrupado.

## Decisiones ya tomadas

Estas se acordaron durante el brainstorming y no se reabren sin motivo nuevo.

| Decisión | Valor |
|---|---|
| Dirección de respuesta | Solo kana → romaji. También para palabras: ねこ se responde `neko`, no "gato" |
| Alcance de kana | Completo: básicos + dakuten/handakuten + yōon + extendidos de katakana |
| Al errar | La carta se queda hasta acertarla. Una vez acertada, no vuelve en esa ronda |
| Métricas | Histórico persistente + modo "Practicar mis errores" |
| Renderizado | SSR con API HTTP separada, pensando en cookies y login más adelante |
| Diccionario | JMdict importado local, desde el arranque |
| Responsive | Obligatorio: tiene que usarse desde el browser del teléfono |
| Marca de mazo incluido | Un punto, sin etiqueta de texto |

## Stack

- **Next.js (App Router)** con TypeScript. Páginas SSR y Route Handlers en el
  mismo proyecto.
- **Mantine** para componentes. Ver "Tema" más abajo: la paleta por defecto no
  sirve y hay que declararla.
- **better-sqlite3** + **Drizzle ORM**. Drizzle aporta migraciones versionadas y
  tipos, que importan porque el esquema va a crecer cuando entre el login.
- **Zod** para validar el input de los Route Handlers.
- **Vitest** para services y validación de romaji. **Playwright** para el flujo
  del quiz, que es donde vive el riesgo real.

Se pinea la versión vigente de cada paquete al instalar; este documento no fija
versiones.

### Por qué Next y no Remix

Se pidió explícitamente un API que el frontend consuma. En Remix el camino
natural son loaders y actions acoplados a la ruta, y un API HTTP aparte queda
redundante. En Next los Route Handlers son un API de primera clase y las páginas
SSR conviven al lado. Para cookies y login, `cookies()` y middleware son el
camino previsto.

### La regla que evita duplicar lógica

```
app/(rutas)/page.tsx   ──┐
                         ├──►  lib/services/*.ts  ──►  Drizzle  ──►  SQLite
app/api/**/route.ts    ──┘
```

Las páginas server-side **no se hacen fetch a sí mismas**: llaman directo al
service. Los Route Handlers son una cáscara delgada sobre ese mismo service —
validan con Zod y mapean errores a HTTP. Una sola implementación por operación.

Equivalencias para quien viene de .NET MVC / Angular:

| Next.js | Equivalente |
|---|---|
| Server Component (`page.tsx`) | Razor View: corre en el servidor, sin estado ni eventos |
| Client Component (`"use client"`) | Componente de Angular: corre en el browser |
| Route Handler (`app/api/.../route.ts`) | `ApiController`, un método por verbo |
| `lib/services/*.ts` | Capa de servicios / repositorio |
| `layout.tsx` | `_Layout.cshtml` |

### Preparado para login, sin construirlo

Un solo archivo `lib/auth/context.ts` que hoy devuelve `{ userId: null }`. Todos
los services reciben ese contexto como primer parámetro. Cuando entre el login,
ese archivo lee la cookie de sesión y se agregan `owner_id` a `deck` y `session`.
Ninguna pantalla cambia de forma.

## Modelo de datos

Siete tablas para la app, dos más para el diccionario.

```
deck ──< card_group ──< card ──< card_answer
             │                    │
             │                    └── (validación)
             │
        session_group >── session ──< attempt >── card
```

### deck

Lo que el usuario llama "grupo" en sentido amplio: Hiragana, Katakana, Comidas.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | PK | |
| `name` | text | |
| `is_builtin` | bool | Viene con la app, no se puede borrar. Único significado |
| `sort_order` | int | |
| `created_at` | text | ISO 8601 |

No existe `kind` ni `script`. Hiragana y katakana no son un tipo especial de
cosa: son dos filas con `is_builtin = 1`. La identidad del mazo ya dice cuál es.

### card_group

El nivel que se togglea en la pantalla de selección. Cada columna de la grilla
de kana es un `card_group`.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | PK | |
| `deck_id` | FK → deck | ON DELETE CASCADE |
| `name` | text | "か行", "Pescado" |
| `section` | text NULL | Encabezado en la grilla: `Básicos`, `Dakuten`, `Contracciones`, `Extendidos`. NULL en mazos propios |
| `sort_order` | int | |

### card

| Columna | Tipo | Notas |
|---|---|---|
| `id` | PK | |
| `group_id` | FK → card_group | ON DELETE CASCADE |
| `prompt` | text | Lo que se muestra: `か`, `きゃ`, `さかな` |
| `meaning` | text NULL | Solo vocabulario. Se muestra al acertar, nunca es la pregunta |
| `sort_order` | int | |

`きゃ` es **una sola card** con dos caracteres unicode en `prompt`, no una
composición en runtime de `き` + `ゃ`.

### card_answer

| Columna | Tipo | Notas |
|---|---|---|
| `id` | PK | |
| `card_id` | FK → card | ON DELETE CASCADE |
| `romaji` | text | Normalizado: minúsculas, sin espacios |
| `is_primary` | bool | La que se muestra al revelar |

Tabla aparte porque el romaji no es único. `is_primary` **no participa de la
validación** — se valida contra todas las filas. Solo decide qué se muestra al
revelar, en el mensaje de error, en el ranking de estadísticas y en la lista de
cartas del editor.

Integridad garantizada por la base:

```sql
CREATE UNIQUE INDEX ux_card_answer_primary
  ON card_answer(card_id) WHERE is_primary = 1;
```

### session

| Columna | Tipo | Notas |
|---|---|---|
| `id` | PK | |
| `started_at` | text | |
| `finished_at` | text NULL | NULL = ronda abandonada |
| `mode` | text | `normal` \| `review` |
| `total` | int | Cartas de la ronda |
| `correct` | int | Consolidado al cerrar |
| `incorrect` | int | Consolidado al cerrar |

### session_group

Tabla puente. Reemplaza al `deck_ids` JSON de un borrador anterior, que no se
podía cruzar contra `attempt`.

| Columna | Tipo |
|---|---|
| `session_id` | FK → session |
| `group_id` | FK → card_group |

PK compuesta `(session_id, group_id)`. Es lo que habilita el accuracy por grupo.

### attempt

Una fila por cada Enter, acierte o no. No una por carta resuelta.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | PK | |
| `session_id` | FK → session | |
| `card_id` | FK → card | |
| `typed` | text | Lo tipeado, normalizado. Cadena vacía si fue revelado |
| `is_correct` | bool | |
| `revealed` | bool | Se apretó "Revelar" en vez de escribir |
| `ms` | int | Desde que apareció la carta o desde el intento anterior |
| `created_at` | text | |

> **Deltas respecto del DER presentado en el brainstorming**, agregados al
> escribir este spec:
>
> - `attempt.revealed` — sin ella, un intento revelado y uno fallado son
>   indistinguibles (ambos `is_correct = 0`), y "revelé" no es lo mismo que
>   "me equivoqué" al analizar las métricas.
> - `session.mode` — hace falta para distinguir una ronda normal de una de
>   repaso dirigido, y para poder excluir las de repaso de las estadísticas
>   generales si alguna vez sesgan el promedio.
> - `card_group.section` — apareció al planificar la implementación. La grilla
>   de la pantalla 01 va seccionada por Básicos / Dakuten / Contracciones, y sin
>   esta columna la única forma de armar esos encabezados sería inferirlos del
>   orden y los conteos del seed, que se rompe apenas alguien agrega un grupo.

Índices: `(card_id, created_at)` para el ranking de peores, `(session_id)` para
el resumen de ronda.

### dict_entry / dict_gloss

| `dict_entry` | Tipo |
|---|---|
| `id` | PK |
| `kana` | text |
| `kanji` | text NULL |
| `romaji` | text (generado por el transliterador) |
| `pos` | text (categoría gramatical) |
| `is_common` | bool |

| `dict_gloss` | Tipo |
|---|---|
| `id` | PK |
| `entry_id` | FK → dict_entry |
| `lang` | text: `spa` \| `eng` |
| `text` | text |

Más una tabla virtual FTS5 sobre `dict_gloss.text` para la búsqueda.

## Datos precargados

### Hiragana — 26 grupos, 104 cartas

**Básicos (gojūon), 10 grupos, 46 cartas**

| Grupo | Cartas |
|---|---|
| あ行 | あ い う え お |
| か行 | か き く け こ |
| さ行 | さ し す せ そ |
| た行 | た ち つ て と |
| な行 | な に ぬ ね の |
| は行 | は ひ ふ へ ほ |
| ま行 | ま み む め も |
| や行 | や ゆ よ |
| ら行 | ら り る れ ろ |
| わ行 | わ を ん |

**Dakuten / handakuten, 5 grupos, 25 cartas**

が行, ざ行, だ行, ば行, ぱ行 — cinco cartas cada uno.

**Yōon (contracciones), 11 grupos, 33 cartas**

きゃ行, しゃ行, ちゃ行, にゃ行, ひゃ行, みゃ行, りゃ行, ぎゃ行, じゃ行,
びゃ行, ぴゃ行 — tres cartas cada uno (ゃ / ゅ / ょ).

### Katakana — 33 grupos, 131 cartas

Los mismos 26 grupos que hiragana (104 cartas), más 7 grupos de extendidos para
préstamos, 27 cartas:

| Grupo | Cartas |
|---|---|
| ファ行 | ファ フィ フェ フォ |
| ヴァ行 | ヴァ ヴィ ヴ ヴェ ヴォ |
| ティ行 | ティ トゥ ディ ドゥ |
| ウィ行 | ウィ ウェ ウォ |
| シェ行 | シェ ジェ チェ |
| ツァ行 | ツァ ツィ ツェ ツォ |
| クァ行 | クァ クィ クェ クォ |

La marca de vocal larga `ー` no es una carta: aparece dentro de palabras.

> Los conteos de los mockups (`29 grupos · 129 cartas`) eran ilustrativos. Los
> de este spec son los autoritativos.

### Romanizaciones alternativas

Hepburn como primaria, Kunrei y variantes comunes como aceptadas:

| Carta | Primaria | También acepta |
|---|---|---|
| し / シ | `shi` | `si` |
| ち / チ | `chi` | `ti` |
| つ / ツ | `tsu` | `tu` |
| ふ / フ | `fu` | `hu` |
| じ / ジ | `ji` | `zi` |
| ぢ / ヂ | `ji` | `di`, `zi` |
| づ / ヅ | `zu` | `du` |
| を / ヲ | `wo` | `o` |
| ん / ン | `n` | `nn` |
| しゃ しゅ しょ | `sha` `shu` `sho` | `sya` `syu` `syo` |
| ちゃ ちゅ ちょ | `cha` `chu` `cho` | `tya` `tyu` `tyo` |
| じゃ じゅ じょ | `ja` `ju` `jo` | `zya` `zyu` `zyo`, `jya` `jyu` `jyo` |

El resto de las cartas tiene una sola fila en `card_answer`.

## Motor del quiz

### Armado de la ronda

1. Se toman todas las `card` de los `card_group` seleccionados.
2. Se barajan con Fisher-Yates.
3. Se crea la `session` con sus `session_group`, y se devuelve el mazo barajado
   al cliente en la respuesta.

### Validación

Lo tipeado se normaliza antes de comparar: `trim()`, minúsculas, NFC, y colapso
de espacios internos. Se compara contra **todas** las filas de `card_answer` de
esa carta.

### Ciclo

- **Acierto:** se registra el attempt, la carta sale de la cola, avanza.
- **Error:** se registra el attempt, sube el contador, el kana se tiñe de rojo,
  el input se limpia, **la carta se queda**. No se re-encola: una vez acertada,
  no vuelve a aparecer en esa ronda.
- **Revelar:** registra un attempt con `revealed = 1`, `is_correct = 0`,
  `typed = ''`. Se muestra la respuesta primaria y la carta se queda hasta que
  se escriba. Cuenta como error para que la métrica no mienta.
- **Vocabulario:** al acertar, el `meaning` aparece brevemente debajo del kana.

### Persistencia

Cada attempt se manda con `POST /api/attempts` fire-and-forget, sin bloquear el
tipeo. Cerrar la pestaña a mitad de ronda no pierde lo respondido; esa `session`
queda con `finished_at = NULL`.

### Fin de ronda

Al llegar a cero restantes aparece un overlay con el resumen. La ronda siguiente
**ya está barajada y cargada detrás**, y el foco nunca sale del input. La primera
tecla que se toque cuenta como la primera letra de la carta nueva y el overlay se
va solo. Si no se toca nada, se cierra a los 6 segundos y arranca igual. `Esc` es
la única salida.

Esto implementa el requisito de "volver a comenzar sin tener que presionar nada".

## Métricas

- **Accuracy de ronda:** attempts correctos / attempts totales.
- **Ranking de peores:** ordena por *tasa* de error (errores / veces vista), no
  por errores absolutos. Mínimo de 5 apariciones para entrar al ranking, para que
  una carta nueva no lo encabece por accidente.
- **Dominadas:** cartas con ≥5 intentos y ≥90% de aciertos en la ventana elegida.
- **Accuracy por grupo:** join de `attempt` → `card` → `card_group`. Semáforo:
  verde ≥85%, ámbar 60–85%, rojo <60%.
- **Ventanas:** 7 días, 30 días, siempre.

## Pantallas

Siete, más el tratamiento responsive. Mockups completos en el documento de
diseño visual publicado durante el brainstorming.

| # | Pantalla | Ruta | Render |
|---|---|---|---|
| 01 | Práctica (selección) | `/` | Servidor + toggles cliente |
| 02 | Quiz | `/practicar` | Cliente |
| 03 | Fin de ronda | overlay | Cliente |
| 04 | Mis mazos | `/mazos` | Servidor |
| 05 | Editor de mazo | `/mazos/[id]` | Servidor + formularios cliente |
| 06 | Buscar en el diccionario | panel sobre 05 | Cliente → `/api/dict` |
| 07 | Estadísticas | `/estadisticas` | Servidor |

### 01 · Práctica

Grilla de tarjetas de grupo con toggle, **seccionada** por Básicos / Dakuten /
Contracciones en vez del scroll horizontal de jlptcards — que es justamente
donde las contracciones quedaban escondidas. Control segmentado arriba para
elegir el mazo. Barra inferior con el conteo en vivo y "Empezar ronda"; si no hay
ningún grupo prendido, el botón queda deshabilitado.

La selección se guarda en una **cookie**, no en `localStorage`, para que el
servidor ya renderice la grilla con los toggles puestos y no haya parpadeo.

### 02 · Quiz

Kana grande centrado, input abajo, métricas en la esquina inferior izquierda
(aciertos / restantes / errores), "Revelar" a la derecha, barra de progreso.
Todo lo demás se corre a los bordes.

Es la única pantalla sin SSR real: el servidor entrega el mazo barajado en el
primer render y después no participa. Un ida y vuelta por tecla arruinaría la
sensación.

### 03 · Fin de ronda

Overlay sobre el quiz: accuracy, cartas, errores, tiempo, y las que costaron.
Comportamiento descrito en "Motor del quiz".

### 04 · Mis mazos

Una sola lista con los que vienen con la app y los propios, porque en el modelo
son lo mismo. Los `is_builtin` llevan **un punto jade** con tooltip "Incluido en
la app · no se puede borrar" — sin etiqueta de texto. No tienen botón Borrar.

Borrar un mazo propio muestra qué se lleva puesto: "Comidas, 3 grupos, 3 cartas
y 47 intentos registrados".

### 05 · Editor de mazo

Grupos a la izquierda, cartas del grupo elegido a la derecha. Si el mazo tiene un
único grupo, la columna izquierda no aparece y se ve una lista plana.

El romaji se autocompleta al escribir el kana, transliterando contra la tabla de
kana precargada. Queda editable: la っ de がっこう y las vocales largas de
スーパー no se resuelven solas.

Mover una carta de grupo es `UPDATE card SET group_id`. Como `attempt` apunta a
la carta y no al grupo, el historial viaja con ella.

### 06 · Buscar en el diccionario

Panel sobre el editor. Se busca en castellano, se agrega al grupo actual con
kana, romaji y significado editables antes de guardar.

### 07 · Estadísticas

Tiles de resumen, ranking de peores, accuracy por grupo, historial de rondas.
Botón "Practicar mis 20 peores" que arma una `session` con `mode = 'review'` y
manda derecho al quiz.

### Sistema visual

Lo que mantiene la consistencia: **cinco piezas** y ninguna sexta. Barra
superior, tarjeta de grupo con toggle, fila de lista, barra inferior de acción,
tile de métrica.

**La regla de las seis cartas:** un grupo con ≤6 cartas previsualiza sus cartas;
con más, muestra el conteo. Por eso か行 se ve como columna de kana y "Pescado"
como "12 palabras", sin ninguna condición en el modelo de datos.

**Tipografía:** Zen Kaku Gothic New para todo kana — es una tipografía japonesa
real, así que ぬ y め se distinguen. IBM Plex Sans para la interfaz, Plex Mono
para romaji y números.

**Teclado primero:** el foco arranca donde se va a escribir. Enter confirma,
Espacio revela, Esc sale. El mouse nunca es obligatorio en el quiz.

### Tema de Mantine

**La paleta por defecto no sirve y hay que declararla.** El dark de Mantine 8 es
gris neutro puro (cada shade con los tres canales idénticos); el diseño es
índigo.

| Rol | Mantine 8 | Este diseño |
|---|---|---|
| `dark-7` · fondo de página | `#242424` | `#0F1220` |
| `dark-6` · superficies | `#2e2e2e` | `#181C2E` |
| `dark-4` · bordes | `#424242` | `#2C3249` |
| `dark-0` · texto | `#C9C9C9` | `#E9EBF4` |
| Éxito / acción | `teal-8 #099268` | jade `#3FBF8F` |
| Error | `red-8 #e03131` | shu `#E2604A` |

Mantine deriva todas sus variables semánticas del array `dark`, así que
redefinirlo alcanza para que cada componente se acomode solo:

```ts
// theme.ts
export const theme = createTheme({
  primaryColor: 'jade',
  colors: {
    dark: [
      '#E9EBF4', // 0 → --mantine-color-text
      '#C3C8DC', // 1
      '#868DA8', // 2 → texto atenuado
      '#5D6480', // 3 → placeholders
      '#2C3249', // 4 → --mantine-color-default-border
      '#212639', // 5 → hover
      '#181C2E', // 6 → --mantine-color-default (superficies)
      '#0F1220', // 7 → --mantine-color-body (fondo)
      '#0B0E19', // 8
      '#070912', // 9
    ],
    jade: [/* 10 shades, centro en #3FBF8F */],
    shu:  [/* 10 shades, centro en #E2604A */],
  },
});
```

Ojo con el orden: en la escala de Mantine `dark-6` es **más claro** que
`dark-7`. Los diez shades de `jade` y `shu` salen del generador de colores de
Mantine partiendo del color central, no a ojo.

## Responsive

Requisito firme: tiene que usarse desde el browser del teléfono. Mismas rutas,
mismo código, sin detección de user agent ni rutas `/m/`. Breakpoint en 640px.

- **Navegación:** de la barra superior a una barra de pestañas abajo, al alcance
  del pulgar. Suma `env(safe-area-inset-bottom)` a su padding.
- **Grilla:** de 8 columnas a 3, con las tarjetas intactas.
- **Editor:** la columna de grupos pasa a una tira horizontal de chips.
- **Estadísticas:** tiles 2×2, paneles apilados.
- **Objetivos táctiles:** mínimo 44px, incluidos los toggles.

### El quiz en teléfono es el caso difícil

El teclado virtual se come la mitad inferior de la pantalla. Con `100vh` el input
queda tapado y la app es inusable. Se dimensiona el contenedor contra
`window.visualViewport.height` (Visual Viewport API): el kana se achica y el
input queda siempre apoyado sobre el teclado.

El input lleva `autocapitalize="off"`, `autocorrect="off"`, `spellcheck="false"`
e `inputmode="text"`. Sin eso iOS convierte `ka` en `Ka` y sugiere corregir
`shi`, y se cuentan errores que nunca se cometieron.

## API

Route Handlers bajo `app/api/`. Cáscaras delgadas sobre los services.

| Endpoint | Para qué | Pantalla |
|---|---|---|
| `GET /api/decks` | Mazos con grupos y conteos | 01, 04 |
| `POST /api/decks` | Crear mazo (+ grupos, o "General" si no se manda ninguno) | 04 |
| `PATCH /api/decks/:id` | Renombrar | 05 |
| `DELETE /api/decks/:id` | Borrar en cascada. Rechaza los `is_builtin` con 403 | 04 |
| `POST /api/decks/:id/groups` | Agregar grupo | 05 |
| `PATCH /api/groups/:id` | Renombrar o reordenar | 05 |
| `DELETE /api/groups/:id` | Borrar grupo | 05 |
| `POST /api/groups/:id/cards` | Alta de carta + sus `card_answer`, en una transacción | 05, 06 |
| `PATCH /api/cards/:id` | Editar o mover de grupo | 05 |
| `DELETE /api/cards/:id` | Borrar carta | 05 |
| `POST /api/sessions` | Abrir ronda. Devuelve el mazo barajado | 01 |
| `POST /api/sessions/review` | Abrir ronda con las N peores cartas | 07 |
| `POST /api/attempts` | Un intento. Fire-and-forget | 02 |
| `PATCH /api/sessions/:id` | Cerrar ronda y consolidar totales | 03 |
| `GET /api/stats/overview` | Tiles, accuracy por grupo, historial | 07 |
| `GET /api/stats/worst` | Ranking por tasa de error | 03, 07 |
| `GET /api/dict/search?q=` | FTS5 sobre las glosas | 06 |

## Diccionario

**JMdict**, del EDRDG. Es lo que hay abajo de Jisho.org y Yomichan.

- **Español:** ~39.000 entradas con glosa en castellano, sobre un total que
  supera las 200.000. Alcanza de sobra para vocabulario cotidiano.
- **Estrategia:** buscar primero en español; si hay pocos resultados, completar
  con las coincidencias en inglés, marcadas como tales en la UI.
- **Fuente:** `scriptin/jmdict-simplified`, que publica el XML ya convertido a
  JSON con builds por idioma. Se usa la variante **common** en español: base más
  chica y las palabras que valen la pena.
- **Importación:** `npm run seed:dict`, en tiempo de build. No es una API en
  runtime; no hay red ni API key ni rate limits.
- **Romaji:** JMdict no lo trae. Se genera pasando la lectura en kana por el
  mismo transliterador del editor.
- **Licencia:** CC BY-SA. Uso comercial permitido. Requiere una línea de
  atribución al EDRDG en el pie de la app. La cláusula ShareAlike aplica a los
  datos del diccionario, no al código.

**Calidad:** las glosas en español son contribuciones de voluntarios y son
desparejas. Por eso el campo queda editable antes de guardar la carta.

## Fuera de alcance

- **Login y usuarios.** Solo queda el seam en `lib/auth/context.ts`.
- **Repetición espaciada real** (SM-2, intervalos). "Practicar mis peores" cubre
  el refuerzo sin un algoritmo encima.
- **Modo inverso** (romaji → kana con IME).
- **Kanji como carta.** El diccionario muestra la forma en kanji como referencia,
  pero las cartas se responden siempre por su lectura en kana.
- **Multiusuario, sincronización, app nativa.**

## Riesgos

| Riesgo | Mitigación |
|---|---|
| El teclado virtual tapa el input en móvil | Visual Viewport API. Es el primer caso de prueba en Playwright |
| Autocorrección de iOS ensucia las métricas | Atributos del input. Verificar en device real, no solo en emulador |
| Precisión de los datos de kana precargados | El seed es data, no lógica: se testea con un test que cuenta grupos y cartas por mazo y compara contra los números de este spec |
| El transliterador kana→romaji falla en casos raros (っ, ー) | El campo es editable. Los casos conocidos van como tests desde el inicio |
| Peso del import de JMdict | Variante common; si el `.db` queda grande, se evalúa cargar el diccionario en un archivo SQLite aparte |
