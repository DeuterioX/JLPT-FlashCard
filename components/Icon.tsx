import type { Icon as BootstrapIcon, IconProps } from 'react-bootstrap-icons';

/**
 * Un ícono de Bootstrap Icons con el tamaño en `rem`.
 *
 * La librería los dibuja con `fill="currentColor"` sobre una grilla de 16 -no
 * con trazo sobre una de 24, como otras-, así que acá no hay grosor de línea
 * que igualar: lo que sale de la caja ya viene con el peso del set. Lo único
 * que hay que ponerles es el tamaño, y va en `rem`, no en su prop `size`.
 *
 * El motivo: la app escala subiendo el `font-size` de la raíz por media query
 * (ver el tope de `globals.css`), de 16px a 32 entre 1280 y 3200. `size` se
 * escribe en los atributos `width`/`height` del SVG, que son píxeles, así que
 * un ícono así se queda clavado mientras el texto de al lado crece -medido:
 * en 3200 la etiqueta del buscador llegaba a 28px y la lupa seguía en 18-. El
 * `style` le gana a esos atributos.
 *
 * `display: block` y no el `inline` por defecto del SVG: en línea, la caja de
 * texto que lo contiene le suma el descendente de la fuente y crece -medido
 * en la barra de pestañas, 25,2px en vez de 21,6-, así que la etiqueta de
 * abajo quedaba más abajo que las de sus vecinas.
 */
export function Icon({
  glyph: Glyph, rem = 1, style, ...rest
}: {
  glyph: BootstrapIcon;
  /** Alto y ancho en `rem`. 1 = 16px a escala 100%. */
  rem?: number;
} & IconProps) {
  return (
    <Glyph
      aria-hidden
      {...rest}
      style={{ display: 'block', width: `${rem}rem`, height: `${rem}rem`, flex: 'none', ...style }}
    />
  );
}
