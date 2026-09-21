'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Lectura en vivo de la geometría del viewport, SOLO para diagnosticar el
 * comportamiento del teclado en dispositivos reales (se activa con
 * `/quiz?debug=vv`, nunca en uso normal).
 *
 * Existe porque el bug del teclado en iOS no se puede reproducir ni medir
 * desde acá: ni el emulador de Android ni la emulación táctil de Playwright
 * tienen el paneo del viewport visual de Safari, así que toda hipótesis sobre
 * qué mueve la pantalla es indistinguible de otra sin ver los números del
 * dispositivo. Esto los muestra en pantalla para poder leerlos de una captura.
 *
 * Además del estado actual guarda un historial corto: el momento que importa
 * -cuando se abre el teclado- dura milisegundos, y si la pantalla se va de
 * cuadro el valor actual ya no se puede leer, pero el historial sí conserva
 * lo que pasó.
 */
type Snapshot = {
  t: number;
  innerH: number;
  vvH: number;
  vvTop: number;
  vvPageTop: number;
  scale: number;
  scrollY: number;
  docTop: number;
  screenTop: number;
  screenH: number;
  dvh: number;
};

function read(probe: HTMLElement | null): Snapshot {
  const vv = window.visualViewport;
  const screen = document.querySelector('#quiz-screen');
  const rect = screen?.getBoundingClientRect();
  return {
    t: Date.now(),
    innerH: Math.round(window.innerHeight),
    vvH: vv ? Math.round(vv.height) : -1,
    vvTop: vv ? Math.round(vv.offsetTop) : -1,
    vvPageTop: vv ? Math.round(vv.pageTop) : -1,
    scale: vv ? Math.round(vv.scale * 100) / 100 : -1,
    scrollY: Math.round(window.scrollY),
    docTop: Math.round(document.documentElement.scrollTop),
    screenTop: rect ? Math.round(rect.top) : -1,
    screenH: rect ? Math.round(rect.height) : -1,
    dvh: probe ? Math.round(probe.getBoundingClientRect().height) : -1,
  };
}

export function ViewportDebug() {
  const [now, setNow] = useState<Snapshot | null>(null);
  const [log, setLog] = useState<Snapshot[]>([]);
  const probeRef = useRef<HTMLDivElement>(null);
  const lastKey = useRef('');

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const s = read(probeRef.current);
      setNow(s);
      // Solo entra al historial lo que cambia: así las ~8 líneas visibles
      // cubren toda la transición del teclado en vez de repetir el reposo.
      const key = `${s.innerH}|${s.vvH}|${s.vvTop}|${s.scrollY}|${s.screenTop}|${s.dvh}`;
      if (key !== lastKey.current) {
        lastKey.current = key;
        setLog((prev) => [s, ...prev].slice(0, 8));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const t0 = log.length > 0 ? log[log.length - 1].t : 0;

  return (
    <>
      <div ref={probeRef} style={{ position: 'absolute', height: '100dvh', width: 0, pointerEvents: 'none' }} />
      <div
        style={{
          position: 'fixed', top: 0, left: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.88)', color: '#7CFF9B',
          font: '10px/1.35 ui-monospace, monospace', padding: '4px 6px',
          pointerEvents: 'none', whiteSpace: 'pre', maxWidth: '100vw',
        }}
      >
        {now && [
          `inner ${now.innerH}  dvh ${now.dvh}  scale ${now.scale}`,
          `vv    h ${now.vvH}  top ${now.vvTop}  pageTop ${now.vvPageTop}`,
          `scroll y ${now.scrollY}  docTop ${now.docTop}`,
          `screen top ${now.screenTop}  h ${now.screenH}`,
          '--- cambios (ms, inner/vvH/vvTop/scrollY/scrTop/dvh) ---',
          ...log.map((s) => `+${String(s.t - t0).padStart(5)} ${s.innerH}/${s.vvH}/${s.vvTop}/${s.scrollY}/${s.screenTop}/${s.dvh}`),
        ].join('\n')}
      </div>
    </>
  );
}
