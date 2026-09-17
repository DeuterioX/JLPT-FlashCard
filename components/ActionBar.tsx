import { Group, Paper } from '@mantine/core';

/**
 * Barra inferior pegajosa. Siempre lleva el conteo a la izquierda y la acción
 * a la derecha.
 *
 * `bottom` usa `--knd-bottom-offset`, la misma variable CSS que define la
 * altura de la barra de pestañas de `AppShell` (`app/globals.css`): en
 * escritorio vale 0 y esta barra queda pegada al borde; en teléfono vale la
 * altura completa de la barra de pestañas (safe-area incluida), así que esta
 * barra queda apoyada arriba de esa barra en vez de escondida detrás de ella
 * -algo que pasaba antes porque un elemento `sticky` se pega al borde real
 * del viewport sin importar el padding del contenedor, y la barra de
 * pestañas es `fixed` y opaca por encima-. No lleva su propio padding de
 * safe-area: ya está contado en la variable, y sumarlo de nuevo lo
 * duplicaría.
 */
export function ActionBar({ children }: { children: React.ReactNode }) {
  return (
    <Paper
      withBorder
      p="sm"
      radius={0}
      pos="sticky"
      style={{
        bottom: 'var(--knd-bottom-offset)',
        borderLeft: 0,
        borderRight: 0,
        borderBottom: 0,
        zIndex: 2,
      }}
    >
      <Group gap="md">{children}</Group>
    </Paper>
  );
}
