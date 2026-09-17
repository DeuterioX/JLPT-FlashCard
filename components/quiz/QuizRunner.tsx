'use client';

import { useEffect, useEffectEvent, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Stack, Group, Text, TextInput, Button, Progress, Paper, Box, Kbd } from '@mantine/core';
import {
  startRound, submit, reveal, currentCard, isFinished, accuracy,
  type QuizCard, type RoundState,
} from '@/lib/quiz/engine';
import { RoundSummary } from './RoundSummary';

export type Round = { sessionId: number; groupIds: number[]; cards: QuizCard[] };

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
  // Id de la sesión donde se registran los intentos. Empieza en la de
  // `round`, pero cambia cuando se encadena la ronda siguiente (Task 13). Es
  // un ref -no estado- porque `send()` lo necesita leer al instante en que se
  // llama, sin esperar a que un re-render propague un valor nuevo.
  const sessionIdRef = useRef(round.sessionId);
  // 'ready': sessionIdRef apunta a una sesión abierta y se puede mandar ahí.
  // 'pending': se está abriendo la sesión de la ronda siguiente; los intentos
  // se guardan en pendingAttempts hasta que se resuelva.
  // 'failed': la apertura falló; no hay dónde guardar y no hay que reintentar
  // contra la sesión anterior (ya está cerrada).
  const sessionStatus = useRef<'ready' | 'pending' | 'failed'>('ready');
  const pendingAttempts = useRef<Record<string, unknown>[]>([]);
  // Caso límite: la ronda termina mientras todavía se está abriendo SU PROPIA
  // sesión (sessionStatus === 'pending'). sessionIdRef.current en ese momento
  // sigue apuntando a la sesión anterior, ya cerrada: cerrarla de nuevo
  // cerraría la sesión equivocada. Se pospone el cierre hasta que resuelva.
  const closePending = useRef(false);
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

  function postAttempt(sessionId: number, body: Record<string, unknown>) {
    // Fire-and-forget: no bloquea el tipeo. Si se cierra la pestaña a mitad de
    // ronda, lo ya respondido quedó guardado.
    void fetch('/api/attempts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId, ...body }),
    }).catch(() => {});
  }

  function send(body: Record<string, unknown>) {
    // Mientras se abre la sesión de la ronda siguiente ('pending'), el intento
    // se guarda y se manda recién cuando se conoce el id nuevo: así nunca cae
    // en la sesión vieja, que para entonces ya se cerró (Task 13, trampa 5).
    if (sessionStatus.current === 'pending') {
      pendingAttempts.current.push(body);
      return;
    }
    // 'failed': no se pudo abrir sesión para esta ronda. No hay id válido
    // donde guardar y mandarlo a la sesión anterior (cerrada) sería un dato
    // mal atribuido, así que se descarta: la ronda sigue local nomás.
    if (sessionStatus.current === 'failed') return;
    postAttempt(sessionIdRef.current, body);
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
        if (sessionStatus.current === 'ready') {
          void fetch(`/api/sessions/${sessionIdRef.current}`, { method: 'PATCH' }).catch(() => {});
        } else if (sessionStatus.current === 'pending') {
          // La sesión de esta ronda todavía se está abriendo: cerrarla
          // ahora cerraría la anterior (stale). Se cierra cuando resuelva.
          closePending.current = true;
        }
        // 'failed': nunca hubo sesión para esta ronda, no hay nada que cerrar.
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

    // Todo lo síncrono va ANTES del fetch: si el reset de `typed` llegara
    // después de un await, borraría la letra que el usuario ya tipeó para
    // continuar (esa letra tiene que sobrevivir como primera letra de la
    // carta nueva). Las cartas son las de siempre (`round.cards`): no se
    // vuelven a barajar contra el usuario a mitad de tecleo; el id de sesión
    // nuevo se suma cuando el POST resuelva, sin tocar estas cartas.
    setState(startRound(round.cards));
    setMisses({});
    setTyped('');
    setShown(null);
    setFlash('none');
    setMeaning(null);
    setSessionError(null);
    roundStart.current = Date.now();
    sessionStatus.current = 'pending';
    pendingAttempts.current = [];
    closePending.current = false;
    inputRef.current?.focus();

    // Abrir la sesión de la ronda siguiente en segundo plano, con los mismos
    // grupos. Recién cuando resuelve se cambia el id de sesión: hasta
    // entonces los intentos quedan en el buffer (ver `send`).
    void fetch('/api/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ groupIds: round.groupIds }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('open failed'))))
      .then((next: { sessionId: number }) => {
        sessionIdRef.current = next.sessionId;
        sessionStatus.current = 'ready';
        const buffered = pendingAttempts.current;
        pendingAttempts.current = [];
        for (const body of buffered) postAttempt(next.sessionId, body);
        // Si esta ronda ya había terminado mientras se abría (caso límite),
        // el cierre había quedado pospuesto: se dispara recién ahora, contra
        // el id correcto.
        if (closePending.current) {
          closePending.current = false;
          void fetch(`/api/sessions/${next.sessionId}`, { method: 'PATCH' }).catch(() => {});
        }
      })
      .catch(() => {
        sessionStatus.current = 'failed';
        pendingAttempts.current = [];
        closePending.current = false;
        setSessionError(SESSION_ERROR_MSG);
      });
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
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
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
            misses={Object.entries(misses)
              .map(([id, count]) => {
                const c = round.cards.find((x) => x.id === Number(id));
                return c ? { prompt: c.prompt, primary: c.primary, count } : null;
              })
              .filter((m): m is { prompt: string; primary: string; count: number } => m !== null)
              .sort((a, b) => b.count - a.count)}
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
