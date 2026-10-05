'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Stack, Group, SegmentedControl, Button, Text, Box } from '@mantine/core';
import { CheckSquare, DashSquare } from 'react-bootstrap-icons';
import { Icon } from '../Icon';
import { GroupGrid } from './GroupGrid';
import { ActionBar } from '../ActionBar';
import { Screen } from '../Screen';
import { SELECTION_COOKIE, serializeSelection } from '@/lib/selection-cookie';
import { errorFrom } from '@/lib/client/errors';
import { useAction } from '@/lib/client/action';
import { ROUND_KEY, USED_ROUND_KEY } from '@/lib/quiz/stored-round';
import type { DeckSummary } from '@/lib/services/decks';
import styles from './PracticeBoard.module.css';

const START_ROUND_ERROR = 'No se pudo empezar la ronda. Probá de nuevo.';

export function PracticeBoard({
  decks, initialSelection,
}: { decks: DeckSummary[]; initialSelection: number[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [deckId, setDeckId] = useState(String(decks[0]?.id ?? ''));
  const [selected, setSelected] = useState(new Set(initialSelection));
  // El `busy` de `useAction` cubre el tramo del fetch en sí: `pending` (de
  // useTransition) sólo se prende durante el `router.push` posterior, así que
  // sin él el botón quedaba clickeable mientras la request estaba en vuelo y
  // un doble tap abría dos sesiones.
  //
  // `keepLockedOnSuccess`: en el camino feliz la guarda queda tomada a propósito,
  // porque el componente sigue montado mientras navega y un segundo tap
  // abriría otra sesión. Se desmonta al llegar a /quiz.
  const roundAction = useAction({ keepLockedOnSuccess: true });

  const deck = decks.find((d) => String(d.id) === deckId) ?? decks[0];

  function persist(next: Set<number>) {
    setSelected(next);
    roundAction.setError(null);
    // Un año. La lee el servidor en el próximo render: sin parpadeo.
    document.cookie =
      `${SELECTION_COOKIE}=${serializeSelection([...next])}; path=/; max-age=31536000; samesite=lax`;
  }

  const toggle = (id: number, on: boolean) => {
    const next = new Set(selected);
    if (on) next.add(id); else next.delete(id);
    persist(next);
  };

  const setAll = (on: boolean) => {
    if (!deck) return;
    const next = new Set(selected);
    for (const g of deck.groups) {
      if (on) next.add(g.id); else next.delete(g.id);
    }
    persist(next);
  };

  // Descarta ids de grupos que ya no existen (p. ej. un mazo borrado) y solo
  // cuenta los del mazo que se está mirando: cambiar de mazo cambia el conteo.
  const chosen = deck ? deck.groups.filter((g) => selected.has(g.id)) : [];
  const cardCount = chosen.reduce((n, g) => n + g.cardCount, 0);

  // Cuántas de las cartas elegidas tienen significado. Es lo que decide si
  // «Significados» se puede apretar: en un mazo de kana no hay ninguno, y
  // preguntar qué quiere decir あ no significa nada.
  const meaningCount = chosen.reduce((n, g) => n + g.meaningCount, 0);

  const begin = (mode: 'normal' | 'meaning' = 'normal') => roundAction.run(async () => {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ groupIds: chosen.map((g) => g.id), mode }),
    });
    if (!res.ok) return errorFrom(res, START_ROUND_ERROR);
    const round = await res.json();
    // `deckName` viaja aparte del `round` que devuelve el server: la API de
    // sesiones no conoce el mazo, solo los `groupIds` -acá sí se sabe, es el
    // mazo que se estaba mirando al arrancar-. Lo usa la barra superior del
    // quiz ("Hiragana · 6 grupos").
    sessionStorage.setItem(ROUND_KEY, JSON.stringify({ ...round, deckName: deck.name }));
    // Ronda nueva sin jugar: cualquier marca de "ya usada" es de otra.
    sessionStorage.removeItem(USED_ROUND_KEY);
    start(() => router.push('/quiz'));
  });

  if (!deck) {
    return (
      <Stack className={styles.empty}>
        <Text c="dimmed">Todavía no hay mazos para practicar.</Text>
      </Stack>
    );
  }

  // Las dos barras ocupan su lugar en la columna de `Screen` y la grilla
  // scrollea en el espacio que queda entre ellas: ni flotan encima del
  // contenido ni hace falta reservarles lugar con un espaciador medido.
  // `bg` porque es su propia franja, con el fondo de la página. El borde
  // inferior aparece sólo con contenido scrolleado debajo (`data-scrolled`
  // de `Screen`, regla en globals.css): con la página quieta sería un
  // subrayado suelto.
  const switcher = (
    <Group
      id="deck-switcher-bar"
      wrap="wrap"
      className={styles.switcherBar}
    >
      {/* Con muchos mazos el SegmentedControl no entra en una pantalla
          angosta: Mantine no lo hace, pero no puede hacer wrap a varias
          líneas -el indicador animado asume una sola fila- ni hace
          scroll solo. `min-width: 0` dentro de un `Group` es necesario
          para que el `overflow-x` realmente pueda achicar la caja en
          vez de empujar a los hermanos fuera de pantalla; mismo patrón
          que ya usan las listas horizontales de la app. */}
      <Box id="deck-picker" className={`${styles.deckSwitcher} ${styles.deckPicker}`}>
        <SegmentedControl
          id="deck-segmented-control"
          value={deckId}
          onChange={setDeckId}
          data={decks.map((d) => ({ value: String(d.id), label: d.name }))}
        />
      </Box>
      {/* "Seleccionar:" y los dos botones son una sola unidad -si no
          entran al lado del selector de mazos, bajan los tres juntos a
          la línea siguiente, nunca separados entre sí-. */}
      <Group id="select-all-controls" wrap="nowrap" className={styles.selectAll}>
        <Text className={styles.selectLabel}>Seleccionar:</Text>
        {/* Un solo control soldado, como el par de verbos del pie: son las dos
            salidas de la misma decisión, y sueltos con un hueco se leen como
            dos acciones que no tienen nada que ver.

            Los rótulos pasan a ícono -cuadrado tildado y cuadrado con guión,
            que son los dos estados de un grupo en la grilla de abajo-, y la
            palabra sobrevive en el `aria-label`: ahí no se pierde nada para un
            lector de pantalla, y además los e2e eligen estos botones por su
            nombre accesible. */}
        <Box className={styles.selectGroup}>
          <Button
            id="select-all-btn" variant="default" size="compact-xs"
            aria-label="Todos" title="Todos" onClick={() => setAll(true)}
          >
            <Icon glyph={CheckSquare} />
          </Button>
          <Button
            id="select-none-btn" variant="default" size="compact-xs"
            aria-label="Ninguno" title="Ninguno" onClick={() => setAll(false)}
          >
            <Icon glyph={DashSquare} />
          </Button>
        </Box>
      </Group>
    </Group>
  );

  const actions = (
      <ActionBar>
        {/* `.count` del diseño: la base va atenuada (`--a-dim`) y solo
            los números en `--a-text` con peso 600 -no el 700 que el
            navegador le pone a un `<b>` suelto-. `Group` con `gap`, no
            texto suelto con espacios intercalados a mano: un espacio de
            texto JSX pegado al cierre de un tag puede colapsar a ancho
            CERO (regla en CLAUDE.md, encontrado primero en el header
            del quiz). */}
        <Group id="selection-count" wrap="wrap" className={styles.count}>
          <Text component="span" className={`knd-strong ${styles.countNum}`}>{chosen.length}</Text>
          <Text component="span" className={styles.countWord}>grupos</Text>
          <Text component="span" className={styles.countWord}>·</Text>
          <Text component="span" className={`knd-strong ${styles.countNum}`}>{cardCount}</Text>
          <Text component="span" className={styles.countWord}>cartas</Text>
        </Group>
        {roundAction.error && (
          <Text size="sm" className="knd-error">
            {roundAction.error}
          </Text>
        )}
        {/* Los dos verbos con los que arranca una ronda. El modo no es un
            selector aparte: es la acción, y el que apretás decide de qué
            ronda se trata. «Repasar significados» se apaga cuando ninguna de
            las cartas elegidas tiene uno -un mazo de kana entero-, con el
            motivo en el `title`.

            Mismo verbo y distinto objeto: lo que cambia entre los dos modos
            es QUÉ se repasa, no con cuánto rigor. Y sin flecha: medido, con
            «➜» los rótulos desbordan su mitad del control a 360 y 375px, que
            son los anchos de teléfono más comunes. */}
        <Box className={styles.verbs}>
          <Button
            id="begin-meaning-btn"
            variant="default"
            onClick={() => begin('meaning')}
            loading={roundAction.busy || pending}
            disabled={chosen.length === 0 || meaningCount === 0 || roundAction.busy || pending}
            title={meaningCount === 0 ? 'Estas cartas no tienen significado que repasar' : undefined}
          >
            Repasar significados
          </Button>
          <Button
            id="begin-round-btn"
            onClick={() => begin('normal')}
            loading={roundAction.busy || pending}
            disabled={chosen.length === 0 || roundAction.busy || pending}
          >
            Repasar escritura
          </Button>
        </Box>
      </ActionBar>
  );

  return (
    <Screen top={switcher} bottom={actions}>
      <Stack id="practice-content" gap="md">
        <GroupGrid groups={deck.groups} selected={selected} onToggle={toggle} />
      </Stack>
    </Screen>
  );
}
