import type { LucideIcon, LucideProps } from 'lucide-react';

/**
 * Un ícono de Lucide con las dos cosas que esta app necesita y que el default
 * de la librería no da.
 *
 * 1. El tamaño en `rem`. La app escala subiendo el `font-size` de la raíz por
 *    media query (ver el tope de `globals.css`): de 16px a 32 entre 1280 y
 *    3200. Lucide toma su `size` como píxeles y lo escribe en los atributos
 *    `width`/`height` del SVG, así que un ícono así se queda clavado mientras
 *    el texto de al lado crece -medido: en 3200 la etiqueta del buscador
 *    llegaba a 28px y la lupa seguía en 18-. Por eso el tamaño va en `style`,
 *    que le gana a esos atributos.
 * 2. El trazo en 1.6, que es el de `DeckIcon`. Lucide dibuja en 2 por
 *    defecto, y `DeckIcon` -el único que seguimos dibujando a mano, porque no
 *    existe en ninguna librería- es el que manda: los demás tienen que verse
 *    parejos contra él, no al revés.
 */
export function Icon({
  glyph: Glyph, rem = 1, style, ...rest
}: {
  glyph: LucideIcon;
  /** Alto y ancho en `rem`. 1 = 16px a escala 100%. */
  rem?: number;
} & LucideProps) {
  return (
    <Glyph
      aria-hidden
      strokeWidth={1.6}
      {...rest}
      /* `display: block` y no el `inline` por defecto del SVG: en línea, la
         caja de texto que lo contiene le suma el descendente de la fuente y
         crece -medido en la barra de pestañas, 25,2px en vez de 21,6-, así que
         la etiqueta de abajo quedaba 3,6px más abajo que las vecinas. Es el
         mismo `block` que ya tenía `DeckIcon`. */
      style={{ display: 'block', width: `${rem}rem`, height: `${rem}rem`, flex: 'none', ...style }}
    />
  );
}
