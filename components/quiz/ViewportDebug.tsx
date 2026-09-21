'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Diagnóstico en vivo del scroll y la geometría del viewport, SOLO para el
 * dispositivo real (`/quiz?debug=vv`, nunca en uso normal).
 *
 * Apunta a una pregunta concreta: con el teclado abierto sigue apareciendo
 * una barra de scroll, y desde acá no se puede reproducir -ni el emulador ni
 * la emulación táctil de Playwright tienen el viewport visual de Safari, y
 * midiendo en headless no queda NADA scrolleable-. Así que en vez de seguir
 * suponiendo qué se mueve, esto reporta: cuánto se puede scrollear de verdad
 * (`scrollHeight` contra el viewport), y qué elemento recibe los eventos de
 * scroll cuando el usuario hace el gesto -capturados en fase de captura, así
 * aparecen vengan del documento o de cualquier elemento interno-.
 */
function label(el: EventTarget | null): string {
  if (el === document || el === window) return 'document';
  const e = el as HTMLElement;
  if (!e?.tagName) return '?';
  if (e.id) return `#${e.id}`;
  const cls = e.className?.toString?.().split(' ').find((c) => c.startsWith('knd'));
  return cls ? `.${cls}` : e.tagName.toLowerCase();
}

export function ViewportDebug() {
  const [text, setText] = useState('');
  const events = useRef<string[]>([]);
  const lastKey = useRef('');
  const changes = useRef<string[]>([]);

  useEffect(() => {
    const onAnyScroll = (e: Event) => {
      const t = e.target;
      const top = t === document || t === window
        ? Math.round(window.scrollY)
        : Math.round((t as HTMLElement).scrollTop ?? -1);
      const line = `${label(t)} top=${top}`;
      if (events.current[0] !== line) events.current = [line, ...events.current].slice(0, 5);
    };
    document.addEventListener('scroll', onAnyScroll, true);
    window.addEventListener('scroll', onAnyScroll);

    let raf = 0;
    const tick = () => {
      const vv = window.visualViewport;
      const de = document.documentElement;
      const body = document.body;
      const scr = document.querySelector('#quiz-screen') as HTMLElement | null;
      const innerH = Math.round(window.innerHeight);
      const vvH = vv ? Math.round(vv.height) : -1;
      const vvTop = vv ? Math.round(vv.offsetTop) : -1;
      // Lo que importa: cuánto hay MÁS ALLÁ de lo visible, por cada candidato.
      const overDoc = de.scrollHeight - innerH;
      const overVisible = de.scrollHeight - vvH;
      const key = `${innerH}|${vvH}|${vvTop}|${Math.round(window.scrollY)}|${de.scrollHeight}|${body.scrollHeight}`;
      if (key !== lastKey.current) {
        lastKey.current = key;
        changes.current = [
          `${innerH}/${vvH}/${vvTop} sY=${Math.round(window.scrollY)} de=${de.scrollHeight} bd=${body.scrollHeight}`,
          ...changes.current,
        ].slice(0, 4);
      }
      setText([
        `inner ${innerH}  vv ${vvH}  vvTop ${vvTop}  sY ${Math.round(window.scrollY)}`,
        `deScroll ${de.scrollHeight} (h=${de.style.height || 'css'})  bdScroll ${body.scrollHeight}`,
        `screen ${scr ? Math.round(scr.getBoundingClientRect().height) : -1} @${scr ? Math.round(scr.getBoundingClientRect().top) : -1}`,
        `SOBRA vs inner ${overDoc}   vs visible ${overVisible}`,
        `deOv ${getComputedStyle(de).overflowY}/${getComputedStyle(de).position} bdOv ${getComputedStyle(body).overflowY}/${getComputedStyle(body).position}`,
        '--- scroll events ---',
        ...(events.current.length > 0 ? events.current : ['(ninguno)']),
        '--- cambios (inner/vv/vvTop sY de bd) ---',
        ...changes.current,
      ].join('\n'));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('scroll', onAnyScroll, true);
      window.removeEventListener('scroll', onAnyScroll);
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed', bottom: 0, left: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.9)', color: '#7CFF9B',
        font: '10px/1.35 ui-monospace, monospace', padding: '4px 6px',
        pointerEvents: 'none', whiteSpace: 'pre', maxWidth: '100vw',
      }}
    >
      {text}
    </div>
  );
}
