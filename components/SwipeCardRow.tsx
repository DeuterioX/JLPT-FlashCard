'use client';

import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';

/**
 * Fila de carta con acciones por gesto, sólo en teléfono.
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
 * abre el toque, así que quien no lo descubre igual puede mover y borrar.
 */
const EDGE_GUTTER = 30;
const OPEN_RATIO = 0.4;

export function SwipeCardRow({
  children, onTap, onMove, onDelete, canMove, label,
}: {
  children: ReactNode;
  onTap: () => void;
  onMove: () => void;
  onDelete: () => void;
  canMove: boolean;
  label: string;
}) {
  const frontRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const state = useRef({ x0: 0, y0: 0, dx: 0, dragging: false, decided: false, base: 0, fromEdge: false });

  function width() {
    return rightRef.current?.offsetWidth ?? 96;
  }

  function setX(px: number, animate: boolean) {
    const el = frontRef.current;
    if (!el) return;
    el.style.transition = animate ? 'transform .18s ease' : 'none';
    el.style.transform = `translateX(${px}px)`;
  }

  function close() {
    state.current.base = 0;
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
    // Sin otros grupos a los que mover, el tope superior es 0: el gesto
    // hacia la derecha no descubre nada.
    const max = width();
    s.dx = Math.max(-max, Math.min(canMove ? max : 0, s.base + mx));
    setX(s.dx, false);
  }

  function end() {
    const s = state.current;
    if (!s.dragging) return;
    s.dragging = false;
    if (!s.decided) {
      // Fue un toque, no un arrastre.
      if (s.base !== 0) close();
      else onTap();
      return;
    }
    const max = width();
    const openRight = canMove && s.dx > max * OPEN_RATIO;
    const openLeft = s.dx < -max * OPEN_RATIO;
    s.base = openRight ? max : (openLeft ? -max : 0);
    setX(s.base, true);
  }

  return (
    <div className="knd-swipe-row">
      {canMove && (
        <div className="knd-swipe-side knd-swipe-move">
          <button
            type="button"
            aria-label={`Mover ${label}`}
            onClick={() => { close(); onMove(); }}
          >
            Mover
          </button>
        </div>
      )}
      <div className="knd-swipe-side knd-swipe-del" ref={rightRef}>
        <button
          type="button"
          aria-label={`Borrar ${label}`}
          onClick={() => { close(); onDelete(); }}
        >
          Borrar
        </button>
      </div>
      <div
        ref={frontRef}
        className="knd-swipe-front"
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
