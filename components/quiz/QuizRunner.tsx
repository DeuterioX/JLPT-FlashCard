'use client';

import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
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

// El teclado virtual se come la mitad inferior de la pantalla. Con 100vh (o
// 100dvh sin más) el input queda tapado abajo del teclado y la app es
// inusable en el teléfono. `visualViewport.height` sí refleja el espacio que
// queda libre una vez que el teclado empujó el layout visual.
//
// Se lee con `useSyncExternalStore` (no con un `useEffect` + `setState`
// síncrono, que `react-hooks/set-state-in-effect` rechaza) siguiendo el
// mismo patrón que ya usan `app/quiz/page.tsx` y `HistoryDate` en
// `StatsBoard.tsx` para valores que solo existen en el navegador.
function subscribeViewport(onChange: () => void) {
  const vv = window.visualViewport;
  if (!vv) return () => {};
  vv.addEventListener('resize', onChange);
  vv.addEventListener('scroll', onChange);
  return () => {
    vv.removeEventListener('resize', onChange);
    vv.removeEventListener('scroll', onChange);
  };
}
function getViewportHeight(): number | null {
  return window.visualViewport?.height ?? null;
}
function getViewportHeightServer(): number | null {
  return null;
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
  const viewportH = useSyncExternalStore(subscribeViewport, getViewportHeight, getViewportHeightServer);
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

  const card = currentCard(state);
  const remaining = state.queue.length;
  const total = round.cards.length;
  const progress = total === 0 ? 0 : ((total - remaining) / total) * 100;

  // El foco arranca y vuelve siempre al input: el mouse nunca es obligatorio.
  useEffect(() => { inputRef.current?.focus(); }, [card?.id]);
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

  return (
    <Stack id="quiz-screen" gap={0} style={{ height: viewportH ? `${viewportH}px` : '100dvh' }}>
      <Group id="quiz-header" px="md" py="xs" justify="space-between">
        <Text id="quiz-app-name" size="xs" c="dimmed">{APP_NAME}</Text>
        <Text id="quiz-esc-hint" size="xs" c="dimmed"><Kbd>Esc</Kbd> salir</Text>
      </Group>

      <Box id="quiz-stage" pos="relative" style={{ flex: 1, display: 'grid', placeItems: 'center' }} py="xl">
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
          <Box pos="relative">
            <Stack align="center" gap="xs">
              <Text
                id="quiz-kana"
                className="kana"
                data-testid="quiz-prompt"
                style={{ fontSize: 'clamp(64px, 18vw, 108px)', lineHeight: 1 }}
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
            carta {total - remaining + 1} de {total}
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

      <Paper id="quiz-footer" withBorder radius={0} p="sm" style={{ borderLeft: 0, borderRight: 0, borderBottom: 0 }}>
        {/* Grilla de 3 columnas en escritorio (métricas / input de ancho fijo
            centrado / Revelar), flex simple en teléfono -ver `.knd-quiz-footer`
            en globals.css, mismo mockup que fija el input en 300px en vez de
            estirarlo a lo que sobre-. */}
        <Box className="knd-quiz-footer">
          {/* Se oculta en teléfono con el corte de 640px del proyecto (CSS puro,
              ver globals.css). Caja con borde propio y celdas separadas por
              líneas verticales (`.metrics` del mockup): no es un `Group` de
              textos sueltos -era lo que había antes-, así que se arma con
              `Box`/CSS puro en vez del layout de flex+gap que trae Group. */}
          <Box id="quiz-metrics" className="knd-quiz-metrics">
            <Box id="quiz-accuracy" className="knd-quiz-metric">
              <Text component="span" className="knd-quiz-metric-label">Aciertos</Text>
              <Text component="span" className="knd-quiz-metric-value tabular">
                {Math.round(accuracy(state) * 100)}%
              </Text>
            </Box>
            <Box id="quiz-remaining" className="knd-quiz-metric">
              <Text component="span" className="knd-quiz-metric-label">Restantes</Text>
              <Text component="span" className="knd-quiz-metric-value tabular">{remaining}</Text>
            </Box>
            <Box id="quiz-errors" className="knd-quiz-metric">
              <Text component="span" className="knd-quiz-metric-label">Errores</Text>
              <Text component="span" className="knd-quiz-metric-value tabular" c="shu.6">
                {state.incorrect}
              </Text>
            </Box>
          </Box>

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

          <Button id="reveal-btn" className="knd-quiz-reveal" variant="default" size="compact-sm" onClick={onReveal}>
            Revelar
          </Button>
        </Box>
      </Paper>
    </Stack>
  );
}
