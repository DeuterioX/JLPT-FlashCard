import type { Icon as BootstrapIcon, IconProps } from 'react-bootstrap-icons';
import styles from './Icon.module.css';

/**
 * Un ícono de Bootstrap Icons.
 *
 * La librería los dibuja con `fill="currentColor"` sobre una grilla de 16 -no
 * con trazo sobre una de 24, como otras-, así que acá no hay grosor de línea
 * que igualar: lo que sale de la caja ya viene con el peso del set. Lo único
 * que hay que ponerles es el tamaño, y el porqué está en `Icon.module.css`.
 *
 * El tamaño no es un prop: es uno solo en toda la app. Hubo un segundo de 15px
 * en la flecha de volver, heredado del SVG de trazo que había antes ahí; ese
 * dibujo ya no existe, así que el píxel de más estaba calibrado contra algo que
 * no está. Si alguna vez hace falta otro tamaño, es una decisión de diseño y
 * entra por la hoja de estilos.
 */
export function Icon({
  glyph: Glyph, className, ...rest
}: { glyph: BootstrapIcon } & Omit<IconProps, 'size'>) {
  return (
    <Glyph
      aria-hidden
      {...rest}
      className={className ? `${styles.icon} ${className}` : styles.icon}
    />
  );
}
