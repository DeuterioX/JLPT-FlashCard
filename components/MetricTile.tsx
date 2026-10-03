import { Paper, Stack, Text } from '@mantine/core';
import styles from './MetricTile.module.css';

/**
 * Tile de métrica de Estadísticas (`.tile` del diseño). Los tres tamaños de
 * texto son literales y no valores nombrados de Mantine porque ninguno cae
 * en la escala: 9px el label, 21px el número y 10.5px la línea de abajo (el
 * `xs` más chico de Mantine es 12px). Como pasa con cualquier `size` fuera
 * de escala, hace falta `lh` explícito: Mantine no encuentra contra qué
 * entrada de `theme.lineHeights` resolverlo y devuelve uno más chico que la
 * propia letra.
 */
export function MetricTile({
  id, label, value, hint, color,
}: {
  id?: string;
  label: string;
  value: string | number;
  hint?: string;
  /**
   * El color de la cifra, cuando la cifra dice algo con él: Aciertos va en el
   * semáforo según el porcentaje, y Errores siempre en rojo.
   */
  color?: string;
}) {
  return (
    <Paper
      id={id}
      withBorder
      radius={8}
      // Padding asimétrico 11/13 y borde `--a-border-soft` del diseño: el
      // `withBorder` de Mantine trae `dark.4`, un tono más claro.
      className={styles.tile}
    >
      <Stack gap={2}>
        <Text size="0.5625rem" lh={1.4} tt="uppercase" c="dark.3" className="knd-metric-label">
          {label}
        </Text>
        <Text size="1.3125rem" lh={1.25} fw={600} className="tabular" c={color}>
          {value}
        </Text>
        {hint && <Text size="0.65625rem" lh={1.4} c="dark.3">{hint}</Text>}
      </Stack>
    </Paper>
  );
}
