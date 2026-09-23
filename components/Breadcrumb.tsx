import { Group, Text, Anchor, rem } from '@mantine/core';
import Link from 'next/link';

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
  id, trail = [], current, currentClassName, currentId, children,
}: {
  id?: string;
  trail?: Crumb[];
  current: string;
  /** `kana` donde el nivel actual es una palabra japonesa. */
  currentClassName?: string;
  currentId?: string;
  children?: React.ReactNode;
}) {
  return (
    <Group id={id} className="knd-crumb-row" gap="0.5rem">
      {trail.map((c) => (
        // La barra va como elemento APARTE y no dentro del texto del enlace:
        // metida adentro queda con un espacio de texto de un lado y el `gap`
        // del Group del otro, y el separador deja de medir lo mismo en todas
        // las pantallas. Además un espacio literal pegado al cierre de un tag
        // puede colapsar a ancho cero (ver CLAUDE.md).
        <Group key={c.href} gap="0.5rem" wrap="nowrap">
          <Anchor className="knd-crumb" component={Link} href={c.href} size="sm" underline="hover">
            {c.label}
          </Anchor>
          <Text c="dark.3" size="sm">/</Text>
        </Group>
      ))}
      <Text id={currentId} className={currentClassName} fw={700} size={rem(15)} lh={1.4}>
        {current}
      </Text>
      {children}
    </Group>
  );
}
