'use client';

import {
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';

/**
 * Fila con acciones por gesto, sólo en teléfono. La usan las tres listas:
 * mazos, grupos y cartas.
 *
 * Las acciones NO están clavadas en el componente. Cada lista trae las suyas
 * y el componente sólo decide de qué lado va cada una: el borde DERECHO es
 * siempre Borrar y el IZQUIERDO la acción no destructiva de esa fila -Mover
 * una carta, Practicar un mazo-. O sea que el color no dice qué acción es
 * -eso lo dice la palabra del panel cuando se abre-, dice si te podés
 * arrepentir. Es la convención de iOS y es la única que sobrevive a que cada
 * lista tenga verbos distintos.
 *
 * Reglas que hacen que el gesto no moleste, todas verificadas en la maqueta:
 *
 * - **Se cancela si el movimiento resulta vertical.** Sin eso el swipe pelea
 *   con el scroll de la lista, que es el bug clásico de este patrón. El
 *   `touch-action: pan-y` del CSS le deja el eje vertical al navegador y
 *   este chequeo abandona el gesto apenas se ve que el dedo va para abajo.
 * - **Zona muerta de 30px en el borde izquierdo.** Ahí Safari/iOS usa el
 *   arrastre hacia la derecha para volver atrás, y eso no se puede prevenir
 *   con `preventDefault` ni con `touch-action` porque lo maneja el navegador
 *   antes que la página. Los gestos que nacen ahí se descartan.
 * - **Sólo una fila abierta a la vez**, y hay que pasar el 40% del recorrido
 *   para que quede abierta; si no, vuelve sola.
 * - **En escritorio no hace nada**: se chequea el ancho en el `pointerdown`
 *   en vez de guardarlo en estado, así el render del servidor y el del
 *   cliente son idénticos (mismo criterio que el resto de la app, que evita
 *   `useMediaQuery` por la desincronización de hidratación).
 *
 * El gesto ACELERA, no habilita: las mismas acciones están en el modal que
 * abre el toque, así que quien no lo descubre igual puede usarlas.
 */
const EDGE_GUTTER = 30;
const OPEN_RATIO = 0.4;

export type SwipeAction = {
  /** La palabra del panel. Es lo que dice qué hace ese lado. */
  etiqueta: string;
  onAction: () => void;
};

export function SwipeRow({
  children, onTap, tappable, label, leading, trailing,
}: {
  children: ReactNode;
  onTap: () => void;
  /** Una fila que no lleva a ningún lado -un mazo incluido es un visor-. */
  tappable: boolean;
  /** Para el `aria-label` de cada panel: «Borrar けんきゅうしゃ». */
  label: string;
  /**
   * La acción no destructiva, a la izquierda y en jade. Ausente cuando no
   * aplica: sin otros grupos no hay dónde mover una carta, y la lista de
   * grupos no tiene ninguna -un grupo se renombra desde adentro-.
   */
  leading?: SwipeAction;
  /**
   * Borrar, a la derecha y en shu. Ausente en un mazo incluido: sin esto el
   * panel se dibujaba igual y el gesto descubría un botón que borraba de
   * verdad, en la pantalla que es un visor.
   */
  trailing?: SwipeAction;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const state = useRef({ x0: 0, y0: 0, dx: 0, dragging: false, decided: false, base: 0, fromEdge: false });

  function width() {
    // El panel que haya: sin panel derecho el ancho lo da el izquierdo. El 96
    // de reserva es el `6rem` del CSS a tamaño de raíz normal, y sólo se usa
    // si no hay ninguno de los dos, que es cuando tampoco hay gesto.
    return rightRef.current?.offsetWidth ?? leftRef.current?.offsetWidth ?? 96;
  }

  function setX(px: number, animate: boolean) {
    const el = frontRef.current;
    if (!el) return;
    el.style.transition = animate ? 'transform .18s ease' : 'none';
    el.style.transform = `translateX(${px}px)`;
  }

  /**
   * Qué lado está descubierto, como atributo en el contenedor.
   *
   * No es decoración: el panel descubierto se pone POR ENCIMA de la cara que
   * se desliza mientras está abierto, y eso arregla un toque que se perdía.
   * La cara tarda 180ms en llegar a su lugar, y el navegador hace la prueba
   * de impacto contra la posición ANIMADA: un toque sobre el botón apenas
   * soltabas el dedo caía en la cara, que todavía lo estaba tapando, y no
   * pasaba nada; esperando un momento sí funcionaba. Con el panel arriba el
   * botón recibe el toque desde el primer cuadro.
   *
   * Sólo mientras está abierto, porque el panel mide 6rem pegadas al borde: si
   * quedara arriba siempre se comería los toques de esa franja de la fila
   * cerrada -que es justo donde está el nombre del mazo o del grupo-.
   */
  function marcarAbierto(lado: 'lead' | 'trail' | null) {
    const el = rootRef.current;
    if (!el) return;
    if (lado) el.dataset.open = lado;
    else delete el.dataset.open;
  }

  /**
   * Qué lado se está descubriendo, desde el primer píxel del arrastre.
   *
   * Los dos paneles viven siempre en el DOM, uno pegado a cada borde, y hasta
   * ahora los dos estaban visibles: al arrastrar se veían Renombrar Y Borrar a
   * la vez, uno de cada lado, y el gesto dejaba de decir qué iba a pasar. El
   * panel del lado contrario no tiene por qué estar: nunca vas a llegar a él
   * sin soltar y arrastrar para el otro lado.
   *
   * Se marca en cuanto el gesto se decide -no al soltar-, así el panel que no
   * corresponde desaparece antes de asomar.
   */
  function marcarDireccion(lado: 'lead' | 'trail' | null) {
    const el = rootRef.current;
    if (!el) return;
    if (lado) el.dataset.dir = lado;
    else delete el.dataset.dir;
  }

  function close() {
    state.current.base = 0;
    marcarAbierto(null);
    marcarDireccion(null);
    setX(0, true);
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!window.matchMedia('(max-width: 640px)').matches) return;
    const el = frontRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const s = state.current;
    s.x0 = e.clientX;
    s.y0 = e.clientY;
    s.dx = s.base;
    s.decided = false;
    s.dragging = true;
    s.fromEdge = e.clientX - r.left < EDGE_GUTTER;
    el.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const s = state.current;
    if (!s.dragging) return;
    const mx = e.clientX - s.x0;
    const my = e.clientY - s.y0;
    if (!s.decided) {
      if (Math.abs(mx) < 6 && Math.abs(my) < 6) return;
      if (Math.abs(my) > Math.abs(mx)) { s.dragging = false; return; }
      // Hacia la derecha desde el borde: se lo deja al gesto del navegador.
      if (mx > 0 && s.fromEdge) { s.dragging = false; return; }
      s.decided = true;
    }
    // El tope de cada lado es 0 si de ese lado no hay nada: la fila no se
    // mueve para descubrir un panel que no existe.
    const max = width();
    s.dx = Math.max(trailing ? -max : 0, Math.min(leading ? max : 0, s.base + mx));
    // Arrastrar hacia la DERECHA descubre el panel de la izquierda, y al revés.
    marcarDireccion(s.dx > 0 ? 'lead' : (s.dx < 0 ? 'trail' : null));
    setX(s.dx, false);
  }

  function end() {
    const s = state.current;
    if (!s.dragging) return;
    s.dragging = false;
    // El toque lo resuelve `onClick`, no esto: así el mismo camino sirve para
    // el dedo y para el mouse, en vez de tener el gesto en teléfono y nada en
    // escritorio.
    if (!s.decided) return;
    const max = width();
    const openRight = !!leading && s.dx > max * OPEN_RATIO;
    const openLeft = !!trailing && s.dx < -max * OPEN_RATIO;
    s.base = openRight ? max : (openLeft ? -max : 0);
    marcarAbierto(openRight ? 'lead' : (openLeft ? 'trail' : null));
    // Si no quedó abierta, la fila vuelve sola y con ella el panel se va: la
    // marca de dirección se levanta recién cuando terminó de volver, así no se
    // ve el panel desaparecer antes que la cara lo tape.
    if (s.base === 0) window.setTimeout(() => marcarDireccion(null), 190);
    setX(s.base, true);
  }

  function onClick(e: ReactMouseEvent<HTMLDivElement>) {
    // Un click sobre un control real es de ese control, no de la fila.
    if ((e.target as HTMLElement).closest('button, a, input')) return;
    const s = state.current;
    // Venía de un arrastre: el navegador dispara el click igual, y ese no es
    // un toque.
    if (s.decided) { s.decided = false; return; }
    if (s.base !== 0) { close(); return; }
    if (tappable) onTap();
  }

  return (
    <div className="knd-swipe-row" ref={rootRef}>
      {leading && (
        <div className="knd-swipe-side knd-swipe-lead" ref={leftRef}>
          <button
            type="button"
            aria-label={`${leading.etiqueta} ${label}`}
            onClick={() => { close(); leading.onAction(); }}
          >
            {leading.etiqueta}
          </button>
        </div>
      )}
      {trailing && (
        <div className="knd-swipe-side knd-swipe-trail" ref={rightRef}>
          <button
            type="button"
            aria-label={`${trailing.etiqueta} ${label}`}
            onClick={() => { close(); trailing.onAction(); }}
          >
            {trailing.etiqueta}
          </button>
        </div>
      )}
      <div
        ref={frontRef}
        className={[
          'knd-swipe-front',
          tappable ? 'knd-row-tap' : '',
          // Un filete por borde, del color de lo que ese gesto descubre, y
          // sólo si la acción existe. Sin esto las acciones son invisibles
          // hasta hacer el gesto: nada dice que están ahí ni para qué lado va
          // cada una. Van en la cara que se desliza, no en el contenedor, así
          // se corren con la fila en vez de quedar flotando encima del panel
          // que se acaba de descubrir.
          leading ? 'knd-swipe-edge-lead' : '',
          trailing ? 'knd-swipe-edge-trail' : '',
        ].filter(Boolean).join(' ')}
        onClick={onClick}
        // El arrastre NATIVO del navegador le gana al gesto. Con un enlace
        // adentro de la fila -el nombre del grupo, el del mazo-, arrastrar
        // dispara un `dragstart`, y eso manda un `pointercancel` que suelta
        // la captura: la fila se corría los primeros 12px y se quedaba
        // clavada ahí. Medido con un log de eventos en la lista de grupos:
        // pointerdown, un pointermove, dragstart, pointercancel,
        // lostpointercapture. En mazos no saltaba según de dónde agarraras,
        // pero estaba igual de latente, así que se apaga acá y no en cada
        // lista.
        onDragStart={(e) => e.preventDefault()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={end}
        onPointerCancel={end}
      >
        {children}
      </div>
    </div>
  );
}
