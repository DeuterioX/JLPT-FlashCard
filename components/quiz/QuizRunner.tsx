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
import { createRoundRecorder, SESSION_ERROR_MSG, type AttemptBody, type RoundRecorder } from '@/lib/quiz/recorder';
import {
  decideRoundStart, markRoundUsed, readUsedRound, type RoundStart, type StoredRound,
} from '@/lib/quiz/stored-round';
import { RoundSummary, type MissEntry } from './RoundSummary';
import { GenkoSheet } from './GenkoSheet';
import { RoundHeader, roundContext } from './RoundHeader';
import { isPhone } from '@/lib/client/screen';
import styles from './QuizRunner.module.css';

export type Round = StoredRound;

const MEANING_MS = 1200;

// El alto de la pantalla sale del VIEWPORT VISUAL, no de CSS. Medido en el
// dispositivo, con el teclado abierto: `innerHeight` 721 pero
// `visualViewport.height` 425. Es decir que el layout viewport NO se achica
// de forma confiable -`interactive-widget: resizes-content` no alcanza- y
// por lo tanto NINGUNA unidad de CSS sirve acá: `100dvh` da 721 (las
// unidades de viewport excluyen el teclado por especificación) y `100%` da
// 721 también (sigue al layout viewport). Las dos dejan la pantalla ~300px
// más alta que el espacio visible, con el input debajo del teclado.
//
// `html`/`body` van al mismo alto para que no quede documento fuera de lo
// visible. Lo que NO se hace es seguir el paneo del viewport visual con un
// `transform`: eso estuvo acá y llegaba siempre un frame tarde respecto del
// navegador, que compone en su propio hilo.
function applyVisualViewportInset(el: HTMLElement) {
  const vv = window.visualViewport;
  if (!vv) return;
  const h = `${vv.height}px`;
  el.style.height = h;
  document.documentElement.style.height = h;
  document.body.style.height = h;
  // Corrección de una sola vez del scroll que Safari hace al enfocar. Va
  // atada a `resize` del viewport visual y al `focus` del input -eventos
  // discretos-, NUNCA al evento de scroll: atarla al scroll es lo que
  // generaba el temblor, porque corregía en cada frame contra el gesto que
  // el usuario estaba haciendo.
  if (window.scrollY !== 0) window.scrollTo(0, 0);
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
  // Qué cara se ve, separado de si la carta fue revelada. `shown` guarda la
  // respuesta y no vuelve a null hasta cambiar de carta -revelar cuenta como
  // error y eso ya quedó registrado-; esto es sólo la vista, y por eso se
  // puede ir y volver sin tocar el puntaje.
  const [flipped, setFlipped] = useState(false);
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

  // Solo eventos del viewport visual: NO se escucha el scroll del documento.
  // Escucharlo existía para poder forzar `scrollTo(0, 0)` desde ahí, que es
  // justamente lo que causaba el temblor (ver la nota de la función).
  useEffect(() => {
    const el = quizScreenRef.current;
    const vv = window.visualViewport;
    if (!el || !vv) return;
    const onChange = () => applyVisualViewportInset(el);
    onChange();
    vv.addEventListener('resize', onChange);
    // También al enfocar: es el momento exacto en que Safari scrollea para
    // "traer a la vista" el input, y es un evento discreto, no continuo.
    document.addEventListener('focusin', onChange);
    return () => {
      vv.removeEventListener('resize', onChange);
      document.removeEventListener('focusin', onChange);
      el.style.height = '';
      document.documentElement.style.height = '';
      document.body.style.height = '';
    };
  }, []);

  const card = currentCard(state);
  const remaining = state.queue.length;
  const total = round.cards.length;
  const progress = total === 0 ? 0 : ((total - remaining) / total) * 100;

  // Ojo con lo que estas dos propiedades SÍ hacen: ni `overflow: hidden` ni
  // `position: fixed` frenan el scroll en iOS. Medido en el dispositivo con
  // las dos puestas (`deOv hidden/fixed`), el documento scrolleaba igual
  // -`document top=0, 17, 37, 59, 68`-, porque el área scrolleable es el ICB
  // (el layout viewport, 721px) y no el alto que se le fija al elemento. El
  // que frena el gesto es el `touchAction: 'none'` de la pantalla del quiz.
  // Quedan igual porque sacan el documento de flujo y le fijan el tamaño, que
  // es lo que evita que el contenido viaje con cualquier scroll residual.
  //
  // `overscrollBehavior: none` es otra cosa más: el pull-to-refresh de Safari
  // es un gesto del navegador, no scroll de la página, así que sobrevive a
  // todo lo anterior aunque no quede nada que scrollear.
  //
  // El alto NO se toca acá: lo fija y lo limpia `applyVisualViewportInset`,
  // que es el único que conoce el alto visible real.
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
    // Sin `scrollTo(0, 0)` acá: este `focus()` dispara `focusin`, y de ahí
    // cuelga la corrección del scroll (ver `applyVisualViewportInset`).
    inputRef.current?.focus();
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
    markRoundUsed(round.sessionId);
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
      setFlipped(false);

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
    if (!card) return;
    // Ya revelada: el botón pasa a ser un interruptor. Se puede volver al
    // kana y mirarlo de nuevo cuantas veces haga falta -es una app para
    // aprender a leerlo- y NO se registra otro error: el de esta carta ya
    // quedó contado en el primer revelado.
    if (state.revealedCurrent) {
      setFlipped((f) => !f);
      inputRef.current?.focus();
      return;
    }
    const r = reveal(state);
    setState(r.state);
    setShown(r.answer);
    setFlipped(true);
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
    setFlipped(false);
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
  // y el corte de 800px en globals.css): las dos variantes están
  // siempre en el DOM, para no depender de `useMediaQuery` y su
  // desincronización servidor/cliente. `top` sufija
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
          <Text component="span" className="knd-quiz-metric-value tabular" c="var(--knd-shu-txt)">
            {state.incorrect}
          </Text>
        </Box>
      </Box>
    );
  }

  // "Hiragana · 6 grupos" del mockup. `deckName` falta en un repaso (sus
  // grupos pueden venir de mazos distintos, ver stored-round.ts) -ahí se
  // muestra sin el nombre del mazo en vez de "undefined · 6 grupos".
  const contextLabel = roundContext(round.deckName, round.groupIds.length);

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
      // Valor de reposo nada más (SSR / antes de que corra el efecto): sin
      // teclado, `100dvh` es la pantalla completa y es correcto. Con el
      // teclado abierto ninguna unidad de CSS sirve y manda
      // `applyVisualViewportInset` (ver su nota).
      // `touchAction: 'none'`: lo ÚNICO que frena el scroll en iOS. Medido en
      // el dispositivo, `overflow: hidden` MÁS `position: fixed` en
      // `html`/`body` no alcanzan -el diagnóstico registró scroll real del
      // documento con las dos puestas-, porque el área scrolleable es el ICB
      // (721px, el layout viewport) y no el alto que se le fija al elemento.
      // Acá es seguro y no repite el bloqueo de `touchmove` de antes, que
      // dejaba al usuario encerrado si algo se corría: ahora la pantalla mide
      // exactamente el área visible, así que no hay nada a dónde scrollear ni
      // de dónde volver, y si Safari igual scrollea al enfocar, el
      // `focusin` de `applyVisualViewportInset` lo devuelve a 0.
      style={{ height: '100dvh', touchAction: 'none' }}
      onMouseDown={keepInputFocused}
    >
      <RoundHeader
        id="quiz-header" brandId="quiz-brand" nameId="quiz-app-name"
        context={contextLabel}
      />

      {/* Degradé radial sutil del mockup (`.quiz-stage`): hoy era un fondo
          plano, faltaba por completo. El centro era `rgb(22,27,48)`, un
          lavado del azul del foco, que contra la escala de tinta se veía como
          un halo celeste alrededor de la hoja. Ahora es la superficie de la
          propia escala (`dark.6`) apagándose hacia el fondo de página.
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
        className="knd-round-stage"
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
        }}
        /* En teléfono el escenario ES el botón de revelar: el botón se
           esconde y el toque sobre la carta la da vuelta. Es el gesto que
           uno hace con una tarjeta de verdad, y devuelve el ancho del pie al
           input, que es lo único que ahí hace falta.

           `preventDefault` en el `pointerdown` y no un `onClick` pelado: sin
           eso, tocar el escenario le saca el foco al input y se cierra el
           teclado, o sea que revelar te cuesta volver a tocar el campo para
           seguir escribiendo. Previniendo el default del puntero el foco no
           se mueve y el teclado se queda donde está.

           En escritorio no hace nada: ahí está el botón, y está la barra
           espaciadora. */
        onPointerDown={(e) => {
          if (!isPhone()) return;
          e.preventDefault();
        }}
        onClick={() => {
          if (!isPhone()) return;
          onReveal();
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
          <Box pos="relative" className={styles.quizKanaWrap}>
            {/* El bloque que gira al revelar. La perspectiva va en ESTE div y
                no en el `Box` de afuera: `perspective` convierte al elemento
                en bloque contenedor de sus descendientes absolutos, y el
                layout de emergencia de globals.css -el que con el teclado
                abierto pone `.${styles.quizKanaWrap}` en `static` para que el
                aviso de error se ancle al piso del stage- dejaría de
                funcionar si el Box la tuviera. */}
            <div className={styles.quizPersp}>
              <div className={`${styles.quizTurn}${flipped ? ' is-revealed' : ''}`}>
                <div className={styles.quizFace}>
                  {/* El kana pasa a vivir en una hoja de 原稿用紙, una celda
                      por carácter. El tamaño de la celda lo decide el CSS y
                      sigue achicándose cuando el teclado deja poco alto -el
                      `42cqh` de `--knd-genko-lado` cumple el papel que hacía
                      el `clamp` que estaba acá-, pero además ahora una
                      palabra larga reparte el ancho entre sus caracteres en
                      vez de encogerse entera. */}
                  <GenkoSheet
                    id="quiz-kana"
                    testId="quiz-prompt"
                    text={card.prompt}
                    tone={flash === 'wrong' ? 'var(--mantine-color-shu-6)' : undefined}
                  />
                </div>
                {/* El dorso: la lectura y el significado, sin repetir el
                    kana. El kana no hace falta acá porque volver a verlo
                    cuesta un toque -«Revelar» alterna y escribir devuelve al
                    frente solo-, así que duplicarlo sería ruido.

                    Está SIEMPRE renderizado, no sólo una vez revelado:
                    comparte la celda de la grilla con el frente, así que es él
                    quien fija el alto de la caja cuando es más alto -y con una
                    frase y un significado largo lo es-. Agregándolo al
                    revelar, la caja crecía en el mismo momento del giro:
                    medido en teléfono con けんきゅうしゃ, de 83 a 308px. Como
                    está dado vuelta y con `backface-visibility: hidden`, no se
                    ve hasta que la hoja gira.

                    `aria-hidden` mientras no esté revelado: escondido para el
                    ojo pero presente en el DOM, un lector de pantalla cantaría
                    la respuesta antes de que la pidas. */}
                <div className={`${styles.quizFace} ${styles.quizFaceBack}`} aria-hidden={!flipped}>
                  {/* El hueco entre la lectura y el significado es más grande
                      que el de un Stack normal a propósito: son dos datos
                      distintos -cómo se dice y qué quiere decir-, no dos
                      renglones del mismo. Pegados se leen como una sola cosa
                      partida en dos. */}
                  {(shown ?? card.primary) && (
                    <Stack align="center" gap={14}>
                      <Text
                        id="quiz-revealed-answer"
                        className="romaji"
                        /* Escala hermana de la del kana, un escalón abajo:
                           el kana usa `min(18vw, 42cqh)` y esto `min(12vw,
                           26cqh)`. El dorso es el premio del giro y tiene
                           que leerse de un vistazo, no ser una nota al pie
                           del signo que reemplaza. */
                        style={{
                          fontSize: 'clamp(1.5rem, min(12vw, 26cqh), 88px)',
                          lineHeight: 1.1,
                          // El dorso ahora es papel: la lectura va en tinta,
                          // no en el color de texto del tema oscuro.
                          color: 'var(--knd-sumi)',
                        }}
                      >
                        {shown ?? card.primary}
                      </Text>
                      {card.meaning && (
                        <Text
                          id="quiz-revealed-meaning"
                          style={{
                            fontSize: 'clamp(1.0625rem, min(5.5vw, 11cqh), 32px)',
                            lineHeight: 1.25,
                            // Verde, que es lo que dice que acertaste, pero no
                            // el jade de la app: ése está calibrado contra
                            // superficies oscuras y sobre el papel da 2,41:1.
                            // `--knd-verde-papel` es el mismo verde dos tonos
                            // más oscuro, 4,99:1 sobre la hoja. El gris sumi
                            // que había acá antes se leía bien pero no decía
                            // nada: era la misma tinta que el resto del papel.
                            color: 'var(--knd-verde-papel)',
                          }}
                        >
                          {card.meaning}
                        </Text>
                      )}
                    </Stack>
                  )}
                </div>
              </div>
            </div>
            {/* Lo que cuelga del kana va en este bloque de posición absoluta:
                el significado (que aparece 1200ms al acertar, ya sobre la
                carta siguiente) y el aviso de error. Adentro del bloque
                centrado, cualquiera de los dos cambia su alto y, al seguir
                centrado, el kana SE CORRE al aparecer. Van juntos y no como
                hermanos sueltos para que no se pisen cuando coinciden.

                La respuesta revelada ya no está acá: se fue al dorso del
                giro, que ocupa la misma celda que el kana y por lo tanto
                tampoco mueve nada. */}
            <Stack id="quiz-under-kana" className={styles.quizUnder} align="center" gap={5}>
              {/* El botón de revelar no está en teléfono, así que algo tiene
                  que decir que la carta se toca. Cuelga del kana, como todo lo
                  demás de este bloque, y sólo mientras está tapada: que se
                  vuelva a tocar para ocultar ya se deduce. */}
              {!flipped && (
                <Text className="knd-tap-hint knd-phone-only">tocá la carta para revelar</Text>
              )}
              {meaning && <Text id="quiz-meaning" size="sm" c="jade.6">{meaning}</Text>}
              {flash === 'wrong' && (
                <Text id="quiz-wrong-hint" className={styles.quizToast}>
                  Esa no es, probá de nuevo
                </Text>
              )}
            </Stack>
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
        <Text id="quiz-session-error" size="xs" c="var(--knd-shu-txt)" ta="center" py={4}>{sessionError}</Text>
      )}

      <Progress id="quiz-progress" value={progress} size="xs" radius={0} />

      {/* <800px (ver globals.css): las métricas no entran junto al input de
          ancho fijo en el pie sin apretarse, así que viven en su propia
          barra pegada arriba de `quiz-footer` en vez de adentro. */}
      <Box id="quiz-metrics-top-bar" className={styles.quizMetricsTopBar}>
        {metricsBox('top')}
      </Box>

      <Paper id="quiz-footer" withBorder radius={0} p="sm" style={{ borderLeft: 0, borderRight: 0, borderBottom: 0 }}>
        {/* Grilla de 3 columnas en escritorio (métricas / input de ancho fijo
            centrado / Revelar), flex simple en teléfono -ver `.${styles.quizFooter}`
            en globals.css, mismo mockup que fija el input en 300px en vez de
            estirarlo a lo que sobre-. */}
        <Box className={styles.quizFooter}>
          {/* ≥800px (ver globals.css): acá adentro es donde viven las
              métricas en pantallas anchas -por debajo de 800px se ocultan
              (misma regla que ya escondía todo por debajo de 640px) porque
              tienen su propia barra arriba del stage. */}
          {metricsBox()}

          <form id="quiz-answer-form" className={styles.quizAnswerForm} onSubmit={onSubmit}>
            <TextInput
              ref={inputRef}
              id="answer-input"
              className={styles.quizAnswer}
              value={typed}
              onChange={(e) => {
                setTyped(e.currentTarget.value);
                // Único lugar donde se apaga el aviso de error: recién
                // cuando el usuario vuelve a escribir, no antes.
                if (flash === 'wrong') setFlash('none');
                // Empezar a escribir devuelve al kana: se escribe MIRANDO el
                // signo, no la respuesta. Si no, el ejercicio se vuelve
                // copiar lo que dice la pantalla.
                if (flipped) setFlipped(false);
              }}
              placeholder="escribí en romaji"
              // `ta="center"` NO alcanza acá: centra el div contenedor de
              // Mantine, no el <input> real -que trae su propio
              // `text-align` fijado directo en el CSS base-. El centrado
              // real sale de `--input-text-align` en `.${styles.quizAnswer}`
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
          <Group className={styles.quizReveal} gap="0.375rem" wrap="nowrap">
            <Text size="0.59375rem" c="dark.3">
              <Kbd>Espacio</Kbd>
            </Text>
            <Button id="reveal-btn" variant="default" size="compact-sm" onClick={onReveal}>
              {flipped ? 'Ocultar' : 'Revelar'}
            </Button>
          </Group>
        </Box>
      </Paper>
    </Stack>
  );
}
