'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { Group, Paper } from '@mantine/core';

/**
 * Barra inferior FIJA. Siempre lleva el conteo a la izquierda y la acción
 * a la derecha, y siempre está pegada al borde inferior de la pantalla -no
 * solo cuando el contenido de arriba llega a llenarla-.
 *
 * `position: sticky` no alcanza: un elemento sticky recién se pega al fondo
 * de la ventana una vez que el resto del contenido ya la llenó -con pocos
 * grupos, quedaba flotando a mitad de página en vez de pegada abajo, como
 * el pie de tabs-. `position: fixed` sí queda siempre pegada, pero sale del
 * flujo del documento: el contenido de arriba pasaría a quedar tapado
 * detrás de ella si no se le reserva el espacio. Por eso el propio
 * componente mide su altura real (puede variar: el mensaje de error agrega
 * una línea) y renderiza un `<div>` invisible de esa misma altura antes de
 * la barra, en el flujo normal -así ninguna pantalla que la use tiene que
 * acordarse de reservarle nada aparte-.
 *
 * `bottom` usa `--knd-bottom-offset`, la misma variable CSS que define la
 * altura de la barra de pestañas de `AppShell` (`app/globals.css`): en
 * escritorio vale 0 y esta barra queda pegada al borde de la ventana; en
 * teléfono vale la altura completa de la barra de pestañas (safe-area
 * incluida), así que esta barra queda apoyada arriba de esa barra en vez de
 * escondida detrás de ella.
 */
export function ActionBar({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // `entry.contentRect` mide solo el contenido -sin el padding ni el
    // borde de la propia barra-, así que el espaciador reservaba de
    // menos exactamente por esa diferencia y la última fila de tarjetas
    // quedaba tapada -pasó de verdad, con Katakana: 43px reservados
    // contra 73px reales-. `offsetHeight` sí incluye padding y borde.
    const observer = new ResizeObserver(() => setHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div id="action-bar-spacer" style={{ height }} aria-hidden />
      <Paper
        ref={ref}
        id="action-bar"
        withBorder
        radius={0}
        pos="fixed"
        style={{
          bottom: 'var(--knd-bottom-offset)',
          left: 0,
          right: 0,
          // El inset horizontal tiene que ser el MISMO que ya usa el
          // contenido de arriba -las tarjetas de grupo no tienen padding
          // propio, su margen con el borde es puramente el `padding="md"`
          // de `MantineShell.Main`- para que la barra quede alineada con
          // ellas. Sumarle además el 16px del diseño (como se hizo al
          // principio) duplicaba el margen: quedaba casi el doble del que
          // tienen las tarjetas -pasó de verdad, medido: 35.8px vs 17.9px-.
          // El vertical (12px, el del diseño) no tiene ese problema porque
          // no hay ningún padding vertical de AppShell con el que chocar.
          padding: '0.75rem var(--mantine-spacing-md)',
          borderLeft: 0,
          borderRight: 0,
          borderBottom: 0,
          zIndex: 100,
        }}
      >
        <Group gap="md">{children}</Group>
      </Paper>
    </>
  );
}
