'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, Group, Kbd, Paper, Progress, Stack, Text } from '@mantine/core';
import { Brand } from '../Brand';
import { GenkoSheet } from './GenkoSheet';
import { RoundSummary, type MissEntry } from './RoundSummary';
import { createRoundRecorder } from '@/lib/quiz/recorder';
import { USED_ROUND_KEY, type StoredRound } from '@/lib/quiz/stored-round';

/**
 * Repaso de significados: la misma hoja del quiz, sin escribir.
 *
 * El quiz pregunta CÓMO SE LEE una carta y se valida escribiendo el romaji.
 * Esto pregunta QUÉ QUIERE DECIR, y eso no se puede teclear: «Estudiante»,
 * «Empleado de empresa» y «Estados unidos» no son respuestas que una caja de
 * texto pueda dar por buenas. Así que la carta se revela y te calificás vos,
 * que es el trato de cualquier flashcard.
 *
 * La hoja NO se da vuelta. El giro del quiz es para cuando el kana se va y
 * entra la respuesta en su lugar; acá querés ver la palabra AL LADO de su
 * significado, porque eso es lo que estás tratando de unir. El hueco donde
 * cae está reservado también sin revelar, así la hoja no salta al aparecer.
 *
 * Revelar es un INTERRUPTOR y está siempre: en un repaso querés poder tapar
 * la respuesta y volver a mirarla sin salir de la carta. Y los dos de
 * calificarse están desde el principio: si te acordabas, calificás sin
 * revelar nada.
 */
