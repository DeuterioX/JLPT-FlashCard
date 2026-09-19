'use client';

import { Overlay, Paper, Stack, Group, Text, Progress, Kbd } from '@mantine/core';
import { accuracy, type RoundState } from '@/lib/quiz/engine';

export type MissEntry = { cardId: number; prompt: string; primary: string; count: number };

/**
 * Resumen de la ronda. Se queda en pantalla hasta que el usuario decide
 * seguir -no hay avance automático-: Enter continúa, Esc sale. No tiene
 * listener de teclado propio: QuizRunner ya mantiene un único listener
 * global (Task 12) y lo extiende para enrutar esas dos teclas hacia
 * `onContinue`/Esc cuando la ronda terminó. Duplicar el listener acá haría
 * que Esc dispare la navegación dos veces y competiría por la tecla que
 * tiene que llegar al input.
 */
export function RoundSummary({
  state, elapsedMs, misses, mode,
}: {
  state: RoundState;
  elapsedMs: number;
  misses: MissEntry[];
  mode: 'normal' | 'review';
}) {
  const sorted = [...misses].sort((a, b) => b.count - a.count).slice(0, 5);
  const mins = Math.floor(elapsedMs / 60000);
  const secs = Math.floor((elapsedMs % 60000) / 1000);
  const worst = sorted[0]?.count ?? 1;

  return (
    <Overlay id="round-summary-overlay" color="var(--mantine-color-dark-7)" backgroundOpacity={0.93} zIndex={10} center>
      <Paper id="round-summary-panel" withBorder p="lg" maw={400} w="90%">
        <Stack gap="md">
          <Text id="round-summary-title" fw={700} className="kana">Ronda completa</Text>

          <Group id="round-summary-stats" gap="xl">
            <Stack id="round-summary-accuracy" gap={0}>
              <Text size="xl" fw={600} className="tabular">{Math.round(accuracy(state) * 100)}%</Text>
              <Text size="xs" c="dimmed" tt="uppercase">Aciertos</Text>
            </Stack>
            <Stack id="round-summary-correct" gap={0}>
              <Text size="xl" fw={600} className="tabular">{state.correct}</Text>
              <Text size="xs" c="dimmed" tt="uppercase">Cartas</Text>
            </Stack>
            <Stack id="round-summary-errors" gap={0}>
              <Text size="xl" fw={600} className="tabular" c="shu.6">{state.incorrect}</Text>
              <Text size="xs" c="dimmed" tt="uppercase">Errores</Text>
            </Stack>
            <Stack id="round-summary-time" gap={0}>
              <Text size="xl" fw={600} className="tabular">{mins}:{String(secs).padStart(2, '0')}</Text>
              <Text size="xs" c="dimmed" tt="uppercase">Tiempo</Text>
            </Stack>
          </Group>

          {sorted.length > 0 && (
            <Stack id="round-summary-misses" gap={5}>
              <Text size="xs" tt="uppercase" c="dimmed">Las que te costaron</Text>
              {sorted.map((m) => (
                <Group key={m.cardId} gap="sm" wrap="nowrap">
                  <Text className="kana" w={34}>{m.prompt}</Text>
                  <Text className="romaji" size="xs" c="dimmed" w={46}>{m.primary}</Text>
                  <Progress value={(m.count / worst) * 100} color="shu.6" size="xs" style={{ flex: 1 }} />
                  <Text size="xs" c="dimmed" className="tabular">{m.count}</Text>
                </Group>
              ))}
            </Stack>
          )}

          <Text id="round-summary-hint" size="xs" c="dimmed">
            <Kbd>Enter</Kbd> {mode === 'review'
              ? 'para volver a estadísticas'
              : 'para seguir con otra ronda'} · <Kbd>Esc</Kbd> para salir
          </Text>
        </Stack>
      </Paper>
    </Overlay>
  );
}
