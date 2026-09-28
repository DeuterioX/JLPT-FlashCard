'use client';

import { useEffect, useLayoutEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Stack, Group, SegmentedControl, Button, Text, Box } from '@mantine/core';
import { GroupGrid } from './GroupGrid';
import { ActionBar } from './ActionBar';
import { SELECTION_COOKIE, serializeSelection } from '@/lib/selection-cookie';
import { errorFrom, NETWORK_ERROR } from '@/lib/client/errors';
import { ROUND_KEY, USED_ROUND_KEY } from '@/lib/quiz/stored-round';
import type { DeckSummary } from '@/lib/services/decks';

const START_ROUND_ERROR = 'No se pudo empezar la ronda. Probá de nuevo.';

export function PracticeBoard({
  decks, initialSelection,
}: { decks: DeckSummary[]; initialSelection: number[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [deckId, setDeckId] = useState(String(decks[0]?.id ?? ''));
  const [selected, setSelected] = useState(new Set(initialSelection));
  // `busy` cubre el tramo del fetch en sí: `pending` (de useTransition) solo
  // se prende durante el router.push posterior, así que sin `busy` el botón
  // quedaba clickeable mientras la request estaba en vuelo y un doble tap
  // abría dos sesiones.
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Guarda contra reentrada con una ref, no con `busy`: el estado recién se
  // ve en el render siguiente, así que dos taps en el mismo tick pasaban los
  // dos. Mismo patrón que StatsBoard.
  const busyRef = useRef(false);

  // `position: fixed`, no `sticky`: un sticky puesto en su posición final
  // desde el principio necesita márgenes negativos para "adelantarse" al
  // padding de `MantineShell.Main` y al `gap` del `Stack` -y ese margen
  // negativo también le corre el piso a todo lo que viene después en el
  // mismo Stack, comiéndose el aire antes de la grilla de grupos (pasó de
  // verdad, quedaban pegadas)-. `fixed` la saca del flujo del documento
  // por completo, así que nada de eso puede pasar; el precio es que hay
  // que reservarle el lugar a mano, con un espaciador que mide su altura
  // real -mismo patrón que ya usa `ActionBar` para el mismo problema
  // abajo del todo-.
  const [switcherHeight, setSwitcherHeight] = useState(0);
  const switcherRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = switcherRef.current;
    if (!el) return;
    // `offsetHeight` redondea a entero -a zoom normal (100%) esa fracción
    // perdida es invisible, pero a 150% se nota: la barra real medía
    // 100.89px y el espaciador reservaba 100.5px, así que el borde de la
    // primera tarjeta quedaba tapado por esos ~0.4px de diferencia -pasó
    // de verdad, reproducido con zoom simulado-. `getBoundingClientRect`
    // no redondea.
    const observer = new ResizeObserver(() => setSwitcherHeight(el.getBoundingClientRect().height));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // El borde inferior solo tiene que verse una vez que hay contenido
  // scrolleado debajo -si no, se ve como un subrayado suelto flotando en
  // medio de la página-. Como la barra ya no se mueve nunca (está
  // `fixed`), alcanza con mirar si la página se scrolleó, sin
  // `IntersectionObserver` ni centinela.
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const deck = decks.find((d) => String(d.id) === deckId) ?? decks[0];

  function persist(next: Set<number>) {
    setSelected(next);
    setError(null);
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

  async function begin(mode: 'normal' | 'meaning' = 'normal') {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ groupIds: chosen.map((g) => g.id), mode }),
      });
      if (!res.ok) {
        setError(await errorFrom(res, START_ROUND_ERROR));
        busyRef.current = false;
        setBusy(false);
        return;
      }
      const round = await res.json();
      // `deckName` viaja aparte del `round` que devuelve el server: la API
      // de sesiones no conoce el mazo, solo los `groupIds` -acá sí se sabe,
      // es el mazo que se estaba mirando al arrancar-. Lo usa la barra
      // superior del quiz ("Hiragana · 6 grupos").
      sessionStorage.setItem(ROUND_KEY, JSON.stringify({ ...round, deckName: deck.name }));
      // Ronda nueva sin jugar: cualquier marca de "ya usada" es de otra.
      sessionStorage.removeItem(USED_ROUND_KEY);
      start(() => router.push('/quiz'));
      // En el camino feliz la guarda queda tomada a propósito: el componente
      // sigue montado mientras navega y un segundo tap abriría otra sesión.
      // Se desmonta al llegar a /quiz.
    } catch {
      // fetch tiró (sin red, DNS, CORS, etc.): no hubo respuesta que leer.
      setError(NETWORK_ERROR);
      busyRef.current = false;
      setBusy(false);
    }
  }

  if (!deck) {
    return (
      <Stack p="xl" gap="xs">
        <Text c="dimmed">Todavía no hay mazos para practicar.</Text>
      </Stack>
    );
  }

  return (
    <>
      {/* Fija arriba siempre -no solo cuando el scroll la alcanza-, con
          el mismo patrón de `ActionBar`: `position: fixed` la saca del
          documento por completo, así que ni el `padding` de
          `MantineShell.Main` ni el `gap` del `Stack` de abajo pueden
          afectarla ni ser afectados por ella -a diferencia de un
          `sticky` "adelantado" con margen negativo, que sí les corría
          el piso a las tarjetas de más abajo (pasó de verdad)-. El
          espaciador de abajo reserva su altura real para que nada quede
          tapado. `--app-shell-header-height` es la misma variable que
          Mantine usa para su propio header, así que quedan exactos sin
          repetir el 48 a mano. `bg` es necesario para no dejar ver las
          tarjetas de atrás al scrollear debajo. El borde inferior solo
          aparece con `scrolled` -en la página sin scrollear no hace
          falta remarcarla contra nada-. */}
      <Group
        ref={switcherRef}
        id="deck-switcher-bar"
        wrap="wrap"
        gap="sm"
        pos="fixed"
        top="var(--app-shell-header-height)"
        left={0}
        right={0}
        bg="dark.7"
        style={{
          zIndex: 10,
          // `.stage { padding: 18px 16px }` del diseño: el aire entre el
          // header y esta fila es 18px, no 0.
          paddingTop: '1.125rem',
          // Y este es el aire hacia la grilla de grupos, el `gap` de
          // 16px que el `.stage` del diseño le pone a todo lo que apila.
          paddingBottom: 'var(--mantine-spacing-md)',
          paddingInline: 'var(--mantine-spacing-md)',
          borderBottom: scrolled ? '1px solid var(--mantine-color-default-border)' : '1px solid transparent',
        }}
      >
        {/* Con muchos mazos el SegmentedControl no entra en una pantalla
            angosta: Mantine no lo hace, pero no puede hacer wrap a varias
            líneas -el indicador animado asume una sola fila- ni hace
            scroll solo. `min-width: 0` dentro de un `Group` es necesario
            para que el `overflow-x` realmente pueda achicar la caja en
            vez de empujar a los hermanos fuera de pantalla; mismo patrón
            que ya usan las listas horizontales de la app. */}
        <Box id="deck-picker" className="knd-deck-switcher" style={{ flex: '1 1 auto', minWidth: 0, overflowX: 'auto' }}>
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
        <Group id="select-all-controls" gap="xs" wrap="nowrap" ml="auto">
          <Text size="xs" c="dimmed">Seleccionar:</Text>
          {/* `.btn` en el diseño trae borde SIEMPRE (`.ghost` solo le saca
              el fondo, no el borde). La variante `default` de Mantine es
              la que ya viene con borde neutro sin depender del color
              primario -`subtle` no tiene borde para nada-. */}
          <Button id="select-all-btn" variant="default" size="compact-xs" onClick={() => setAll(true)}>
            Todos
          </Button>
          <Button id="select-none-btn" variant="default" size="compact-xs" onClick={() => setAll(false)}>
            Ninguno
          </Button>
        </Group>
      </Group>
      {/* Este div, en flujo normal, arranca donde arranca cualquier hijo
          normal de `MantineShell.Main` -en su borde de padding, 64px
          desde arriba (48 del header + 16 del `padding="md"`)-, NO donde
          arranca la barra `fixed` de más arriba (48px). El `marginTop`
          negativo alinea su arranque con el de la barra de verdad.
          La altura es SOLO `switcherHeight` -la altura real de la barra,
          medida-, sin sumarle nada más: el gap hacia la grilla ya está
          adentro de esa altura, es el `paddingBottom` de la barra. Sumar
          un `+ md` acá arriba duplicaba ese gap (16px del padding de la
          barra + 16px de más acá). */}
      <div
        id="deck-switcher-spacer"
        style={{
          marginTop: 'calc(var(--mantine-spacing-md) * -1)',
          height: switcherHeight,
        }}
        aria-hidden
      />

      <Stack id="practice-content" gap="md">
        <GroupGrid groups={deck.groups} selected={selected} onToggle={toggle} />

        <ActionBar>
          {/* `.count` del diseño: la base va atenuada (`--a-dim`) y solo
              los números en `--a-text` con peso 600 -no el 700 que el
              navegador le pone a un `<b>` suelto-. `Group` con `gap`, no
              texto suelto con espacios intercalados a mano: un espacio de
              texto JSX pegado al cierre de un tag puede colapsar a ancho
              CERO (regla en CLAUDE.md, encontrado primero en el header
              del quiz). */}
          <Group id="selection-count" gap="0.25rem" wrap="wrap">
            <Text component="span" size="12px" c="var(--mantine-color-text)" fw={600}>{chosen.length}</Text>
            <Text component="span" size="12px" c="dimmed">grupos</Text>
            <Text component="span" size="12px" c="dimmed">·</Text>
            <Text component="span" size="12px" c="var(--mantine-color-text)" fw={600}>{cardCount}</Text>
            <Text component="span" size="12px" c="dimmed">cartas</Text>
          </Group>
          {error && (
            <Text size="sm" c="shu.6">
              {error}
            </Text>
          )}
          {/* Los dos verbos con los que arranca una ronda. El modo no es un
              selector aparte: es la acción, y el que apretás decide de qué
              ronda se trata. «Significados» se apaga cuando ninguna de las
              cartas elegidas tiene uno -un mazo de kana entero-, con el
              motivo en el `title`. */}
          <Box className="knd-verbos" ml="auto">
            <Button
              id="begin-meaning-btn"
              variant="default"
              onClick={() => begin('meaning')}
              loading={busy || pending}
              disabled={chosen.length === 0 || meaningCount === 0 || busy || pending}
              title={meaningCount === 0 ? 'Estas cartas no tienen significado que repasar' : undefined}
            >
              Significados ➜
            </Button>
            <Button
              id="begin-round-btn"
              onClick={() => begin('normal')}
              loading={busy || pending}
              disabled={chosen.length === 0 || busy || pending}
            >
              Escribir ➜
            </Button>
          </Box>
        </ActionBar>
      </Stack>
    </>
  );
}
