import { Paper, Stack, Text } from '@mantine/core';
import styles from './MetricTile.module.css';

/** Qué dice el color de una cifra. El valor lo pone el CSS, no el JSX. */
export type Tone = 'good' | 'warn' | 'bad';

/**
 * Tile de métrica de Estadísticas (`.tile` del diseño).
 *
 * Todas las medidas viven en `MetricTile.module.css`: ninguna cae en una escala
 * de Mantine, y pasarlas por props sería escribirlas inline, donde después no
 * hay media query que las corrija.
 */
export function MetricTile({
  id, label, value, hint, tone,
}: {
  id?: string;
  label: string;
  value: string | number;
  hint?: string;
  /**
   * Cuando la cifra dice algo con su color: Aciertos va en el semáforo según el
   * porcentaje, y Errores siempre en rojo.
   */
  tone?: Tone;
}) {
  return (
    <Paper id={id} withBorder className={styles.tile}>
      <Stack className={styles.body}>
        <Text className={`knd-metric-label ${styles.label}`}>{label}</Text>
        <Text className={`tabular ${styles.value}`} data-tone={tone}>{value}</Text>
        {hint && <Text className={styles.hint}>{hint}</Text>}
      </Stack>
    </Paper>
  );
}