export function MeaningRunner({ round }: { round: StoredRound }) {
  const router = useRouter();

  // Una carta ya vista no vuelve: acá no hay «la carta se queda hasta que
  // aciertes» como en el quiz, porque no hay acierto que validar. Se recorre
  // la lista una vez y listo.
  const cards = round.cards;
  const [i, setI] = useState(0);
  const [revelado, setRevelado] = useState(false);
  const [sabidas, setSabidas] = useState(0);
  const [noSabidas, setNoSabidas] = useState(0);
  const [inicio] = useState(() => Date.now());
  const [fin, setFin] = useState<number | null>(null);
  const desdeRef = useRef(Date.now());

  const recorder = useMemo(() => {
    // La marca de «ronda ya usada» es la misma del quiz: un Back o una
    // recarga no pueden volver a escribir sobre una sesión ya cerrada.
    const usada = sessionStorage.getItem(USED_ROUND_KEY) === String(round.sessionId);
    sessionStorage.setItem(USED_ROUND_KEY, String(round.sessionId));
    return createRoundRecorder({
      fetch: (...a) => fetch(...a),
      ...(usada ? { groupIds: round.groupIds } : { sessionId: round.sessionId }),
    });
  }, [round.sessionId, round.groupIds]);

  const card = cards[i];
  const terminada = i >= cards.length;
  const restantes = cards.length - i;

  function calificar(supo: boolean) {
    if (!card) return;
    recorder.record({
      cardId: card.id,
      // Sin nada tecleado y con la respuesta a la vista: `revealed` es lo que
      // separa «lo supe» de «lo adiviné escribiendo» al mirar las métricas.
      typed: '',
      isCorrect: supo,
      revealed: true,
      ms: Date.now() - desdeRef.current,
    });
    if (supo) setSabidas((n) => n + 1); else setNoSabidas((n) => n + 1);
    desdeRef.current = Date.now();
    setRevelado(false);
    setI((n) => n + 1);
    // La ronda se cierra ACÁ y no en un efecto que mire `terminada`: es un
    // manejador, no una sincronización con un sistema externo, y desde un
    // efecto React marca el `setState` como render en cascada. Además el
    // instante que interesa es el de la última calificación, no el del
    // render que viene después.
    if (i + 1 >= cards.length) {
      setFin(Date.now());
      void recorder.finish();
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { router.replace('/'); return; }
      if (terminada) return;
      if (e.key === ' ') { e.preventDefault(); setRevelado((v) => !v); return; }
      if (e.key === '1') { e.preventDefault(); calificar(false); return; }
      if (e.key === '2') { e.preventDefault(); calificar(true); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const contexto = [round.deckName, `${round.groupIds.length} ${round.groupIds.length === 1 ? 'grupo' : 'grupos'}`]
    .filter(Boolean).join(' · ');
  const progreso = cards.length === 0 ? 0 : (i / cards.length) * 100;

  return (
    <Box style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <Group
        id="meaning-header"
        px="md" py={4} justify="space-between" bg="dark.6"
        style={{ borderBottom: '1px solid var(--mantine-color-dark-4)', flexShrink: 0 }}
      >
        <Brand />
        {/* `Group` con `gap`, no texto suelto con espacios: un espacio pegado
            al cierre de un tag puede colapsar a ancho CERO (ver CLAUDE.md). */}
        <Group gap="0.5rem" wrap="nowrap">
          {contexto && <Text size="xs" c="dimmed">{`${contexto} ·`}</Text>}
          {/* En teléfono no hay teclado físico, así que la tecla no se
              anuncia: sería prometer algo que no se puede apretar. */}
          <Kbd className="knd-solo-escritorio">Esc</Kbd>
          <Text size="xs" c="dimmed">salir</Text>
        </Group>
      </Group>

      <Box
        id="meaning-stage"
        style={{
          flex: 1, minHeight: 0, containerType: 'size', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: '1rem', position: 'relative',
          background: 'radial-gradient(ellipse 70% 55% at 50% 50%, var(--mantine-color-dark-6), var(--mantine-color-dark-7) 100%)',
        }}
      >
        {card && (
          <>
            <GenkoSheet id="meaning-kana" testId="meaning-prompt" text={card.prompt} />
            {/* El hueco está reservado también sin revelar: si apareciera de
                la nada, la hoja saltaría hacia arriba al revelar. */}
            <Stack className="knd-meaning-slot" gap={2} align="center" justify="center">
              {revelado && (
                <>
                  <Text id="meaning-reading" className="romaji" size="sm" c="dimmed">{card.primary}</Text>
                  <Text id="meaning-answer" style={{ fontSize: 'clamp(1.0625rem, min(5.5vw, 11cqh), 32px)', lineHeight: 1.25 }}>
                    {card.meaning}
                  </Text>
                </>
              )}
            </Stack>
            <Text id="meaning-caption" className="knd-quiz-caption tabular">
              {`carta ${i + 1} de ${cards.length}`}
            </Text>
          </>
        )}
        {terminada && (
          <RoundSummary
            state={{ queue: [], correct: sabidas, incorrect: noSabidas, revealedCurrent: false }}
            elapsedMs={(fin ?? Date.now()) - inicio}
            mode="meaning"
            misses={[] as MissEntry[]}
          />
        )}
      </Box>

      <Progress id="meaning-progress" value={progreso} size="xs" radius={0} />

      <Paper withBorder radius={0} p="sm" style={{ borderLeft: 0, borderRight: 0, borderBottom: 0, flexShrink: 0 }}>
        <Box className="knd-meaning-footer">
          <Group id="meaning-metrics" className="knd-quiz-metrics" gap={0} wrap="nowrap">
            {[['Sabidas', sabidas, false], ['Restantes', restantes, false], ['No sabidas', noSabidas, true]]
              .map(([lab, val, mal]) => (
                <Box key={lab as string} className="knd-quiz-metric">
                  <Text className="knd-quiz-metric-label">{lab as string}</Text>
                  <Text className="knd-quiz-metric-value tabular" c={mal && Number(val) > 0 ? 'shu.6' : undefined}>
                    {val as number}
                  </Text>
                </Box>
              ))}
          </Group>

          {/* El centro es siempre lo que hay que hacer ahora -donde el quiz
              tiene el input-, y la derecha con qué tecla, que es la misma
              ranura donde el quiz pone Revelar. */}
          <Group className="knd-meaning-actions" gap="xs" wrap="nowrap">
            <Kbd className="knd-solo-escritorio">1</Kbd>
            <Button
              id="meaning-no" color="shu" onClick={() => calificar(false)}
              disabled={terminada}
            >
              No la sabía
            </Button>
            <Kbd className="knd-solo-escritorio">2</Kbd>
            <Button id="meaning-si" onClick={() => calificar(true)} disabled={terminada}>
              La sabía
            </Button>
          </Group>

          <Group className="knd-meaning-reveal" gap="xs" wrap="nowrap">
            <Kbd className="knd-solo-escritorio">Espacio</Kbd>
            <Button
              id="meaning-reveal" variant="default"
              onClick={() => setRevelado((v) => !v)}
              disabled={terminada}
            >
              {revelado ? 'Ocultar' : 'Revelar'}
            </Button>
          </Group>
        </Box>
      </Paper>
    </Box>
  );
}
