'use client';

import { useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { Stack, Group, SegmentedControl, Button, SimpleGrid, Paper, Text, Progress, Divider } from '@mantine/core';
import { MetricTile } from './MetricTile';
import { errorFrom, NETWORK_ERROR } from '@/lib/client/errors';
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
 * `app/practicar/page.tsx` usa para leer `sessionStorage`.
 */
function useMounted(): boolean {
  return useSyncExternalStore(subscribeNoop, () => true, () => false);
}

function HistoryDate({ iso }: { iso: string }) {
  const mounted = useMounted();
  if (!mounted) return <Text size="xs" c="dimmed" w={130}>&nbsp;</Text>;
  return (
    <Text size="xs" c="dimmed" w={130}>
      {new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
    </Text>
  );
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
        body: JSON.stringify({ limit: REVIEW_LIMIT }),
      });
      if (!res.ok) {
        setError(await errorFrom(res));
        return;
      }
      sessionStorage.setItem('ronda', JSON.stringify(await res.json()));
      router.push('/practicar');
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const reviewCount = Math.min(REVIEW_LIMIT, worst.length);

  return (
    <Stack gap="md">
      <Group align="flex-start">
        <SegmentedControl
          value={range}
          onChange={(v) => router.push(`/estadisticas?window=${v}`)}
          data={[
            { value: '7d', label: '7 días' },
            { value: '30d', label: '30 días' },
            { value: 'all', label: 'Siempre' },
          ]}
        />
        <Stack gap={4} ml="auto" align="flex-end">
          <Button onClick={review} loading={busy} disabled={busy || worst.length === 0}>
            {worst.length === 0 ? 'Practicar mis peores' : `Practicar mis ${reviewCount} peores →`}
          </Button>
          {error && <Text size="xs" c="shu.6">{error}</Text>}
        </Stack>
      </Group>

      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
        <MetricTile label="Aciertos" value={`${Math.round(o.accuracy * 100)}%`}
          hint={`${o.correct} de ${o.attempts}`} />
        <MetricTile label="Errores" value={o.incorrect} tone="bad" />
        <MetricTile label="Rondas" value={o.rounds} />
        <MetricTile label="Dominadas" value={o.mastered} hint={`de ${o.totalCards} cartas`} />
      </SimpleGrid>

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
              {i > 0 && <Divider mb={6} />}
              <Group gap="sm" wrap="nowrap">
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
