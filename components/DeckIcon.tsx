/**
 * Un mazo: dos cartas enteras, una atrás de otra, con el あ en la de adelante.
 *
 * Es el único ícono que la app dibuja a mano, y por un motivo concreto: no
 * existe en ninguna librería. Todos los demás -el chevron de volver, el lápiz
 * de renombrar, la lupa del buscador- son de Lucide, vía `Icon`. Éste es el
 * que define la familia: trazo 1.6 sobre grilla de 24, y `Icon` le pone ese
 * mismo 1.6 al resto para que se vean parejos.
 *
 * Reemplazó al glifo `▤`, que es un carácter de dibujo técnico y se leía como
 * una tabla o un menú. Un glifo además queda a merced de la fuente que tenga
 * el dispositivo -para las cartas la de emoji suele ganar-, mientras que un
 * trazo propio se ve igual en todos lados y toma el color de su contenedor con
 * `currentColor`.
 *
 * El あ sí es texto, con la misma Zen Kaku Gothic New del resto del kana:
 * dibujarlo en trazos a 22px no le haría justicia.
 *
 * Las coordenadas están calzadas contra la convención de Lucide, que es de
 * dónde salen los demás íconos: el dibujo ocupa 21,55 de las 24 unidades del
 * `viewBox` (el 90%) y va CENTRADO. El dibujo original ocupaba 20,33 y
 * además estaba 0,87 unidades alto, así que al lado de uno de la librería
 * -en la barra de pestañas, contra el de Estadísticas- se veía más chico y
 * pegado al borde de arriba. Medido con `getBBox()` más medio trazo de cada
 * lado; si se toca alguna de estas cifras, hay que volver a medirlo.
 */
export function DeckIcon({ rem = 1.35 }: { rem?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      aria-hidden
      style={{ display: 'block', width: `${rem}rem`, height: `${rem}rem`, flex: 'none' }}
    >
      {/* Las dos cartas son rectángulos ENTEROS, uno encima del otro. La de
          adelante se rellena con el fondo de su contenedor y por eso tapa a la
          de atrás: es lo que hace que se lean como dos cartas apiladas y no
          como un dibujo de alambre con los trazos cruzados.

          El relleno sale de `--knd-icon-bg`, no del token directo, para que
          quien lo use pueda cambiarlo sin tocar este archivo: la fila de la
          lista de mazos lo hace en su `:hover`, donde el fondo pasa a
          `dark-5`. Sin eso, ahí se vería un hueco del color de reposo.

          Va por `style` y no por el atributo `fill`, porque un atributo de
          presentación de SVG no resuelve `var()`. */}
      <rect x="8.01" y="3.34" width="12.25" height="15.98" rx="2.13" transform="rotate(15 14.13 11.33)" />
      <rect
        x="1.88" y="5.47" width="13.31" height="16.51" rx="2.13"
        style={{ fill: 'var(--knd-icon-bg, var(--mantine-color-dark-6))' }}
      />
      <text
        x="8.54" y="17.4" textAnchor="middle" fontSize="11.2"
        fill="currentColor" stroke="none" className="kana"
      >
        あ
      </text>
    </svg>
  );
}
