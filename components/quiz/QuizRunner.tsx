'use client';

import { useEffect, useEffectEvent, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Stack, Group, Text, TextInput, Button, Progress, Paper, Box, Kbd } from '@mantine/core';
import {
  startRound, submit, reveal, currentCard, isFinished, accuracy,
  type QuizCard, type RoundState,
} from '@/lib/quiz/engine';
import { createRoundRecorder, type AttemptBody, type RoundRecorder } from '@/lib/quiz/recorder';
import { RoundSummary, type MissEntry } from './RoundSummary';

export type Round = {
  sessionId: number; groupIds: number[]; cards: QuizCard[]; mode: 'normal' | 'review';
};

const MEANING_MS = 1200;
const WRONG_FLASH_MS = 600;
const SESSION_ERROR_MSG = 'No se pudo guardar esta ronda. Tus respuestas no se están registrando.';

export function QuizRunner({ round }: { round: Round }) {
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
  const wrongTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  // que se evaluaría en cada render) con la sesión que ya vino en `round`.
  const recorderRef = useRef<RoundRecorder | null>(null);
  if (recorderRef.current === null) {
    recorderRef.current = createRoundRecorder({
      fetch: (u, i) => fetch(u, i),
      sessionId: round.sessionId,
    });
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

  // Cualquier timer pendiente (flash de error o de significado) se cancela al
  // desmontar: si no, un setState de un timer viejo puede llegar después de
  // que el componente ya se fue.
  useEffect(() => () => {
    if (meaningTimer.current) clearTimeout(meaningTimer.current);
    if (wrongTimer.current) clearTimeout(wrongTimer.current);
  }, []);

  function send(body: AttemptBody) {
    // Fire-and-forget hacia la UI: el recorder de la ronda vigente decide
    // solo si lo manda ya, lo guarda en buffer o lo descarta.
    recorderRef.current!.record(body);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!card) return;

    const r = submit(state, typed);
    send({
      cardId: card.id, typed, isCorrect: r.outcome === 'correct',
      revealed: false, ms: Date.now() - shownAt.current,
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
        void recorderRef.current!.finish();
      }
    } else {
      // La carta se queda: solo se limpia el input y se marca el error. No se
      // re-encola ni avanza a otra carta.
      setState(r.state);
      setTyped('');
      setFlash('wrong');
      setMisses((m) => ({ ...m, [card.id]: (m[card.id] ?? 0) + 1 }));
      if (wrongTimer.current) clearTimeout(wrongTimer.current);
      wrongTimer.current = setTimeout(() => setFlash('none'), WRONG_FLASH_MS);
    }
  }

  function onReveal() {
    if (!card) return;
    const r = reveal(state);
    setState(r.state);
    setShown(r.answer);
    // Revelar cuenta como error: se registra igual que un error tipeado, y
    // suma al conteo de "las que te costaron".
    setMisses((m) => ({ ...m, [card.id]: (m[card.id] ?? 0) + 1 }));
    send({ cardId: card.id, typed: '', isCorrect: false, revealed: true, ms: 0 });
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
      // el PATCH de cierre: si se navegara ya, /estadisticas podría montarse
      // y leer los números ANTES de que esta ronda quedara guardada, y es
      // justamente para mostrar el repaso recién jugado que se vuelve ahí.
      // `finish()` ya se llamó en `onSubmit` al detectar que la ronda
      // terminó: es idempotente (devuelve la misma promesa cacheada), así
      // que llamarlo de nuevo acá no dispara un segundo PATCH. Si la
      // apertura de la sesión hubiera fallado, `finish()` resuelve enseguida
      // y se navega igual.
      void recorderRef.current!.finish().finally(() => router.push('/estadisticas'));
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
    const recorder = createRoundRecorder({
      fetch: (u, i) => fetch(u, i),
      groupIds: round.groupIds,
      onFailure: () => {
        // Solo toca la UI si todavía es la ronda vigente: si para cuando
        // esto falla ya se encadenó otra ronda más, no le pisa el estado.
        if (recorderRef.current === recorder) setSessionError(SESSION_ERROR_MSG);
      },
    });
    recorderRef.current = recorder;
  }

  // `useEffectEvent` da una función estable (no dispara el efecto de abajo al
  // cambiar) que siempre lee el `typed`/`onReveal` del render más reciente.
  // Así el listener de teclado se agrega una única vez -deps vacías- y nunca
  // queda con estado viejo, sin andar duplicando estado en refs a mano.
  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      // Única navegación por Esc, tanto en juego como con el resumen
      // encima: no hay un segundo listener en RoundSummary que compita.
      router.push('/');
      return;
    }
    if (isFinished(state)) {
      // Cualquier tecla imprimible (sin modificadores, para no comerse
      // atajos como Ctrl+R) arranca la ronda siguiente sin tocar nada más;
      // como no se le hace preventDefault, el propio carácter cae en el
      // input ya enfocado y queda como primera letra de la carta nueva.
      // Espacio es la excepción: sí se previene, porque si no dejaría un
      // ' ' suelto en el input y eso desactiva "espacio revela" en la
      // carta que recién está arrancando.
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === ' ') e.preventDefault();
        nextRound();
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
    <Stack gap={0} h="100%">
      <Group px="md" py="xs" justify="space-between">
        <Text size="xs" c="dimmed">Kana Drill</Text>
        <Text size="xs" c="dimmed"><Kbd>Esc</Kbd> salir</Text>
      </Group>

      <Box pos="relative" style={{ flex: 1, display: 'grid', placeItems: 'center' }} py="xl">
        {card && (
          <Stack align="center" gap="xs">
            <Text
              className="kana"
              style={{ fontSize: 'clamp(64px, 18vw, 108px)', lineHeight: 1 }}
              c={flash === 'wrong' ? 'shu.6' : undefined}
            >
              {card.prompt}
            </Text>
            {shown && <Text className="romaji" c="dimmed">es {shown}</Text>}
            {flash === 'wrong' && <Text size="sm" c="shu.6">no es esa, probá de nuevo</Text>}
            {meaning && <Text size="sm" c="jade.6">{meaning}</Text>}
          </Stack>
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
            onContinue={nextRound}
          />
        )}
      </Box>

      {sessionError && (
        <Text size="xs" c="shu.6" ta="center" py={4}>{sessionError}</Text>
      )}

      <Progress value={progress} size="xs" radius={0} />

      <Paper withBorder radius={0} p="sm" style={{ borderLeft: 0, borderRight: 0, borderBottom: 0 }}>
        <Group gap="md" wrap="nowrap">
          <Group gap="lg" visibleFrom="sm">
            <Text size="xs" c="dimmed">Aciertos <b className="tabular">{Math.round(accuracy(state) * 100)}%</b></Text>
            <Text size="xs" c="dimmed">Restantes <b className="tabular">{remaining}</b></Text>
            <Text size="xs" c="dimmed">Errores <b className="tabular" style={{ color: 'var(--mantine-color-shu-6)' }}>{state.incorrect}</b></Text>
          </Group>

          <form onSubmit={onSubmit} style={{ flex: 1 }}>
            <TextInput
              ref={inputRef}
              id="respuesta"
              value={typed}
              onChange={(e) => setTyped(e.currentTarget.value)}
              placeholder="escribí el romaji"
              ta="center"
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

          <Button variant="default" size="compact-sm" onClick={onReveal}>Revelar</Button>
        </Group>
      </Paper>
    </Stack>
  );
}
