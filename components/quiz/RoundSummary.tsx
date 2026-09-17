'use client';

import { useEffect, useEffectEvent } from 'react';
import { Overlay, Paper, Stack, Group, Text, Progress, Kbd } from '@mantine/core';
import { accuracy, type RoundState } from '@/lib/quiz/engine';

const AUTO_CONTINUE_MS = 6000;

export type MissEntry = { cardId: number; prompt: string; primary: string; count: number };

/**
 * Resumen de la ronda. No tiene listener de teclado propio: QuizRunner ya
 * mantiene un único listener global (Task 12) y lo extiende para enrutar la
 * tecla hacia `onContinue`/Esc cuando la ronda terminó. Duplicar el listener
 * acá haría que Esc dispare la navegación dos veces y competiría por la
 * tecla que tiene que llegar al input.
 */
export function RoundSummary({
  state, elapsedMs, misses, mode, onContinue,
}: {
  state: RoundState;
  elapsedMs: number;
  misses: MissEntry[];
  mode: 'normal' | 'review';
  onContinue: () => void;
}) {
  // `useEffectEvent`, no `onContinue` en las deps: si no, cualquier re-render
  // del padre (por ejemplo el flash de significado de la última carta)
  // recrearía `onContinue` y este efecto se limpiaría y volvería a montar,
  // reiniciando los 6s desde cero en vez de contarlos desde que se mostró
  // el resumen.
  const onAutoContinue = useEffectEvent(() => onContinue());
  useEffect(() => {
    // Si no se toca nada, arranca sola: el requisito es que el flujo no se corte.
    const t = setTimeout(onAutoContinue, AUTO_CONTINUE_MS);
    return () => clearTimeout(t);
  }, []);

  const sorted = [...misses].sort((a, b) => b.count - a.count).slice(0, 5);
  const mins = Math.floor(elapsedMs / 60000);
  const secs = Math.floor((elapsedMs % 60000) / 1000);
  const worst = sorted[0]?.count ?? 1;

  return (
    <Overlay color="var(--mantine-color-dark-7)" backgroundOpacity={0.93} zIndex={10} center>
      <Paper withBorder p="lg" maw={400} w="90%">
        <Stack gap="md">
          <Text fw={700} className="kana">Ronda completa</Text>

          <Group gap="xl">
            <Stack gap={0}>
              <Text size="xl" fw={600} className="tabular">{Math.round(accuracy(state) * 100)}%</Text>
              <Text size="xs" c="dimmed" tt="uppercase">Aciertos</Text>
            </Stack>
            <Stack gap={0}>
              <Text size="xl" fw={600} className="tabular">{state.correct}</Text>
              <Text size="xs" c="dimmed" tt="uppercase">Cartas</Text>
            </Stack>
            <Stack gap={0}>
              <Text size="xl" fw={600} className="tabular" c="shu.6">{state.incorrect}</Text>
              <Text size="xs" c="dimmed" tt="uppercase">Errores</Text>
            </Stack>
            <Stack gap={0}>
              <Text size="xl" fw={600} className="tabular">{mins}:{String(secs).padStart(2, '0')}</Text>
              <Text size="xs" c="dimmed" tt="uppercase">Tiempo</Text>
            </Stack>
          </Group>

          {sorted.length > 0 && (
            <Stack gap={5}>
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

          <Text size="xs" c="dimmed">
            <Kbd>escribí</Kbd> {mode === 'review'
              ? 'para volver a estadísticas'
              : 'para seguir con otra ronda'} · <Kbd>Esc</Kbd> para salir
          </Text>
        </Stack>
      </Paper>
    </Overlay>
  );
}
