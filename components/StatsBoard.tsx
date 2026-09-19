'use client';

import { useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { Stack, Group, SegmentedControl, Button, SimpleGrid, Paper, Text, Progress, Divider } from '@mantine/core';
import { MetricTile } from './MetricTile';
import { errorFrom, NETWORK_ERROR } from '@/lib/client/errors';
import { ROUND_KEY, USED_ROUND_KEY } from '@/lib/quiz/stored-round';
import type { Overview, WorstCard, StatsRange } from '@/lib/services/stats';

/** Semáforo del spec: jade ≥85%, ámbar 60–85%, shu <60%. Único lugar de la
 * app donde aparece un tercer color además de jade/shu. */
function tone(acc: number) {
  if (acc >= 0.85) return 'jade.6';
  if (acc >= 0.6) return 'yellow.6';
  return 'shu.6';
}

function subscribeNoop() {
  return () => {};
}

/**
 * `true` recién después de montar en el cliente. Formatear una fecha con
 * `toLocaleString` durante el render del servidor puede dar un resultado
 * distinto al del navegador (husos horarios distintos), lo que dispara un
 * warning de hidratación si se hace directo. Con `useSyncExternalStore` el
 * primer render del cliente (el que hidrata) usa `getServerSnapshot` (false,
 * igual que el servidor) y recién el siguiente render -ya hidratado- usa
 * `getSnapshot` (true) y muestra la fecha real. Mismo patrón que
 * `app/quiz/page.tsx` usa para leer `sessionStorage`.
 */
function useMounted(): boolean {
  return useSyncExternalStore(subscribeNoop, () => true, () => false);
}

const HOUR_24 = { hour: '2-digit', minute: '2-digit', hour12: false } as const;

/** "Hoy 18:30", "Ayer 09:05" o "17/9/26 18:30" según qué tan lejos esté `iso`
 * del día de hoy. Siempre en formato 24 horas -nunca a. m./p. m., en ningún
 * lado de la app. */
function formatRoundDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  const time = date.toLocaleTimeString('es-AR', HOUR_24);
  if (days === 0) return `Hoy ${time}`;
  if (days === 1) return `Ayer ${time}`;
  return `${date.toLocaleDateString('es-AR')} ${time}`;
}

function HistoryDate({ iso }: { iso: string }) {
  const mounted = useMounted();
  if (!mounted) return <Text size="xs" c="dimmed" w={130}>&nbsp;</Text>;
  return <Text size="xs" c="dimmed" w={130}>{formatRoundDate(iso)}</Text>;
}

const REVIEW_LIMIT = 20;

export function StatsBoard({
  overview: o, worst, range,
}: { overview: Overview; worst: WorstCard[]; range: StatsRange }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Guarda contra doble click con una ref, no con estado: ver PracticeBoard.
  const busyRef = useRef(false);

  async function review() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/sessions/review', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        // Se manda el `range` que está mirando la pantalla: si el botón
        // prometió "N peores" calculadas sobre "Siempre", la ronda tiene
        // que armarse sobre ese mismo rango y no sobre los 30 días por
        // defecto del service.
        body: JSON.stringify({ limit: REVIEW_LIMIT, range }),
      });
      if (!res.ok) {
        // Falló: se libera la guarda acá (y en el catch de abajo) para que
        // un reintento sea posible. En el camino feliz la guarda NO se
        // libera -se queda tomada a propósito, ver el comentario después
        // del `router.push`-.
        setError(await errorFrom(res));
        busyRef.current = false;
        setBusy(false);
        return;
      }
      sessionStorage.setItem(ROUND_KEY, JSON.stringify(await res.json()));
      // Ronda nueva sin jugar: cualquier marca de "ya usada" es de otra.
      sessionStorage.removeItem(USED_ROUND_KEY);
      router.push('/quiz');
      // No se libera la guarda ni se apaga `busy` acá: `router.push` deja el
      // componente montado mientras navega, y un segundo click en esa
      // ventana abriría una segunda sesión de repaso que nunca se cierra
      // (la clase de bug de las Tasks 11 y 13). El componente se desmonta
      // al llegar a /quiz, así que no hace falta un reset explícito.
    } catch {
      setError(NETWORK_ERROR);
      busyRef.current = false;
      setBusy(false);
    }
  }

  const reviewCount = Math.min(REVIEW_LIMIT, worst.length);

  return (
    <Stack gap="md">
      {/* En teléfono el orden real del documento es rango → tiles → botón
          (así el botón queda debajo de las tiles y a lo ancho completo);
          en escritorio `.knd-stats-top` los reacomoda con CSS Grid para que
          el botón vuelva a estar al lado del selector de rango, como en el
          diseño. Nada se duplica ni se oculta: es el mismo único botón en
          los dos casos. */}
      <div className="knd-stats-top">
        <div className="knd-stats-range">
          <SegmentedControl
            value={range}
            onChange={(v) => router.push(`/stats?window=${v}`)}
            data={[
              { value: '7d', label: '7 días' },
              { value: '30d', label: '30 días' },
              { value: 'all', label: 'Siempre' },
            ]}
          />
        </div>

        <SimpleGrid className="knd-stats-tiles" cols={{ base: 2, sm: 4 }} spacing="xs">
          <MetricTile label="Aciertos" value={`${Math.round(o.accuracy * 100)}%`}
            hint={`${o.correct} de ${o.attempts}`} />
          <MetricTile label="Errores" value={o.incorrect} tone="bad" />
          <MetricTile label="Rondas" value={o.rounds} />
          <MetricTile label="Dominadas" value={o.mastered} hint={`de ${o.totalCards} cartas`} />
        </SimpleGrid>

        <Stack gap={4} align="flex-end" className="knd-stats-review">
          <Button
            className="knd-review-btn"
            onClick={review}
            loading={busy}
            disabled={busy || worst.length === 0}
          >
            {worst.length === 0 ? 'Practicar mis peores' : `Practicar mis ${reviewCount} peores ➜`}
          </Button>
          {error && <Text size="xs" c="shu.6">{error}</Text>}
        </Stack>
      </div>

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
              {i > 0 && <Divider my={10} />}
              <Group gap="sm" wrap="nowrap" py={4}>
                <HistoryDate iso={h.startedAt} />
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
