'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
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

  // El borde inferior del switcher solo tiene que verse cuando ya está
  // pegado arriba -si no, se ve como un subrayado suelto flotando en medio
  // de la página-. Un centinela sin altura, puesto justo antes de la barra,
  // dice exactamente eso: mientras el centinela está a la vista, la barra
  // todavía no se pegó; en el momento en que el centinela sale de vista
  // (tapado por el header fijo al scrollear), la barra ya está en su
  // posición `sticky`. `rootMargin` resta la altura del header (48px, la
  // misma que `AppShell.tsx` le pasa a `MantineShell`) porque si no el
  // centinela "sale de vista" recién debajo del header, no al llegar a él.
  const [stuck, setStuck] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      { rootMargin: '-48px 0px 0px 0px', threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
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
    <Stack gap="md">
      {/* Fija arriba al scrollear -mismo pedido que la barra de abajo-,
          pero acá alcanza con `position: sticky`: a diferencia de un
          sticky pegado al FONDO (que recién se activa cuando el resto
          del contenido ya llenó la pantalla, el problema real de
          `ActionBar` antes de pasarla a `fixed`), uno pegado ARRIBA
          funciona bien desde el primer render -ya está en la posición
          a la que se queda pegado-, sin el lío del espaciador.
          `top: 0` NO alcanza -pasó de verdad-: es relativo al viewport
          de scroll, no al borde inferior del header fijo, así que la
          barra se quedaba pegada DEBAJO del header (tapada, invisible)
          en vez de justo a continuación suyo. `--app-shell-header-height`
          es la misma variable que Mantine usa para posicionar su propio
          header, así que quedan exactos sin repetir el 48 a mano acá.
          `bg` es necesario para no dejar ver las tarjetas de atrás al
          scrollear debajo. El borde inferior solo aparece con `stuck`
          -mientras la barra está en su posición normal, arriba de todo,
          no hace falta remarcarla contra nada-.
          El diseño no le pone padding propio a esta fila -la separación
          sale del `gap` del `Stack`, no de un padding acá-, así que no
          hay que agregarle uno vertical (quedaba más grande que el
          diseño). El borde y el fondo, en cambio, sí tienen que llegar
          al borde real de la ventana, no solo al del contenido -esta
          fila vive adentro del `padding="md"` de `MantineShell.Main`-:
          mismo margen negativo que ya usa `ActionBar` para lo mismo, con
          el padding propio compensándolo para que el contenido no se
          pegue al borde real. */}
      <div ref={sentinelRef} style={{ height: 0 }} aria-hidden />
      <Group
        wrap="wrap"
        gap="sm"
        pos="sticky"
        top="var(--app-shell-header-height)"
        bg="dark.7"
        style={{
          zIndex: 10,
          // `MantineShell.Main` reserva 64px arriba (48 del header + 16
          // del `padding="md"`): en reposo la barra arrancaba 16px más
          // abajo de donde termina pegándose al scrollear -pasó de
          // verdad, se veía como un salto apenas arrancaba el scroll-.
          // Hacen falta DOS "md" de margen negativo, no uno: uno cancela
          // el `gap` del `Stack` entre el centinela (altura 0) y esta
          // fila, y el otro cancela el "md" extra que `padding="md"` le
          // suma al alto del header en el padding-top de `Main` -son dos
          // capas distintas, medí cada una por separado para no errarle
          // de nuevo-. Con los dos cancelados, arranca YA en los mismos
          // 48px en los que se queda fija, sin ningún salto que ver.
          marginTop: 'calc(var(--mantine-spacing-md) * -2)',
          marginInline: 'calc(var(--mantine-spacing-md) * -1)',
          paddingInline: 'var(--mantine-spacing-md)',
          borderBottom: stuck ? '1px solid var(--mantine-color-default-border)' : '1px solid transparent',
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
  );
}
