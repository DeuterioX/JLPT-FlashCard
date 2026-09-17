'use client';

import { useEffect, useEffectEvent, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Stack, Group, Text, TextInput, Button, Progress, Paper, Box, Kbd } from '@mantine/core';
import {
  startRound, submit, reveal, currentCard, isFinished, accuracy,
  type QuizCard, type RoundState,
} from '@/lib/quiz/engine';

export type Round = { sessionId: number; groupIds: number[]; cards: QuizCard[] };

const MEANING_MS = 1200;
const WRONG_FLASH_MS = 600;

export function QuizRunner({ round }: { round: Round }) {
  const router = useRouter();
  const [state, setState] = useState<RoundState>(() => startRound(round.cards));
  const [typed, setTyped] = useState('');
  const [flash, setFlash] = useState<'none' | 'wrong'>('none');
  const [shown, setShown] = useState<string | null>(null);
  const [meaning, setMeaning] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Arranca en 0 y no en Date.now(): llamar a una función impura al calcular
  // el valor inicial de un ref se evalúa en cada render (aunque solo se use
  // una vez), así que el valor real se fija en el efecto de más abajo.
  const shownAt = useRef(0);
  const meaningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrongTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const card = currentCard(state);
  const remaining = state.queue.length;
  const total = round.cards.length;
  const progress = total === 0 ? 0 : ((total - remaining) / total) * 100;

  // El foco arranca y vuelve siempre al input: el mouse nunca es obligatorio.
  useEffect(() => { inputRef.current?.focus(); }, [card?.id]);
  useEffect(() => { shownAt.current = Date.now(); }, [card?.id]);

  // Cualquier timer pendiente (flash de error o de significado) se cancela al
  // desmontar: si no, un setState de un timer viejo puede llegar después de
  // que el componente ya se fue.
  useEffect(() => () => {
    if (meaningTimer.current) clearTimeout(meaningTimer.current);
    if (wrongTimer.current) clearTimeout(wrongTimer.current);
  }, []);

  function send(body: Record<string, unknown>) {
    // Fire-and-forget: no bloquea el tipeo. Si se cierra la pestaña a mitad de
    // ronda, lo ya respondido quedó guardado.
    void fetch('/api/attempts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId: round.sessionId, ...body }),
    }).catch(() => {});
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
        void fetch(`/api/sessions/${round.sessionId}`, { method: 'PATCH' }).catch(() => {});
      }
    } else {
      // La carta se queda: solo se limpia el input y se marca el error. No se
      // re-encola ni avanza a otra carta.
      setState(r.state);
      setTyped('');
      setFlash('wrong');
      if (wrongTimer.current) clearTimeout(wrongTimer.current);
      wrongTimer.current = setTimeout(() => setFlash('none'), WRONG_FLASH_MS);
    }
  }

  function onReveal() {
    if (!card) return;
    const r = reveal(state);
    setState(r.state);
    setShown(r.answer);
    // Revelar cuenta como error: se registra igual que un error tipeado.
    send({ cardId: card.id, typed: '', isCorrect: false, revealed: true, ms: 0 });
    inputRef.current?.focus();
  }

  // `useEffectEvent` da una función estable (no dispara el efecto de abajo al
  // cambiar) que siempre lee el `typed`/`onReveal` del render más reciente.
  // Así el listener de teclado se agrega una única vez -deps vacías- y nunca
  // queda con estado viejo, sin andar duplicando estado en refs a mano.
  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      router.push('/');
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

  if (!card) {
    // El overlay de fin de ronda llega en la Task 13. Por ahora, un mensaje
    // simple para que la pantalla no quede en blanco.
    return (
      <Stack align="center" justify="center" h="100vh" gap="xs">
        <Text size="xl" fw={700}>Ronda completa</Text>
        <Text size="sm" c="dimmed">
          Aciertos <b className="tabular">{Math.round(accuracy(state) * 100)}%</b>
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap={0} h="100%">
      <Group px="md" py="xs" justify="space-between">
        <Text size="xs" c="dimmed">Kana Drill</Text>
        <Text size="xs" c="dimmed"><Kbd>Esc</Kbd> salir</Text>
      </Group>

      <Box style={{ flex: 1, display: 'grid', placeItems: 'center' }} py="xl">
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
      </Box>

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
