import { Paper, Stack, Text } from '@mantine/core';

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
  id, label, value, hint, tone = 'normal', color,
}: {
  id?: string;
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'normal' | 'bad';
  /**
   * El color de la cifra, cuando lo decide el dato y no la tile. Lo usa
   * Aciertos, que en el diseño va en el semáforo -verde, ámbar o rojo según el
   * porcentaje- igual que las barras de los paneles de abajo: la tile más
   * importante de la pantalla era la única sin decir nada con su color.
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
      style={{ padding: '0.6875rem 0.8125rem', borderColor: 'var(--knd-border-soft)' }}
    >
      <Stack gap={2}>
        <Text size="0.5625rem" lh={1.4} tt="uppercase" c="dark.3" style={{ letterSpacing: '0.06em' }}>
          {label}
        </Text>
        <Text size="1.3125rem" lh={1.25} fw={600} className="tabular" c={color ?? (tone === 'bad' ? 'var(--knd-shu-txt)' : undefined)}>
          {value}
        </Text>
        {hint && <Text size="0.65625rem" lh={1.4} c="dark.3">{hint}</Text>}
      </Stack>
    </Paper>
  );
}
