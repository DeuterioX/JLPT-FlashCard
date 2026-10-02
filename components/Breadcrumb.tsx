import { Group, Text, Anchor } from '@mantine/core';
import Link from 'next/link';
import styles from './Breadcrumb.module.css';

export type Crumb = { label: string; href: string };

/**
 * Las migas de navegación, en un solo lugar.
 *
 * Estaban copiadas en las tres pantallas de la sección Mazos, y se
 * desincronizaron dos veces: la barra separadora iba DENTRO del texto del
 * enlace en una pantalla y como elemento aparte en otra -así que el hueco no
 * medía lo mismo-, y la fila medía lo que medía su contenido, que cambia de
 * pantalla en pantalla según qué botones lleva. Las dos cosas se reportaron
 * como bugs. Con un componente no pueden volver a pasar.
 *
 * `trail` son los niveles de arriba, que son enlaces; `current` es dónde se
 * está parado y no lo es -un enlace a la página actual no lleva a ningún lado
 * y sólo agrega un blanco más al tabulador-. `children` son los controles que
 * cada pantalla cuelga de su cabecera (Renombrar, el punto de "incluido").
 */
export function Breadcrumb({
  id, trail = [], current, currentId, children,
}: {
  id?: string;
  trail?: Crumb[];
  current: string;
  currentId?: string;
  children?: React.ReactNode;
}) {
  // En el primer nivel la miga sería una sola palabra que repite lo que ya
  // dice la pestaña activa de arriba, así que el diseño no la dibuja: Mazos
  // arranca directo en el encabezado de sección. Recién aparece cuando hay a
  // dónde volver, o cuando la pantalla cuelga un control de su cabecera.
  if (trail.length === 0 && !children) return null;

  return (
    <Group id={id} className={styles.crumbRow}>
      {trail.map((c) => (
        // La barra va como elemento APARTE y no dentro del texto del enlace:
        // adentro queda con un espacio de texto de un lado y el `gap` del otro,
        // y deja de medir lo mismo en todas las pantallas.
        <Group key={c.href} className={styles.crumbStep}>
          <Anchor className={styles.crumb} component={Link} href={c.href} size="sm" underline="hover">
            {c.label}
          </Anchor>
          <Text className={styles.crumbSep} size="sm">/</Text>
        </Group>
      ))}
      <Text id={currentId} className={styles.crumbCurrent} size="sm">{current}</Text>
      {children}
    </Group>
  );
}
