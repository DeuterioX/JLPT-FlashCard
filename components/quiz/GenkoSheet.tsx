import type { ReactNode } from 'react';

/**
 * La hoja de 原稿用紙: una celda por carácter, con la cruz de guía adentro.
 *
 * El papel de manuscrito japonés es una grilla donde cada carácter ocupa su
 * propio cuadro, y la cruz tenue de adentro sirve para centrar ESE trazo. Una
 * celda sola funciona con あ y se rompe con けんきゅうしゃ: la palabra se parte
 * encima de las guías y las guías dejan de querer decir algo.
 *
 * El espacio ocupa su propia celda, vacía, como en el papel impreso: es lo
 * que deja ver dónde termina cada palabra de una frase.
 *
 * **Las líneas no son bordes.** El contenedor se pinta del color de la línea
 * y las celdas se separan con `gap: 1px`, así que cada línea mide exactamente
 * un píxel y las dos direcciones salen idénticas por construcción. Con
 * bordes por celda hay que ir sacando el de arriba y el de la izquierda para
 * no dibujarlos dos veces, y eso cambia el tamaño de la caja de relleno según
 * qué bordes le queden -probado en la maqueta: con `box-sizing: border-box`
 * la cruz caía en medio píxel en un eje y en píxel entero en el otro, y una
 * de las dos guías se veía siempre más gruesa-.
 *
 * El tamaño de la celda y cuántas entran por fila los decide el CSS, no JS:
 * `auto-fit` con una pista de tamaño fijo coloca las que entran y envuelve
 * sola, que es lo que hace el papel de verdad cuando la frase no entra en un
 * renglón.
 */
export function GenkoSheet({
  text, id, testId, tone,
}: {
  text: string;
  id?: string;
  testId?: string;
  /** El color de la tinta. Shu mientras dura el aviso de error. */
  tone?: string;
}) {
  // `[...text]` y no `text.split('')`: きゃ son dos unidades de código pero
  // hay kana fuera del plano básico, y partir por code unit los rompería.
  const chars = [...text];
  return (
    <div
      id={id}
      data-testid={testId}
      className="knd-genko"
      style={{ '--knd-genko-n': chars.length } as React.CSSProperties}
    >
      {chars.map((ch, i) => (
        // El índice como clave es correcto acá: la lista no se reordena ni se
        // filtra, es el texto partido en orden, y dos celdas con el mismo
        // carácter -las dos い de いいえ- no son intercambiables.
        <span key={i} className="knd-genko-celda">
          <Cruz />
          {ch !== ' ' && (
            <span className="knd-genko-glifo mincho" style={tone ? { color: tone } : undefined}>
              {ch}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

/**
 * La cruz de guía, en SVG y no en dos divs de 1px.
 *
 * Un borde o un fondo de un píxel lo ENCAJA el compositor en píxeles enteros
 * del dispositivo. Con la página al 150% o al 175% -o con el zoom de
 * cualquier visor- las verticales comparten una fase y las horizontales otra,
 * así que un eje redondea para arriba y el otro para abajo y un eje entero se
 * ve más grueso que el otro. Un trazo de SVG no se encaja, se antialiasea.
 *
 * `preserveAspectRatio="none"` es seguro porque la celda es cuadrada: los dos
 * trazos escalan por el mismo factor.
 */
function Cruz(): ReactNode {
  return (
    <svg
      className="knd-genko-cruz"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      shapeRendering="geometricPrecision"
      aria-hidden
    >
      <line x1="50" y1="8" x2="50" y2="92" />
      <line x1="8" y1="50" x2="92" y2="50" />
    </svg>
  );
}
