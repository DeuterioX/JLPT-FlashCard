'use client';

import { Fragment } from 'react';
import { Overlay, Paper, Stack, Group, Text, Progress, Kbd } from '@mantine/core';
import { accuracy, type RoundState } from '@/lib/quiz/engine';
import { SectionLabel } from '../SectionLabel';
import styles from './RoundSummary.module.css';

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
  mode: 'normal' | 'review' | 'meaning';
}) {
  const sorted = [...misses].sort((a, b) => b.count - a.count).slice(0, 5);
  const mins = Math.floor(elapsedMs / 60000);
  const secs = Math.floor((elapsedMs % 60000) / 1000);
  const worst = sorted[0]?.count ?? 1;

  return (
    <Overlay id="round-summary-overlay" color="var(--mantine-color-dark-7)" backgroundOpacity={0.93} zIndex={10} center>
      {/* Radio 12px = la escala `lg` del tema (ver theme.ts), padding
          asimétrico 20px/24px y gap 14px del mockup -ninguno de los dos
          coincide con un valor nombrado de Mantine (`lg`=20px parejo,
          `xl`=32px), así que van literales en rem-. */}
      {/* El ancho lo decide el CSS y no `maw`/`w`: Mantine los escribe inline y
          ninguna regla les podría ganar. Ver `.panel`. */}
      <Paper
        id="round-summary-panel"
        withBorder
        radius="lg"
        className={styles.panel}
      >
        <Stack gap="0.875rem">
          {/* 15px del mockup: como con el label de GroupCard, un `size`
              en string libre necesita `lh` explícito -Mantine no encuentra
              en qué entrada de `theme.lineHeights` buscar para un tamaño
              fuera de la escala y devuelve un line-height menor que la
              propia letra-. */}
          <Text id="round-summary-title" fw={700} size="0.9375rem" lh={1.3} className="kana">
            Ronda completa
          </Text>

          {/* 22px del mockup, no el `xl` (32px) del tema. */}
          <Group id="round-summary-stats" gap="1.375rem">
            <Stack id="round-summary-accuracy" gap={0}>
              <Text size="xl" fw={600} className="tabular">{Math.round(accuracy(state) * 100)}%</Text>
              <Text size="xs" c="dimmed" tt="uppercase" className="knd-metric-label">Aciertos</Text>
            </Stack>
            <Stack id="round-summary-correct" gap={0}>
              <Text size="xl" fw={600} className="tabular">{state.correct}</Text>
              <Text size="xs" c="dimmed" tt="uppercase" className="knd-metric-label">Cartas</Text>
            </Stack>
            <Stack id="round-summary-errors" gap={0}>
              <Text size="xl" fw={600} className="tabular knd-error">{state.incorrect}</Text>
              <Text size="xs" c="dimmed" tt="uppercase" className="knd-metric-label">Errores</Text>
            </Stack>
            <Stack id="round-summary-time" gap={0}>
              <Text size="xl" fw={600} className="tabular">{mins}:{String(secs).padStart(2, '0')}</Text>
              <Text size="xs" c="dimmed" tt="uppercase" className="knd-metric-label">Tiempo</Text>
            </Stack>
          </Group>

          {sorted.length > 0 && (
            <div id="round-summary-misses" className={styles.misses}>
              {/* Mismo encabezado de sección que el resto de la app, ahora
                  desde el componente compartido (ver SectionLabel.tsx). */}
              <div className={styles.missesLabel}>
                <SectionLabel>Las que te costaron</SectionLabel>
              </div>
              {/* Una grilla y no una fila por palabra: las columnas son
                  COMPARTIDAS, así que la palabra más larga ensancha la columna
                  de todas y las barras arrancan alineadas. Con anchos fijos de
                  34 y 46px, シャープペンシル se partía en cuatro renglones y su
                  romaji se metía encima de la barra. */}
              {sorted.map((m) => (
                <Fragment key={m.cardId}>
                  <Text className={`kana ${styles.cell}`} title={m.prompt}>{m.prompt}</Text>
                  <Text className={`romaji ${styles.cell}`} size="xs" c="dimmed" title={m.primary}>{m.primary}</Text>
                  <Progress value={(m.count / worst) * 100} color="shu.6" size="xs" />
                  {/* `dark.3` (--a-dimmer), no `dimmed` (dark.2, el mismo
                      tono que el romaji de al lado): en el diseño es un
                      escalón más apagado que la columna de al lado. */}
                  <Text size="xs" c="dark.3" className="tabular">{m.count}</Text>
                </Fragment>
              ))}
            </div>
          )}

          {/* `Group` con `gap`, no texto suelto con Kbd/espacios intercalados
              a mano -ver la regla en CLAUDE.md: siempre `gap`, nunca
              caracteres de espacio como separador entre elementos-. */}
          <Group id="round-summary-hint" gap="0.5rem">
            <Kbd>Enter</Kbd>
            <Text size="xs" c="dimmed">
              {mode === 'review' ? 'para volver a estadísticas' : 'para seguir con otra ronda'}
            </Text>
            <Text size="xs" c="dimmed">·</Text>
            <Kbd>Esc</Kbd>
            <Text size="xs" c="dimmed">para salir</Text>
          </Group>
        </Stack>
      </Paper>
    </Overlay>
  );
}
