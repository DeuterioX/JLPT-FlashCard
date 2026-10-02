'use client';

import { Group, Paper } from '@mantine/core';
import styles from './ActionBar.module.css';

/**
 * La barra de acción de abajo de una pantalla: el conteo a la izquierda y la
 * acción a la derecha.
 *
 * Va en la franja `bottom` de `Screen`, así que siempre está pegada al pie
 * sin flotar: ocupa su lugar en la columna y el contenido scrollea arriba de
 * ella, no detrás. Antes era `position: fixed` con un espaciador que medía su
 * altura con `ResizeObserver` para reservarle el lugar, y ese espaciador falló
 * dos veces por fracciones de pixel con zoom.
 */
export function ActionBar({ children }: { children: React.ReactNode }) {
  return (
    <Paper
      id="action-bar"
      withBorder
      radius={0}
      style={{
        // El inset horizontal es el mismo `md` del contenido de arriba, para
        // que la barra quede alineada con las tarjetas. El vertical (12px)
        // es el del diseño.
        padding: '0.75rem var(--mantine-spacing-md)',
        borderLeft: 0,
        borderRight: 0,
        borderBottom: 0,
      }}
    >
      {/* En escritorio el conteo va a la izquierda y la acción a la
          derecha, en una fila. En teléfono la fila no entra -medido: «4
          grupos · 20 cartas» y los dos verbos en 390px partían el conteo en
          dos renglones-, así que el diseño apila: el conteo arriba y el
          control a ancho completo abajo. Lo decide `.${styles.actionbarRow}` en
          globals.css, no un `useMediaQuery`, por lo mismo que el resto de la
          app: el servidor y el cliente tienen que emitir lo mismo. */}
      <Group gap="md" justify="space-between" wrap="nowrap" className={styles.actionbarRow}>
        {children}
      </Group>
    </Paper>
  );
}
