'use client';

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import styles from './GenkoSheet.module.css';

/**
 * La sheet de 原稿用紙: una celda por carácter, con la cruz de guía adentro.
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
  const sheet = useRef<HTMLDivElement>(null);
  const padding = useRowPadding(sheet, chars.length);
  return (
    <div
      ref={sheet}
      id={id}
      data-testid={testId}
      className="knd-genko"
      style={{ '--knd-genko-n': chars.length } as React.CSSProperties}
    >
      {chars.map((ch, i) => (
        // El índice como clave es correcto acá: la lista no se reordena ni se
        // filtra, es el texto partido en orden, y dos celdas con el mismo
        // carácter -las dos い de いいえ- no son intercambiables.
        <span key={i} className={styles.genkoCell}>
          <Guides />
          {ch !== ' ' && (
            <span className={`${styles.genkoGlyph} mincho`} style={tone ? { color: tone } : undefined}>
              {ch}
            </span>
          )}
        </span>
      ))}
      {/* Las celdas que completan el último renglón. En el papel impreso están
          TODAS dibujadas, se llenen o no, y sin esto el tramo sobrante de la
          última fila se veía como un bloque gris: el fondo del contenedor, que
          es el color de la línea, asomando donde no hay celdas. */}
      {Array.from({ length: padding }, (_, i) => (
        <span key={`hueco-${i}`} className={styles.genkoCell} aria-hidden>
          <Guides />
        </span>
      ))}
    </div>
  );
}

/**
 * Cuántas celdas faltan para completar el último renglón.
 *
 * Cuántas entran por fila lo decide el CSS -`auto-fit` con una pista de tamaño
 * fijo-, así que desde acá no se puede calcular: hay que preguntárselo al
 * layout ya resuelto. Se lee la lista de pistas que quedó en
 * `grid-template-columns`, que tiene una entrada por columna, y se mide de
 * nuevo cada vez que la sheet cambia de tamaño -girar el teléfono, abrir el
 * teclado, entrar una carta más larga-.
 *
 * Se mide en un `useLayoutEffect`, antes de que el navegador pinte, y la
 * medición se guarda junto con el largo del texto para el que se hizo. Las dos
 * cosas hacen falta: con un `useEffect` el primer cuadro de cada carta se
 * pintaba con las columnas de la carta ANTERIOR. Medido pasando de さかな (3
 * columnas) a けんきゅうしゃ: ese cuadro calculaba 2 celdas de relleno que no
 * iban, la hoja envolvía a un segundo renglón vacío y pasaba de 255 a 509px de
 * alto antes de acomodarse -el «pantallazo» de la carta más grande al pasar de
 * palabra-. Descartar una medición de otro largo garantiza que, si alguna vez
 * se pinta antes de medir, falta relleno -una fila corta- en vez de sobrar.
 *
 * Arranca en 0 y se completa después de montar, a propósito: el servidor no
 * tiene layout, así que cualquier número que inventara acá sería distinto del
 * que calcula el cliente y rompería la hidratación. Las celdas de relleno no
 * llevan contenido, así que aparecer un cuadro después no mueve nada.
 */
function useRowPadding(ref: React.RefObject<HTMLDivElement | null>, n: number) {
  const [measured, setMeasured] = useState({ n: 0, cols: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const tracks = getComputedStyle(el).gridTemplateColumns;
      const cols = tracks === 'none' ? 0 : tracks.split(' ').filter(Boolean).length;
      setMeasured((m) => (m.n === n && m.cols === cols ? m : { n, cols }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, n]);
  const { cols } = measured;
  if (measured.n !== n || cols <= 0 || n <= cols) return 0;
  const leftover = n % cols;
  return leftover === 0 ? 0 : cols - leftover;
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
function Guides(): ReactNode {
  return (
    <svg
      className={styles.genkoCross}
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
