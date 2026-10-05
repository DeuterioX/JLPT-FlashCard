'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, Group, Kbd, Paper, Progress, Stack, Text } from '@mantine/core';
import { GenkoSheet } from './GenkoSheet';
import { RoundSummary, type MissEntry } from './RoundSummary';
import { RoundHeader, roundContext } from './RoundHeader';
import { createRoundRecorder, SESSION_ERROR_MSG } from '@/lib/quiz/recorder';
import {
  decideRoundStart, markRoundUsed, readUsedRound, type StoredRound,
} from '@/lib/quiz/stored-round';
import { isPhone } from '@/lib/client/screen';
import styles from './MeaningRunner.module.css';

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
  const [revealed, setRevelado] = useState(false);
  const [known, setKnown] = useState(0);
  const [unknown, setUnknown] = useState(0);
  const [startedAt] = useState(() => Date.now());
  const [endedAt, setFin] = useState<number | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const sinceRef = useRef(Date.now());

  const recorder = useMemo(() => {
    // La decisión de reusar la sesión o abrir una nueva sale de
    // `decideRoundStart`, el mismo que usa el quiz. Antes estaba reescrita
    // acá a mano, y la copia había perdido dos cosas: el `try/catch` sobre
    // `sessionStorage` -que en una ventana privada tira y se llevaba puesta
    // la pantalla entera- y el aviso de sesión caída.
    const startedAt = decideRoundStart(round, readUsedRound());
    markRoundUsed(round.sessionId);
    return createRoundRecorder({
      fetch: (...a) => fetch(...a),
      ...(startedAt.kind === 'reuse'
        ? { sessionId: startedAt.sessionId }
        : { groupIds: round.groupIds }),
      // Sin esto, una sesión que no se puede abrir falla EN SILENCIO: el
      // recorder se queda en `failed`, tira el buffer y nadie se entera. O sea
      // que calificabas la ronda entera y no se guardaba nada. El quiz sí lo
      // pasaba desde el principio; acá faltaba, y faltaba porque las dos
      // pantallas comparten esta parte por copia y no por abstracción.
      onFailure: () => setSessionError(SESSION_ERROR_MSG),
    });
    // `round` entera y no dos campos sueltos: `decideRoundStart` también mira
    // el modo. Es un objeto estable -viene de `sessionStorage`, parseado una
    // vez por `app/quiz/page.tsx`- así que no recrea el recorder por render.
  }, [round]);

  const card = cards[i];
  const finished = i >= cards.length;
  const remaining = cards.length - i;

  function grade(knewIt: boolean) {
    if (!card) return;
    recorder.record({
      cardId: card.id,
      // Sin nada tecleado y con la respuesta a la vista: `revealed` es lo que
      // separa «lo supe» de «lo adiviné escribiendo» al mirar las métricas.
      typed: '',
      isCorrect: knewIt,
      revealed: true,
      ms: Date.now() - sinceRef.current,
    });
    if (knewIt) setKnown((n) => n + 1); else setUnknown((n) => n + 1);
    sinceRef.current = Date.now();
    setRevelado(false);
    setI((n) => n + 1);
    // La ronda se cierra ACÁ y no en un efecto que mire `finished`: es un
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
      if (finished) return;
      if (e.key === ' ') { e.preventDefault(); setRevelado((v) => !v); return; }
      // 1 y 2 son la POSICIÓN de cada botón, no su respuesta: el 1 es el de
      // la izquierda, que es «La sabía».
      if (e.key === '1') { e.preventDefault(); grade(true); return; }
      if (e.key === '2') { e.preventDefault(); grade(false); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const context = roundContext(round.deckName, round.groupIds.length);
  const progress = cards.length === 0 ? 0 : (i / cards.length) * 100;

  return (
    <Box className={styles.round}>
      <RoundHeader id="meaning-header" context={context} onExit={() => router.replace('/')} />

      <Box
        id="meaning-stage"
        className={`knd-round-stage ${styles.stage}`}
        /* En teléfono el escenario ES el interruptor de revelar: el botón se
           esconde y el toque sobre la carta muestra y tapa el significado.
           Sigue siendo un interruptor, como el botón que reemplaza. */
        onClick={() => {
          if (finished) return;
          if (!isPhone()) return;
          setRevelado((v) => !v);
        }}
      >
        {card && (
          <>
            <GenkoSheet id="meaning-kana" testId="meaning-prompt" text={card.prompt} />
            {/* El hueco está reservado también sin revelar: si apareciera de
                la nada, la hoja saltaría hacia arriba al revelar. */}
            {/* La respuesta está SIEMPRE montada y se esconde con
                `visibility`, no se agrega al revelar. Montándola, el hueco
                mide lo que mide ella -y un significado largo mide más que el
                mínimo reservado-, así que al revelar la columna crecía y la
                hoja pegaba un salto: medido, 18,5px hacia arriba con
                «Disculpe (se utiliza al comienzo de una expresión…)». Ahora el
                hueco ya tiene el alto correcto desde antes y no se mueve nada.

                `visibility` y no `opacity`: saca el texto del árbol de
                accesibilidad, así un lector de pantalla no canta la respuesta
                antes de que la pidas. */}
            <Stack
              className={styles.meaningSlot} gap={2} align="center" justify="center"
              data-oculto={!revealed || undefined}
            >
              <Text id="meaning-reading" className={`romaji ${styles.meaningReading}`} c="dimmed">
                {card.primary}
              </Text>
              <Text id="meaning-answer" className={styles.meaningAnswer}>{card.meaning}</Text>
            </Stack>
            <Text id="meaning-caption" className="knd-quiz-caption tabular">
              {`carta ${i + 1} de ${cards.length}`}
            </Text>
            {/* El botón de revelar no está en teléfono, así que algo tiene que
                decir que la carta se toca. Sólo mientras está tapada: una vez
                revelada, que se vuelva a tocar para ocultar ya se deduce.

                Se ESCONDE, no se desmonta. Acá la pista está en el flujo de la
                columna -a diferencia del quiz, donde el bloque que cuelga del
                kana es absoluto-, así que sacarla del árbol le cambia el alto
                al contenido centrado y la hoja da un salto: medido, 15,7px
                hacia abajo al revelar. Escondida ocupa lo mismo y no mueve
                nada, y `visibility` igual la saca del árbol de accesibilidad,
                que es lo que importa para que no se lea una instrucción que ya
                no aplica. */}
            <Text className="knd-tap-hint knd-phone-only" data-oculto={revealed || undefined}>
              tocá la carta para revelar
            </Text>
          </>
        )}
        {finished && (
          <RoundSummary
            state={{ queue: [], correct: known, incorrect: unknown, revealedCurrent: false }}
            elapsedMs={(endedAt ?? Date.now()) - startedAt}
            mode="meaning"
            misses={[] as MissEntry[]}
          />
        )}
      </Box>

      {sessionError && (
        <Text id="meaning-session-error" size="xs" className="knd-error" ta="center" py={4}>
          {sessionError}
        </Text>
      )}

      <Progress id="meaning-progress" value={progress} size="xs" radius={0} />

      <Paper id="meaning-footer-paper" withBorder radius={0} p="sm" className={styles.footerPaper}>
        <Box className={styles.meaningFooter}>
          <Group id="meaning-metrics" className="knd-quiz-metrics" gap={0} wrap="nowrap">
            {[['Sabidas', known, false], ['Restantes', remaining, false], ['No sabidas', unknown, true]]
              .map(([lab, val, bad]) => (
                <Box key={lab as string} className="knd-quiz-metric">
                  <Text className="knd-quiz-metric-label">{lab as string}</Text>
                  <Text className="knd-quiz-metric-value tabular" data-bad={bad && Number(val) > 0 ? '' : undefined}>
                    {val as number}
                  </Text>
                </Box>
              ))}
          </Group>

          {/* El centro es siempre lo que hay que hacer ahora -donde el quiz
              tiene el input-, y la derecha con qué tecla, que es la misma
              ranura donde el quiz pone Revelar. */}
          {/* «La sabía» va primero, y por lo tanto se queda con el 1: la tecla
              la da la POSICIÓN, no la respuesta -1 es «el primero de los dos»-,
              que es justamente el motivo por el que son números y no iniciales.
              Y primero va la respuesta afirmativa porque es la esperada: en un
              repaso la mayoría de las cartas se saben, así que el camino corto
              tiene que ser ése. El destructivo-ish queda segundo, igual que
              Cancelar antes de la acción en los modales. */}
          <Group className={styles.meaningActions} gap="xs" wrap="nowrap">
            <Kbd className="knd-desktop-only">1</Kbd>
            <Button id="meaning-si" onClick={() => grade(true)} disabled={finished}>
              La sabía
            </Button>
            <Kbd className="knd-desktop-only">2</Kbd>
            <Button
              id="meaning-no" color="shu" onClick={() => grade(false)}
              disabled={finished}
            >
              No la sabía
            </Button>
          </Group>

          <Group className={styles.meaningReveal} gap="xs" wrap="nowrap">
            <Kbd className="knd-desktop-only">Espacio</Kbd>
            <Button
              id="meaning-reveal" variant="default"
              onClick={() => setRevelado((v) => !v)}
              disabled={finished}
            >
              {revealed ? 'Ocultar' : 'Revelar'}
            </Button>
          </Group>
        </Box>
      </Paper>
    </Box>
  );
}
