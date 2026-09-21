'use client';

import {
  useEffect, useEffectEvent, useRef, useState, type FormEvent, type MouseEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { Stack, Group, Text, TextInput, Button, Progress, Paper, Box, Kbd, Center, Loader } from '@mantine/core';
import {
  startRound, submit, reveal, currentCard, isFinished, accuracy,
  type RoundState,
} from '@/lib/quiz/engine';
import { createRoundRecorder, type AttemptBody, type RoundRecorder } from '@/lib/quiz/recorder';
import {
  decideRoundStart, USED_ROUND_KEY, type RoundStart, type StoredRound,
} from '@/lib/quiz/stored-round';
import { RoundSummary, type MissEntry } from './RoundSummary';
import { APP_NAME } from '@/lib/app-meta';

export type Round = StoredRound;

const MEANING_MS = 1200;
const SESSION_ERROR_MSG = 'No se pudo guardar esta ronda. Tus respuestas no se están registrando.';

// `interactive-widget: resizes-content` (app/layout.tsx) le pide al navegador
// que redimensione el LAYOUT viewport cuando aparece el teclado -y en los
// navegadores que lo respetan alcanza con `100dvh`, sin JS-. Pero un video
// real (iPhone/Safari, con teclado SwiftKey) mostró que el bug seguía: el
// navegador paneó el VISUAL viewport hacia arriba para mantener el input a la vista,
// dejando el layout viewport (y por lo tanto `100dvh` y cualquier
// `position: fixed`, que se ancla al layout viewport) del mismo alto de
// siempre. Bloquear el scroll de `html`/`body` no toca ese paneo -no es un
// scroll del documento, es un desplazamiento de la "cámara" del visual
// viewport- así que el header y el kana, aunque siguen ahí, quedan arriba
// del área realmente visible. Solo la Visual Viewport API expone ese offset
// (`offsetTop`) y ese alto real (`height`); replicarlos acá con `height` +
// `transform: translateY()` en vez de un `100dvh` a secas hace que el propio
// contenedor siga al viewport visual en vez de al layout. En un browser que
// sí resuelve todo de forma nativa esto es un no-op (`offsetTop` es 0 y
// `height` coincide con el layout viewport), así que no compite con
// `interactive-widget`.
//
// Muta el DOM directo (`ref.current.style...`) en el propio handler en vez de
// pasar por estado de React: durante un gesto este evento dispara una vez por
// frame, y un `useState`/`useSyncExternalStore` ahí significa un ciclo de
// render completo de todo el quiz por frame, para terminar escribiendo dos
// propiedades de estilo en un solo nodo.
//
// Lo que esto NO arregla, aunque en su momento lo intenté por acá: el input
// desaparecía y volvía mientras el usuario arrastraba. Eso no era ni lag de
// React ni churn de capas de composición (las dos hipótesis que probé antes,
// las dos equivocadas), sino el PISO del layout -el alto mínimo que ocupaba
// el contenido de la pantalla-, que estaba en ~294px contra los ~302px que
// deja libres el teclado: cualquier fluctuación del visual viewport cruzaba
// ese umbral y el pie entero quedaba posicionado fuera del contenedor. La
// explicación completa y las medidas están en la nota de `.knd-quiz-footer`
// en globals.css; el piso se arregló allá y en el `minHeight: 0` del stage,
// más abajo en este archivo.
function applyVisualViewportInset(el: HTMLElement) {
  const vv = window.visualViewport;
  if (!vv) return;
  el.style.height = `${vv.height}px`;
  // `html`/`body` al alto VISIBLE, y no al `100%` que tenían antes. Medido en
  // el dispositivo con el teclado abierto: `innerHeight` 326 (el layout
  // viewport SÍ se achica, `interactive-widget` funciona) pero `100dvh` 721,
  // porque por especificación las unidades de viewport ignoran el teclado. Con
  // `height: 100%` el documento se quedaba en esos 721 mientras solo se veían
  // 326: 395px de documento muerto, que es exactamente el `scrollY` de 395 que
  // mostró la misma medición. Ese era el scroll. Igualando el documento al
  // área visible no queda nada que scrollear y Safari no tiene adónde ir.
  document.documentElement.style.height = `${vv.height}px`;
  document.body.style.height = `${vv.height}px`;
  // Sin overflow ya no hay scroll que compensar, así que NO se aplica ningún
  // `translateY`. El que había antes cancelaba el scroll de 395px con un
  // desplazamiento igual y opuesto: se veía bien solo mientras los dos
  // coincidían, y cualquier gesto los desincronizaba -era la causa de que la
  // pantalla "se viera re mal" al scrollear-. Si igual quedó scrolleado de
  // antes (Safari scrollea al enfocar, antes de que corra esto), se vuelve a 0.
  el.style.transform = '';
  if (window.scrollY !== 0) window.scrollTo(0, 0);
}

function readUsedRound(): string | null {
  try {
    return sessionStorage.getItem(USED_ROUND_KEY);
  } catch {
    return null;
  }
}

/**
 * Una ronda guardada en `sessionStorage` se juega UNA sola vez contra su
 * sesión: la decisión (reusar la sesión, abrir una nueva o volver a
 * estadísticas) se toma acá, en el inicializador de `useState`, que corre
 * una única vez por montaje -con la marca `ronda-usada` tal como estaba
 * ANTES de que este montaje la escriba- y después nunca se recalcula. Así:
 * - en la próxima visita a /quiz (Back, recarga, pestaña restaurada)
 *   el componente se monta de nuevo y ve la marca;
 * - en ESTE montaje, que la marca se escriba (en un efecto de `QuizPlay`)
 *   no cambia nada: nadie la observa, no hay redirección ni cambio de
 *   recorder a mitad de ronda;
 * - en StrictMode el inicializador puede llamarse dos veces en el mismo
 *   render, pero las dos antes de cualquier efecto (misma marca, mismo
 *   resultado), y el doble efecto de montaje conserva el estado.
 */
export function QuizRunner({ round }: { round: Round }) {
  const [start] = useState(() => decideRoundStart(round, readUsedRound()));
  if (start.kind === 'redirect') return <ReplaceTo href={start.to} />;
  return <QuizPlay round={round} start={start} />;
}

/** Un repaso ya jugado no se reabre con las mismas cartas: se vuelve a estadísticas. */
function ReplaceTo({ href }: { href: string }) {
  const router = useRouter();
  useEffect(() => { router.replace(href); }, [router, href]);
  return <Center h="100vh"><Loader /></Center>;
}

function QuizPlay({
  round, start,
}: { round: Round; start: Exclude<RoundStart, { kind: 'redirect' }> }) {
  const router = useRouter();
  const [state, setState] = useState<RoundState>(() => startRound(round.cards));
  const [typed, setTyped] = useState('');
  const [flash, setFlash] = useState<'none' | 'wrong'>('none');
  const [shown, setShown] = useState<string | null>(null);
  const [meaning, setMeaning] = useState<string | null>(null);
  // Cuántas veces costó cada carta (error tipeado o revelada) en la ronda
  // actual, para "Las que te costaron" del resumen. Se reinicia en cada ronda.
  const [misses, setMisses] = useState<Record<number, number>>({});
  // Se fija una sola vez, en el manejador que detecta que la ronda terminó
  // (no en el render: Date.now() ahí violaría react-hooks/purity).
  const [elapsedMs, setElapsedMs] = useState(0);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const quizScreenRef = useRef<HTMLDivElement>(null);
  // Arranca en 0 y no en Date.now(): llamar a una función impura al calcular
  // el valor inicial de un ref se evalúa en cada render (aunque solo se use
  // una vez), así que el valor real se fija en el efecto de más abajo.
  const shownAt = useRef(0);
  const roundStart = useRef(0);
  const meaningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Un `RoundRecorder` por ronda (lib/quiz/recorder.ts), con todo su estado
  // -sesión, buffer de intentos en vuelo, si falló- en SU PROPIO closure.
  // Antes esto vivía en refs compartidas del componente (sessionIdRef,
  // sessionStatus, pendingAttempts, closePending): si la apertura de la
  // sesión de la ronda N tardaba más que la ronda N entera -algo que pasa
  // de verdad con los 6s de auto-continuación de por medio-, la ronda N+1
  // pisaba esas refs y los intentos de N terminaban en la sesión de N+1 (o
  // viceversa). Con un recorder propio por ronda eso es estructuralmente
  // imposible: no hay estado compartido que pisar. El primer recorder se
  // arma una sola vez, de forma perezosa (no en el argumento de `useRef`,
  // que se evaluaría en cada render): con la sesión que ya vino en `round`
  // si es la primera vez que se juega, o abriendo una sesión nueva para los
  // mismos grupos si la ronda guardada ya se usó (ver `QuizRunner`). Como
  // en ese segundo caso crear el recorder dispara un POST, no se hace en el
  // render sino en `recorder()`, que llaman el efecto de montaje y los
  // manejadores; la ref hace que el doble efecto de StrictMode no abra dos
  // sesiones.
  const recorderRef = useRef<RoundRecorder | null>(null);
  function recorder(): RoundRecorder {
    if (recorderRef.current === null) {
      const r: RoundRecorder = start.kind === 'reuse'
        ? createRoundRecorder({ fetch: (u, i) => fetch(u, i), sessionId: start.sessionId })
        : createRoundRecorder({
          fetch: (u, i) => fetch(u, i),
          groupIds: start.groupIds,
          onFailure: () => {
            if (recorderRef.current === r) setSessionError(SESSION_ERROR_MSG);
          },
        });
      recorderRef.current = r;
    }
    return recorderRef.current;
  }
  // Evita que el timer de 6s y una tecla disparen `nextRound` dos veces. Un
  // estado de React llegaría un render tarde para esto; un ref no.
  const continued = useRef(false);

  // Ver el comentario largo junto a `applyVisualViewportInset` más arriba en
  // el archivo. Corre en el mismo efecto que bloquea el scroll de
  // `html`/`body` (abajo) porque comparten ciclo de vida -ambos existen
  // mientras el quiz está montado-, pero es un mecanismo aparte: ese lock
  // frena el scroll del documento, esto sigue el paneo del visual viewport
  // que el lock no puede ver.
  useEffect(() => {
    const el = quizScreenRef.current;
    const vv = window.visualViewport;
    if (!el || !vv) return;
    const onChange = () => applyVisualViewportInset(el);
    onChange();
    vv.addEventListener('resize', onChange);
    vv.addEventListener('scroll', onChange);
    // Safari scrollea el documento al enfocar el input, y ese scroll no
    // dispara ningún evento del visual viewport: sin escuchar también el
    // scroll del documento, el `scrollTo(0, 0)` correctivo no llega a correr.
    window.addEventListener('scroll', onChange);
    return () => {
      vv.removeEventListener('resize', onChange);
      vv.removeEventListener('scroll', onChange);
      window.removeEventListener('scroll', onChange);
      el.style.height = '';
      el.style.transform = '';
      // El alto de `html`/`body` lo limpia ESTE efecto, que es el que lo
      // fija, y no el del lock de abajo: aquel guarda el valor previo cuando
      // este ya corrió (los efectos se ejecutan en orden de declaración), así
      // que "restauraría" el pixel recién escrito acá y dejaría la página
      // siguiente con el alto del quiz clavado -pasó de verdad, medido-.
      document.documentElement.style.height = '';
      document.body.style.height = '';
    };
  }, []);

  const card = currentCard(state);
  const remaining = state.queue.length;
  const total = round.cards.length;
  const progress = total === 0 ? 0 : ((total - remaining) / total) * 100;

  // Safari/iOS empuja la página entera hacia arriba con su propio scroll
  // nativo para "traer a la vista" el input recién enfocado -aparte del
  // zoom por letra chica, ya resuelto- y ese scroll SE QUEDA ahí, no se
  // autocorrige: confirmado con un video real, hubo que scrollear a mano
  // de vuelta hasta el kana. Bloquear solo el `body` no alcanzó -el
  // elemento que realmente scrollea en iOS suele ser el `<html>`
  // (`document.documentElement`), no el `body`-, así que acá se bloquean
  // los dos. Encima, `scrollTo(0, 0)` en cada foco: es el mismo momento en
  // que Safari decide mover la página, así que corregirlo ahí mismo, en
  // vez de solo bloquear el contenedor, es la segunda red de seguridad.
  // Se restaura el valor original de cada uno al desmontar, no un string
  // fijo, por si algún estilo previo ya lo había tocado. El ALTO de los dos
  // no se toca acá: lo fija y lo limpia `applyVisualViewportInset`, porque
  // tiene que seguir al viewport visible y no quedarse en un `100%` que con
  // el teclado abierto vale la pantalla entera (ver su nota).
  // `overscrollBehavior: none` es aparte del `overflow: hidden`: aunque no
  // quede nada que scrollear, arrastrar hacia abajo desde arriba sigue
  // disparando el pull-to-refresh de Safari -recargar la página a mitad de
  // una ronda-, porque el overscroll es un gesto del navegador, no scroll de
  // la página. Esta propiedad lo apaga puntualmente, sin tener que cancelar
  // `touchmove` a mano: eso ya se probó y dejaba al usuario sin poder
  // scrollear para recuperarse si algo más fallaba.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlOverflow: html.style.overflow, htmlPosition: html.style.position,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverflow: body.style.overflow, bodyPosition: body.style.position,
      bodyWidth: body.style.width, bodyOverscroll: body.style.overscrollBehavior,
    };
    html.style.overflow = 'hidden';
    html.style.position = 'fixed';
    html.style.overscrollBehavior = 'none';
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.width = '100%';
    body.style.overscrollBehavior = 'none';
    return () => {
      html.style.overflow = prev.htmlOverflow;
      html.style.position = prev.htmlPosition;
      html.style.overscrollBehavior = prev.htmlOverscroll;
      body.style.overflow = prev.bodyOverflow;
      body.style.position = prev.bodyPosition;
      body.style.width = prev.bodyWidth;
      body.style.overscrollBehavior = prev.bodyOverscroll;
    };
  }, []);

  // El foco arranca y vuelve siempre al input: el mouse nunca es obligatorio.
  useEffect(() => {
    inputRef.current?.focus();
    // Segunda red de seguridad contra el mismo scroll de Safari: si de
    // todos modos llegó a moverse algo, esto lo vuelve a 0 apenas React
    // corre este efecto (después de que el navegador ya enfocó el input).
    window.scrollTo(0, 0);
  }, [card?.id]);
  useEffect(() => { shownAt.current = Date.now(); }, [card?.id]);
  // Arranque del cronómetro de la ronda. Las rondas siguientes lo reinician
  // en `nextRound` (un manejador, no el render).
  useEffect(() => { roundStart.current = Date.now(); }, []);
  // Marca la ronda guardada como usada en esta pestaña: la PRÓXIMA vez que
  // se monte /quiz con este mismo `sessionStorage['ronda']` ya no se
  // escribe en su sesión. Idempotente (el doble efecto de StrictMode escribe
  // el mismo valor). La sesión abierta ya se pide acá si hacía falta una
  // nueva, en vez de esperar al primer intento.
  useEffect(() => {
    try {
      sessionStorage.setItem(USED_ROUND_KEY, String(round.sessionId));
    } catch {
      // sin sessionStorage no hay replay posible que evitar
    }
    recorder();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar
  }, []);

  // El timer del significado se cancela al desmontar: si no, un setState
  // suyo puede llegar después de que el componente ya se fue. El flash de
  // error no tiene timer propio -se queda hasta que el usuario escribe de
  // nuevo (ver el `onChange` del input)-, así que no hay nada que cancelar.
  useEffect(() => () => {
    if (meaningTimer.current) clearTimeout(meaningTimer.current);
  }, []);

  function send(body: AttemptBody) {
    // Fire-and-forget hacia la UI: el recorder de la ronda vigente decide
    // solo si lo manda ya, lo guarda en buffer o lo descarta.
    recorder().record(body);
  }

  /**
   * `ms` de un intento: desde que apareció la carta o, si ya hubo un intento
   * sobre esta misma carta (error o revelar), desde ese intento anterior
   * (spec, tabla `attempt`). Al pasar de carta el efecto de `card?.id`
   * vuelve a fijar `shownAt`.
   */
  function msSinceLast(): number {
    const now = Date.now();
    const ms = now - shownAt.current;
    shownAt.current = now;
    return ms;
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!card) return;

    const r = submit(state, typed);
    send({
      cardId: card.id, typed, isCorrect: r.outcome === 'correct',
      revealed: false, ms: msSinceLast(),
    });

    if (r.outcome === 'correct') {
      setState(r.state);
      setTyped('');
      setFlash('none');
      setShown(null);

      // El significado que se muestra es el de la carta que se acaba de
      // acertar (capturada en `card` antes de este setState), no el de la
      // próxima carta que va a quedar al frente de la cola.
      if (meaningTimer.current) clearTimeout(meaningTimer.current);
      if (card.meaning) {
        setMeaning(card.meaning);
        meaningTimer.current = setTimeout(() => setMeaning(null), MEANING_MS);
      } else {
        setMeaning(null);
      }

      if (isFinished(r.state)) {
        // Se fija acá, en el manejador, para no llamar Date.now() en el
        // render del overlay (react-hooks/purity).
        setElapsedMs(Date.now() - roundStart.current);
        // Nueva ronda por terminar: el guardia de "continuar una sola vez"
        // vuelve a estar disponible.
        continued.current = false;
        // El recorder se encarga solo de esperar la apertura (si todavía
        // estaba en vuelo) y los intentos pendientes antes de mandar el
        // PATCH: ver lib/quiz/recorder.ts. No hace falta -ni se puede, ya
        // que el estado es interno al recorder- distinguir acá esos casos.
        void recorder().finish();
      }
    } else {
      // La carta se queda: solo se limpia el input y se marca el error. No se
      // re-encola ni avanza a otra carta.
      setState(r.state);
      setTyped('');
      setFlash('wrong');
      setMisses((m) => ({ ...m, [card.id]: (m[card.id] ?? 0) + 1 }));
      // Sin timer de auto-limpieza: el aviso se queda hasta que el usuario
      // vuelve a escribir (ver el `onChange` del input más abajo), no a los
      // 600ms fijos de antes -pedido explícito: no debería desaparecer
      // solo mientras el usuario todavía está mirando el error-.
    }
  }

  function onReveal() {
    // Ya revelada: un segundo Espacio (o Tab a "Revelar" + Espacio) no
    // registra otro error sobre la misma carta.
    if (!card || state.revealedCurrent) return;
    const r = reveal(state);
    setState(r.state);
    setShown(r.answer);
    // Revelar cuenta como error: se registra igual que un error tipeado, y
    // suma al conteo de "las que te costaron".
    setMisses((m) => ({ ...m, [card.id]: (m[card.id] ?? 0) + 1 }));
    send({ cardId: card.id, typed: '', isCorrect: false, revealed: true, ms: msSinceLast() });
    inputRef.current?.focus();
  }

  function nextRound() {
    if (continued.current) return;
    continued.current = true;

    if (round.mode === 'review') {
      // Un repaso es un lote cerrado de las peores cartas: encadenar acá
      // reabriría una ronda normal con esos mismos `groupIds`, convirtiendo
      // el repaso en una ronda completa de esos grupos. En vez de eso, se
      // vuelve a la pantalla de estadísticas (Task 15, sección B) -pero
      // recién después de que el recorder termine de mandar los intentos y
      // el PATCH de cierre: si se navegara ya, /stats podría montarse
      // y leer los números ANTES de que esta ronda quedara guardada, y es
      // justamente para mostrar el repaso recién jugado que se vuelve ahí.
      // `finish()` ya se llamó en `onSubmit` al detectar que la ronda
      // terminó: es idempotente (devuelve la misma promesa cacheada), así
      // que llamarlo de nuevo acá no dispara un segundo PATCH. Si la
      // apertura de la sesión hubiera fallado, `finish()` resuelve enseguida
      // y se navega igual.
      // `replace` y no `push`: con Back no se tiene que volver a caer en un
      // /quiz ya terminado.
      void recorder().finish().finally(() => router.replace('/stats'));
      return;
    }

    // Todo lo síncrono va ANTES de crear el recorder (que dispara el POST
    // de apertura): si el reset de `typed` llegara después de un await,
    // borraría la letra que el usuario ya tipeó para continuar (esa letra
    // tiene que sobrevivir como primera letra de la carta nueva). Las
    // cartas son las de siempre (`round.cards`): no se vuelven a barajar
    // contra el usuario a mitad de tecleo; el id de sesión nuevo llega
    // aparte, encapsulado en el recorder de esta ronda.
    setState(startRound(round.cards));
    setMisses({});
    setTyped('');
    setShown(null);
    setFlash('none');
    setMeaning(null);
    setSessionError(null);
    roundStart.current = Date.now();
    inputRef.current?.focus();

    // El recorder viejo NO se descarta: `finish()` ya se le pidió en la rama
    // de arriba y sigue corriendo solo -flush de su buffer y su propio
    // PATCH- aunque `recorderRef` ya apunte a este nuevo. Pendiente (fuera
    // de alcance de este fix): si se auto-continúa y después se sale con
    // Esc antes de terminar la ronda siguiente, esa sesión queda abierta.
    const next = createRoundRecorder({
      fetch: (u, i) => fetch(u, i),
      groupIds: round.groupIds,
      onFailure: () => {
        // Solo toca la UI si todavía es la ronda vigente: si para cuando
        // esto falla ya se encadenó otra ronda más, no le pisa el estado.
        if (recorderRef.current === next) setSessionError(SESSION_ERROR_MSG);
      },
    });
    recorderRef.current = next;
  }

  // `useEffectEvent` da una función estable (no dispara el efecto de abajo al
  // cambiar) que siempre lee el `typed`/`onReveal` del render más reciente.
  // Así el listener de teclado se agrega una única vez -deps vacías- y nunca
  // queda con estado viejo, sin andar duplicando estado en refs a mano.
  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      // Única navegación por Esc, tanto en juego como con el resumen
      // encima: no hay un segundo listener en RoundSummary que compita.
      // `replace`: Back desde la home no vuelve a una ronda abandonada.
      router.replace('/');
      return;
    }
    if (isFinished(state)) {
      // El resumen se queda en pantalla hasta que el usuario decide seguir:
      // solo Enter continúa (Esc, arriba, ya sale). Nada de auto-avance ni
      // de "cualquier tecla arranca la próxima" -eso hacía que el resumen
      // desapareciera solo, que es justo lo que no se quiere acá-.
      if (e.key === 'Enter') {
        e.preventDefault();
        nextRound();
      } else if (e.key === ' ') {
        // No hace nada mientras el resumen está arriba, pero igual se
        // previene: si no, Espacio scrollearía la página que quedó debajo
        // del overlay.
        e.preventDefault();
      }
      return;
    }
    // Espacio revela, pero solo si el input está vacío: si no, no se podría
    // escribir una respuesta que empiece con espacio.
    if (e.key === ' ' && typed === '') {
      e.preventDefault();
      onReveal();
    }
  });

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // `card` es null cuando la ronda terminó (queue vacía). No se corta el
  // render acá: el layout entero sigue montado -header, input, footer- para
  // que el resumen se superponga solo sobre el área del kana y el foco nunca
  // tenga que moverse. Ver RoundSummary para el overlay en sí.
  const finished = isFinished(state);

  // Se renderiza DOS veces -una arriba del stage, otra adentro del pie- y
  // CSS puro decide cuál se ve según el ancho (ver `.knd-quiz-metrics-top`
  // y el corte de 800px en globals.css): mismo patrón que ya usan
  // `.knd-nav-desktop`/`.knd-nav-mobile`, para no depender de
  // `useMediaQuery` y su desincronización servidor/cliente. `top` sufija
  // los ids de la variante de arriba; la del pie conserva los ids
  // originales (`quiz-metrics`, etc.), sin sufijo.
  function metricsBox(suffix?: string) {
    const withSuffix = (name: string) => (suffix ? `${name}-${suffix}` : name);
    return (
      <Box id={withSuffix('quiz-metrics')} className="knd-quiz-metrics">
        <Box id={withSuffix('quiz-accuracy')} className="knd-quiz-metric">
          <Text component="span" className="knd-quiz-metric-label">Aciertos</Text>
          <Text component="span" className="knd-quiz-metric-value tabular">
            {Math.round(accuracy(state) * 100)}%
          </Text>
        </Box>
        <Box id={withSuffix('quiz-remaining')} className="knd-quiz-metric">
          <Text component="span" className="knd-quiz-metric-label">Restantes</Text>
          <Text component="span" className="knd-quiz-metric-value tabular">{remaining}</Text>
        </Box>
        <Box id={withSuffix('quiz-errors')} className="knd-quiz-metric">
          <Text component="span" className="knd-quiz-metric-label">Errores</Text>
          <Text component="span" className="knd-quiz-metric-value tabular" c="shu.6">
            {state.incorrect}
          </Text>
        </Box>
      </Box>
    );
  }

  // "Hiragana · 6 grupos" del mockup. `deckName` falta en un repaso (sus
  // grupos pueden venir de mazos distintos, ver stored-round.ts) -ahí se
  // muestra sin el nombre del mazo en vez de "undefined · 6 grupos".
  const groupCount = round.groupIds.length;
  const contextLabel = [round.deckName, `${groupCount} ${groupCount === 1 ? 'grupo' : 'grupos'}`]
    .filter(Boolean)
    .join(' · ');

  // El mouse nunca es obligatorio en el quiz (comentario de arriba de
  // todo el archivo), pero clickear cualquier cosa que no sea un control
  // real -el kana, las métricas, el caption- de todos modos le saca el
  // foco al input: es el propio browser, que mueve el foco al `body` en
  // el `mousedown` de cualquier elemento no enfocable -confirmado en
  // vivo-. `preventDefault` en `mousedown` (no en `click`) frena ESE
  // mecanismo puntual sin frenar el click en sí, así que el input nunca
  // llega a perder el foco para empezar -no hace falta reenfocarlo
  // después-. Los controles reales (el input, "Revelar") manejan su
  // propio foco normalmente.
  function keepInputFocused(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.closest('input, button, a, [role="button"]')) return;
    e.preventDefault();
  }

  return (
    <Stack
      id="quiz-screen"
      ref={quizScreenRef}
      gap={0}
      // `100dvh` es el valor de reposo (SSR, navegadores sin `visualViewport`,
      // o antes de que el efecto de `applyVisualViewportInset` corra por
      // primera vez); ese efecto pisa `height`/`transform` directo sobre el
      // nodo apenas monta -ver el comentario largo junto a esa función más
      // arriba en el archivo-. `willChange: transform` porque ese efecto
      // reescribe `transform` una vez por frame mientras dura un paneo del
      // teclado: es exactamente el caso para el que existe el hint.
      style={{ height: '100dvh', willChange: 'transform' }}
      onMouseDown={keepInputFocused}
    >
      {/* Mismo fondo/borde que la barra superior del resto de la app
          (AppShellHeader en theme.ts) y la misma marca -ícono あ + nombre-,
          no un texto suelto atenuado: el mockup (`.topbar`) trae los tres,
          y acá faltaban -confirmado contra el mockup real, no solo el plan
          de implementación que lo había simplificado de más al traducirlo-. */}
      <Group
        id="quiz-header"
        px="md"
        py="xs"
        justify="space-between"
        bg="dark.6"
        // `flexShrink: 0` por lo mismo que el pie (ver la nota larga en
        // `.knd-quiz-footer`, globals.css): con el teclado abierto el alto
        // útil se vuelve escasísimo y el reparto del faltante no puede
        // tocar ni al header ni al pie, solo al stage.
        style={{ borderBottom: '1px solid var(--mantine-color-dark-4)', flexShrink: 0 }}
      >
        <Group id="quiz-brand" gap={7}>
          <Box
            id="quiz-brand-icon"
            className="kana"
            style={{
              width: '1.375rem', height: '1.375rem', display: 'grid', placeItems: 'center',
              borderRadius: '0.3125rem', background: 'var(--mantine-color-text)',
              color: 'var(--mantine-color-body)', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
            }}
          >
            あ
          </Box>
          <Text id="quiz-app-name" fw={700} size="sm">{APP_NAME}</Text>
        </Group>
        {/* `Group` con `gap`, no texto suelto con espacios/nbsp intercalados
            a mano: un espacio de texto JSX pegado al cierre de un tag puede
            colapsar a ancho CERO -pasó de verdad, confirmado midiendo en
            vivo-, y ajustar "cuánto" espacio con más espacios o nbsp no es
            un valor real, es adivinar. Con `gap` el espaciado es explícito,
            en rem -no un número pelado, que Mantine interpreta en px y no
            escala en 2K/4K con el resto de la app-. */}
        <Group id="quiz-context" gap="0.5rem" wrap="nowrap">
          {contextLabel && <Text size="xs" c="dimmed">{`${contextLabel} ·`}</Text>}
          <Kbd>Esc</Kbd>
          <Text size="xs" c="dimmed">salir</Text>
        </Group>
      </Group>

      {/* Degradé radial sutil del mockup (`.quiz-stage`), el mismo azul del
          borde de foco (`--a-focus`, #6C8CFF) casi invisible al 7% de
          opacidad: hoy era un fondo plano, faltaba por completo.
          Centro en 50% vertical, no el 42% del mockup: ese valor está
          calibrado contra SU stage fijo de 300px, donde el kana no queda
          exactamente centrado; acá el kana sí se centra de verdad
          (`place-items: center` en un `flex: 1`), así que el 42% quedaba
          notoriamente arriba del kana real -confirmado visualmente-.
          Dos colores SÓLIDOS, sin alpha: `rgb(22,27,48)` es
          `rgba(108,140,255,0.07)` ya compuesto a mano sobre el fondo
          `dark.7` (`#0F1220`) -composición alfa estándar,
          canal×0.07 + fondo×0.93-, y la segunda parada es directo ese
          mismo `dark.7`. Interpolar color sólido a color sólido no tiene
          el salto de tono que sí tenía interpolar hacia `transparent`
          (negro transparente, no "este color pero invisible"), y con la
          parada en 100% del radio de la elipse no queda un borde
          perceptible (bandas de Mach) por cortar el degradé antes de que
          el color llegue del todo a su destino. Como el último color YA
          es el del fondo, no hace falta una segunda capa de `background`
          aparte: fuera de la elipse el degradé sigue siendo ese mismo
          color, sin costura. */}
      <Box
        id="quiz-stage"
        pos="relative"
        // El stage es el ÚNICO que absorbe el faltante de alto (header y pie
        // son `flex-shrink: 0`), y para poder hacerlo tiene que poder
        // encogerse de verdad:
        // - `minHeight: 0` anula el `min-height: auto` que traen por default
        //   los ítems de flex, que es lo que le impedía bajar de los 134px
        //   que ocupaba su contenido;
        // - `containerType: 'size'` hace que su contenido deje de contar
        //   para su propio tamaño (el alto se lo dicta el flex padre) y, de
        //   paso, habilita las unidades `cqh` de acá abajo, que son las que
        //   permiten que el kana escale con el espacio REAL disponible. Ni
        //   `vh` ni una media query servirían: el alto de la pantalla del
        //   quiz lo fija JS contra el visual viewport, no el layout viewport
        //   que esas dos miran;
        // - el padding vertical baja de `xl` (32px arriba y abajo) a 8px: con
        //   `box-sizing: border-box` es un piso de 64px por sí solo, aunque
        //   el contenido ya no cuente. No se puede hacer responsive con
        //   `cqh` porque sería circular -son unidades del propio contenedor,
        //   aplicadas a una propiedad que define el tamaño de su caja de
        //   contenido: medido, se quedaba clavado en los 32px del máximo-. No
        //   hace falta igual: con `place-items: center` el padding solo se
        //   nota cuando el contenido roza los bordes, y en ese caso lo que
        //   tiene que ceder es justamente él.
        // `overflow: hidden` para que nada de acá adentro se le escape al
        // stage: con `lineHeight: 1` la caja del kana queda 12px más corta
        // que la caja de línea natural de la fuente -medido-, y ese sobrante
        // es el único desborde que queda en toda la pantalla. Alcanza para
        // que Safari muestre una barra de scroll sobre el stage al arrastrar
        // (el thumb ocupaba casi todo el alto, justo lo que corresponde a un
        // desborde de 12px). Lo que se recorta es espacio de métricas de la
        // fuente, no tinta del glifo, así que el kana se ve igual.
        style={{
          flex: 1, minHeight: 0, containerType: 'size', overflow: 'hidden',
          display: 'grid', placeItems: 'center',
          paddingBlock: '0.5rem',
          background: 'radial-gradient(ellipse 70% 55% at 50% 50%, rgb(22,27,48), var(--mantine-color-dark-7) 100%)',
        }}
      >
        {card && (
          // `pos="relative"` acá, no solo en `quiz-stage`: el mockup posiciona
          // el toast a una distancia fija del GLYPH (58px de un stage de
          // 300px de alto), no del fondo de toda la pantalla. `quiz-stage`
          // acá mide `flex:1` -todo el alto disponible, mucho más que
          // 300px-, así que anclar el toast contra ESE borde lo dejaba
          // lejísimos del kana (pasó de verdad, medido). Con este wrapper
          // -del tamaño justo del contenido, no de la pantalla- el toast se
          // ancla al borde inferior del kana (más el "shown"/"meaning" si
          // hay), a una distancia fija, sea cual sea el alto real del stage.
          <Box pos="relative" className="knd-quiz-kana-wrap">
            <Stack align="center" gap="xs">
              <Text
                id="quiz-kana"
                className="kana"
                data-testid="quiz-prompt"
                // El `min(18vw, 42cqh)` es lo que hace que el kana se achique
                // cuando el teclado deja poco alto: `18vw` sigue mandando
                // mientras sobre espacio (es el valor del diseño), pero
                // `42cqh` -42% del alto del stage, que es un container de
                // tamaño, ver arriba- lo pisa cuando el alto se vuelve el
                // recurso escaso. Antes el mínimo de 64px era fijo y el kana
                // era parte del piso del layout que dejaba al input afuera.
                style={{ fontSize: 'clamp(2rem, min(18vw, 42cqh), 162px)', lineHeight: 1 }}
                c={flash === 'wrong' ? 'shu.6' : undefined}
              >
                {card.prompt}
              </Text>
              {shown && <Text id="quiz-revealed-answer" className="romaji" c="dimmed">{shown}</Text>}
              {meaning && <Text id="quiz-meaning" size="sm" c="jade.6">{meaning}</Text>}
            </Stack>
            {/* Posición absoluta (mismo `.toast` del mockup): si viviera
                dentro del Stack de arriba, su alto cambia cuando el aviso
                aparece o desaparece y, al seguir centrado, el kana se corre
                -pasó de verdad, era justo el reclamo-. Como hermano aparte,
                aparecer o desaparecer no mueve nada más. */}
            {flash === 'wrong' && (
              <Text id="quiz-wrong-hint" className="knd-quiz-toast">
                Esa no es, probá de nuevo
              </Text>
            )}
          </Box>
        )}
        {/* "carta N de M" del mockup (`.under-glyph`), ausente hasta ahora.
            Va anclada al borde inferior de TODO el stage -cerca de la
            barra de progreso, que viene justo después-, no al wrapper del
            kana de arriba: en el mockup original `.under-glyph` cuelga del
            stage (`bottom: 26px` de sus 300px), y por eso queda pegada a
            la barra de progreso; pegarla al kana como el toast de arriba
            hubiera sido copiar mal la referencia. N es la posición de la
            carta actual: `remaining` ya es "cuántas faltan CONTANDO la
            actual" (`state.queue.length`), así que `total - remaining + 1`
            da la posición 1-based sin duplicar el estado. */}
        {card && (
          <Text id="quiz-caption" className="knd-quiz-caption tabular">
            {`carta ${total - remaining + 1} de ${total}`}
          </Text>
        )}
        {finished && (
          <RoundSummary
            state={state}
            elapsedMs={elapsedMs}
            mode={round.mode}
            misses={Object.entries(misses)
              .map(([id, count]): MissEntry | null => {
                const c = round.cards.find((x) => x.id === Number(id));
                return c ? { cardId: c.id, prompt: c.prompt, primary: c.primary, count } : null;
              })
              .filter((m): m is MissEntry => m !== null)}
          />
        )}
      </Box>

      {sessionError && (
        <Text id="quiz-session-error" size="xs" c="shu.6" ta="center" py={4}>{sessionError}</Text>
      )}

      <Progress id="quiz-progress" value={progress} size="xs" radius={0} />

      {/* <800px (ver globals.css): las métricas no entran junto al input de
          ancho fijo en el pie sin apretarse, así que viven en su propia
          barra pegada arriba de `quiz-footer` en vez de adentro. */}
      <Box id="quiz-metrics-top-bar" className="knd-quiz-metrics-top-bar">
        {metricsBox('top')}
      </Box>

      <Paper id="quiz-footer" withBorder radius={0} p="sm" style={{ borderLeft: 0, borderRight: 0, borderBottom: 0 }}>
        {/* Grilla de 3 columnas en escritorio (métricas / input de ancho fijo
            centrado / Revelar), flex simple en teléfono -ver `.knd-quiz-footer`
            en globals.css, mismo mockup que fija el input en 300px en vez de
            estirarlo a lo que sobre-. */}
        <Box className="knd-quiz-footer">
          {/* ≥800px (ver globals.css): acá adentro es donde viven las
              métricas en pantallas anchas -por debajo de 800px se ocultan
              (misma regla que ya escondía todo por debajo de 640px) porque
              tienen su propia barra arriba del stage. */}
          {metricsBox()}

          <form id="quiz-answer-form" className="knd-quiz-answer-form" onSubmit={onSubmit}>
            <TextInput
              ref={inputRef}
              id="answer-input"
              className="knd-quiz-answer"
              value={typed}
              onChange={(e) => {
                setTyped(e.currentTarget.value);
                // Único lugar donde se apaga el aviso de error: recién
                // cuando el usuario vuelve a escribir, no antes.
                if (flash === 'wrong') setFlash('none');
              }}
              placeholder="escribí en romaji"
              // `ta="center"` NO alcanza acá: centra el div contenedor de
              // Mantine, no el <input> real -que trae su propio
              // `text-align` fijado directo en el CSS base-. El centrado
              // real sale de `--input-text-align` en `.knd-quiz-answer`
              // (globals.css).
              error={flash === 'wrong'}
              // Sin esto iOS convierte "ka" en "Ka" y sugiere corregir "shi":
              // se contarían errores que nunca se cometieron.
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
              autoComplete="off"
            />
          </form>

          {/* Prueba: hint "Espacio" a la izquierda del botón en vez de
              debajo (el mockup lo pone debajo, `.reveal small {display:
              block}`, pero se pidió probar esta variante). */}
          <Group className="knd-quiz-reveal" gap="0.375rem" wrap="nowrap">
            <Text size="0.59375rem" c="dark.3">
              <Kbd>Espacio</Kbd>
            </Text>
            <Button id="reveal-btn" variant="default" size="compact-sm" onClick={onReveal}>
              Revelar
            </Button>
          </Group>
        </Box>
      </Paper>
    </Stack>
  );
}
