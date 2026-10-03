import type { Icon as BootstrapIcon, IconProps } from 'react-bootstrap-icons';
import styles from './Icon.module.css';

/**
 * Un ícono de Bootstrap Icons con el tamaño en `rem`.
 *
 * La librería los dibuja con `fill="currentColor"` sobre una grilla de 16 -no
 * con trazo sobre una de 24, como otras-, así que acá no hay grosor de línea
 * que igualar: lo que sale de la caja ya viene con el peso del set. Lo único
 * que hay que ponerles es el tamaño, y el porqué de cómo se pone está en
 * `Icon.module.css`, al lado de las reglas.
 */
export function Icon({
  glyph: Glyph, rem = 1, className, style, ...rest
}: {
  glyph: BootstrapIcon;
  /** Alto y ancho en `rem`. 1 = 16px a escala 100%. */
  rem?: number;
} & IconProps) {
  return (
    <Glyph
      aria-hidden
      {...rest}
      className={className ? `${styles.icon} ${className}` : styles.icon}
      // Lo único que no puede vivir en la hoja: el tamaño lo decide quien lo
      // usa. Va como variable para que la regla se quede con las dos medidas.
      style={{ '--knd-icon-size': `${rem}rem`, ...style } as React.CSSProperties}
    />
  );
}
