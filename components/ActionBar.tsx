import { Group, Paper } from '@mantine/core';

/** Barra inferior pegajosa. Siempre lleva el conteo a la izquierda y la acción a la derecha. */
export function ActionBar({ children }: { children: React.ReactNode }) {
  return (
    <Paper
      withBorder
      p="sm"
      radius={0}
      pos="sticky"
      bottom={0}
      className="safe-bottom"
      style={{ borderLeft: 0, borderRight: 0, borderBottom: 0, zIndex: 2 }}
    >
      <Group gap="md">{children}</Group>
    </Paper>
  );
}
