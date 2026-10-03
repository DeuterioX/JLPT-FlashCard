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
