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
    const observer = new ResizeObserver(() => setSwitcherHeight(el.offsetHeight));
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

  async function begin() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ groupIds: chosen.map((g) => g.id) }),
      });
      if (!res.ok) {
        setError(await errorFrom(res, START_ROUND_ERROR));
        busyRef.current = false;
        setBusy(false);
        return;
      }
      const round = await res.json();
      sessionStorage.setItem(ROUND_KEY, JSON.stringify(round));
      // Ronda nueva sin jugar: cualquier marca de "ya usada" es de otra.
      sessionStorage.removeItem(USED_ROUND_KEY);
      start(() => router.push('/practicar'));
      // En el camino feliz la guarda queda tomada a propósito: el componente
      // sigue montado mientras navega y un segundo tap abriría otra sesión.
      // Se desmonta al llegar a /practicar.
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
            que ya usa `.knd-editor-groups-mobile` en el editor de mazo. */}
        <Box className="knd-deck-switcher" style={{ flex: '1 1 auto', minWidth: 0, overflowX: 'auto' }}>
          <SegmentedControl
            value={deckId}
            onChange={setDeckId}
            data={decks.map((d) => ({ value: String(d.id), label: d.name }))}
          />
        </Box>
        {/* "Seleccionar:" y los dos botones son una sola unidad -si no
            entran al lado del selector de mazos, bajan los tres juntos a
            la línea siguiente, nunca separados entre sí-. */}
        <Group gap="xs" wrap="nowrap" ml="auto">
          <Text size="xs" c="dimmed">Seleccionar:</Text>
          {/* `.btn` en el diseño trae borde SIEMPRE (`.ghost` solo le saca
              el fondo, no el borde). La variante `default` de Mantine es
              la que ya viene con borde neutro sin depender del color
              primario -`subtle` no tiene borde para nada-. */}
          <Button variant="default" size="compact-xs" onClick={() => setAll(true)}>
            Todos
          </Button>
          <Button variant="default" size="compact-xs" onClick={() => setAll(false)}>
            Ninguno
          </Button>
        </Group>
      </Group>
      <div style={{ height: switcherHeight }} aria-hidden />

      <Stack gap="md">
        <GroupGrid groups={deck.groups} selected={selected} onToggle={toggle} />

        <ActionBar>
          {/* `.count` del diseño: la base va atenuada (`--a-dim`) y solo
              los números en `--a-text` con peso 600 -no el 700 que el
              navegador le pone a un `<b>` suelto-. */}
          <Text size="12px" c="dimmed">
            <Text component="span" c="var(--mantine-color-text)" fw={600} inherit>{chosen.length}</Text> grupos ·{' '}
            <Text component="span" c="var(--mantine-color-text)" fw={600} inherit>{cardCount}</Text> cartas
          </Text>
          {error && (
            <Text size="sm" c="shu.6">
              {error}
            </Text>
          )}
          <Button
            ml="auto"
            onClick={begin}
            loading={busy || pending}
            disabled={chosen.length === 0 || busy || pending}
          >
            Comenzar ➜
          </Button>
        </ActionBar>
      </Stack>
    </>
  );
}
