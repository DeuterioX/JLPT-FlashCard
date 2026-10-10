'use client';

import {
  useEffect, useEffectEvent, useRef, useState, type SubmitEvent, type MouseEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { Stack, Group, Text, TextInput, Button, Progress, Paper, Box, Kbd, Center, Loader } from '@mantine/core';
import {
  startRound, submit, reveal, currentCard, isFinished, accuracy,
  type RoundState,
} from '@/lib/quiz/engine';
import { createRoundRecorder, type AttemptBody, type RoundRecorder } from '@/lib/quiz/recorder';
import { useTranslations } from 'next-intl';
import {
  decideRoundStart, markRoundUsed, readUsedRound, type RoundStart, type StoredRound,
} from '@/lib/quiz/stored-round';
import { RoundSummary, type MissEntry } from './RoundSummary';
import { GenkoSheet } from './GenkoSheet';
import { FlipSheet } from './FlipSheet';
import { RoundHeader, useRoundContext } from './RoundHeader';
import { isPhone } from '@/lib/client/screen';
import { readConfirmQuizExit } from '@/lib/client/preferences';
import { celebrate } from '@/lib/client/confetti';
import { ConfirmModal } from '../ConfirmModal';
import styles from './QuizRunner.module.css';

export type Round = StoredRound;

const MEANING_MS = 1200;

// El alto sale del viewport visual: con el teclado abierto en iOS, ninguna
// unidad de CSS (`dvh`, `%`) refleja el espacio que se ve.
function applyVisualViewportInset(el: HTMLElement) {
  const vv = window.visualViewport;
  if (!vv) return;
  const h = `${vv.height}px`;
  el.style.height = h;
  document.documentElement.style.height = h;
  document.body.style.height = h;
  // Corrige una vez el scroll de Safari al enfocar; atarlo al evento de
  // scroll hacía temblar la pantalla.
  if (window.scrollY !== 0) window.scrollTo(0, 0);
}

/**
 * Decide una sola vez por montaje si la ronda guardada reusa su sesión, abre
 * otra o vuelve a estadísticas: una ronda se juega una vez contra su sesión.
 */
export function QuizRunner({ round }: { round: Round }) {
  const [start] = useState(() => decideRoundStart(round, readUsedRound()));
  if (start.kind === 'redirect') return <ReplaceTo href={start.to} />;
  return <QuizPlay round={round} start={start} />;
}

function ReplaceTo({ href }: { href: string }) {
  const router = useRouter();
  useEffect(() => { router.replace(href); }, [router, href]);
  return <Center h="100vh"><Loader /></Center>;
}

function QuizPlay({
  round, start,
}: { round: Round; start: Exclude<RoundStart, { kind: 'redirect' }> }) {
  const t = useTranslations();
  const router = useRouter();
  const [state, setState] = useState<RoundState>(() => startRound(round.cards));
  const [typed, setTyped] = useState('');
  const [confirmExit, setConfirmExit] = useState(false);
  // El Esc que cierra el modal llega después a este listener: sin esta marca,
  // lo volvería a abrir.
  const exitClosing = useRef(false);
  const [flash, setFlash] = useState<'none' | 'wrong'>('none');
  const [shown, setShown] = useState<string | null>(null);
  // Qué cara se ve; aparte de `shown` para ir y volver sin tocar el puntaje.
  const [flipped, setFlipped] = useState(false);
  const [meaning, setMeaning] = useState<string | null>(null);
  const [misses, setMisses] = useState<Record<number, number>>({});
  const [elapsedMs, setElapsedMs] = useState(0);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const quizScreenRef = useRef<HTMLDivElement>(null);
  const shownAt = useRef(0);
  const roundStart = useRef(0);
  const meaningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Un recorder por ronda, con su sesión e intentos en su propio closure: si
  // fueran compartidos, los intentos de una ronda podían caer en otra. Se crea
  // perezoso porque puede abrir una sesión (un POST).
  const recorderRef = useRef<RoundRecorder | null>(null);
  function recorder(): RoundRecorder {
    if (recorderRef.current === null) {
      const r: RoundRecorder = start.kind === 'reuse'
        ? createRoundRecorder({ fetch: (u, i) => fetch(u, i), sessionId: start.sessionId })
        : createRoundRecorder({
          fetch: (u, i) => fetch(u, i),
          groupIds: start.groupIds,
          onFailure: () => {
            if (recorderRef.current === r) setSessionError(t('round.sessionError'));
          },
        });
      recorderRef.current = r;
    }
    return recorderRef.current;
  }
  // Evita que el timer de 6s y una tecla disparen `nextRound` dos veces. Un
  // estado de React llegaría un render tarde para esto; un ref no.
  const continued = useRef(false);

  // Sólo eventos del viewport visual: escuchar el scroll hacía temblar.
  useEffect(() => {
    const el = quizScreenRef.current;
    const vv = window.visualViewport;
    if (!el || !vv) return;
    const onChange = () => applyVisualViewportInset(el);
    onChange();
    vv.addEventListener('resize', onChange);
    // Al enfocar, Safari scrollea para mostrar el input.
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

  // Saca el documento de flujo para que nada viaje con un scroll residual. Lo
  // que frena el gesto en iOS es el `touch-action` de la pantalla.
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
  }, [card?.id]);
  useEffect(() => { shownAt.current = Date.now(); }, [card?.id]);
  useEffect(() => { roundStart.current = Date.now(); }, []);
  useEffect(() => {
    markRoundUsed(round.sessionId);
    recorder();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar
  }, []);

  useEffect(() => () => {
    if (meaningTimer.current) clearTimeout(meaningTimer.current);
  }, []);

  function send(body: AttemptBody) {
    recorder().record(body);
  }

  /** `ms` desde que apareció la carta, o desde el intento anterior sobre ella. */
  function msSinceLast(): number {
    const now = Date.now();
    const ms = now - shownAt.current;
    shownAt.current = now;
    return ms;
  }

  function onSubmit(e: SubmitEvent) {
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

      // El significado de la carta recién acertada, no el de la siguiente.
      if (meaningTimer.current) clearTimeout(meaningTimer.current);
      if (card.meaning) {
        setMeaning(card.meaning);
        meaningTimer.current = setTimeout(() => setMeaning(null), MEANING_MS);
      } else {
        setMeaning(null);
      }

      if (isFinished(r.state)) {
        setElapsedMs(Date.now() - roundStart.current);
        continued.current = false;
        void recorder().finish();
        if (r.state.incorrect === 0) void celebrate();
      }
    } else {
      setState(r.state);
      setTyped('');
      setFlash('wrong');
      setMisses((m) => ({ ...m, [card.id]: (m[card.id] ?? 0) + 1 }));
    }
  }

  function onReveal() {
    if (!card) return;
    // Ya revelada, el botón sólo da vuelta la carta: el error ya se contó.
    if (state.revealedCurrent) {
      setFlipped((f) => !f);
      inputRef.current?.focus();
      return;
    }
    const r = reveal(state);
    setState(r.state);
    setShown(r.answer);
    setFlipped(true);
    // Revelar cuenta como error.
    setMisses((m) => ({ ...m, [card.id]: (m[card.id] ?? 0) + 1 }));
    send({ cardId: card.id, typed: '', isCorrect: false, revealed: true, ms: msSinceLast() });
    inputRef.current?.focus();
  }

  function nextRound() {
    if (continued.current) return;
    continued.current = true;

    if (round.mode === 'review') {
      // Un repaso no se encadena: vuelve a estadísticas cuando la ronda ya
      // quedó guardada, para que /stats la muestre.
      void recorder().finish().finally(() => router.replace('/stats'));
      return;
    }

    // Todo lo síncrono antes de crear el recorder: después de un await se
    // borraría la letra que el usuario ya tipeó para la carta nueva.
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

    // El recorder anterior termina solo. Pendiente: si se sale con Esc antes de
    // terminar esta ronda, su sesión queda abierta.
    const next = createRoundRecorder({
      fetch: (u, i) => fetch(u, i),
      groupIds: round.groupIds,
      onFailure: () => {
        if (recorderRef.current === next) setSessionError(t('round.sessionError'));
      },
    });
    recorderRef.current = next;
  }

  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (confirmExit || exitClosing.current) return;
    if (e.key === 'Escape') {
      if (!isFinished(state) && !isPhone() && readConfirmQuizExit()) {
        setConfirmExit(true);
        return;
      }
      // `replace`: Back desde la home no vuelve a una ronda abandonada.
      router.replace('/');
      return;
    }
    if (isFinished(state)) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!e.repeat) nextRound();
      } else if (e.key === ' ') {
        // Que Espacio no scrollee lo que quedó abajo.
        e.preventDefault();
      }
      return;
    }
    if (e.key === ' ' && typed === '') {
      e.preventDefault();
      if (!e.repeat) onReveal();
    }
  });

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Con la ronda terminada el layout sigue montado y el resumen va encima.
  const finished = isFinished(state);

  // Va dos veces, arriba y en el pie: el CSS elige según el ancho.
  function metricsBox(suffix?: string) {
    const withSuffix = (name: string) => (suffix ? `${name}-${suffix}` : name);
    return (
      <Box id={withSuffix('quiz-metrics')} className="knd-quiz-metrics">
        <Box id={withSuffix('quiz-accuracy')} className="knd-quiz-metric">
          <Text component="span" className="knd-quiz-metric-label">{t('quiz.metrics.accuracy')}</Text>
          <Text component="span" className="knd-quiz-metric-value tabular">
            {Math.round(accuracy(state) * 100)}%
          </Text>
        </Box>
        <Box id={withSuffix('quiz-remaining')} className="knd-quiz-metric">
          <Text component="span" className="knd-quiz-metric-label">{t('quiz.metrics.remaining')}</Text>
          <Text component="span" className="knd-quiz-metric-value tabular">{remaining}</Text>
        </Box>
        <Box id={withSuffix('quiz-errors')} className="knd-quiz-metric">
          <Text component="span" className="knd-quiz-metric-label">{t('quiz.metrics.errors')}</Text>
          <Text component="span" className="knd-quiz-metric-value tabular knd-error">
            {state.incorrect}
          </Text>
        </Box>
      </Box>
    );
  }

  const contextLabel = useRoundContext(round.deckName, round.groupIds.length);

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
      className={styles.round}
      onMouseDown={keepInputFocused}
    >
      <RoundHeader
        id="quiz-header" brandId="quiz-brand" nameId="quiz-app-name"
        title={t('practice.beginWriting')}
        context={contextLabel}
        onExit={() => router.replace('/')}
      />

      <Box
        id="quiz-stage"
        pos="relative"
        className={`knd-round-stage ${styles.stage}`}
        /* En teléfono, tocar la carta la da vuelta. El `preventDefault` del
           puntero evita que el input pierda el foco y se cierre el teclado. */
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
          // Ancla del aviso de error, que va pegado al kana.
          <Box pos="relative" className={styles.quizKanaWrap}>
            {/* `key` por carta: la carta nueva entra de frente, sin animar. Ver
                `FlipSheet`. */}
            <FlipSheet
              key={card.id}
              flipped={flipped}
              readingId="quiz-revealed-answer"
              meaningId="quiz-revealed-meaning"
              reading={shown ?? card.primary}
              meaning={card.meaning}
              front={
                <GenkoSheet
                  id="quiz-kana"
                  testId="quiz-prompt"
                  text={card.prompt}
                  tone={flash === 'wrong' ? 'var(--mantine-color-shu-6)' : undefined}
                />
              }
            />
            {/* Significado y aviso de error, en absoluto para no correr el kana. */}
            <Stack id="quiz-under-kana" className={styles.quizUnder} align="center" gap={5}>
              {!flipped && (
                <Text className="knd-tap-hint knd-phone-only">{t('quiz.tapToReveal')}</Text>
              )}
              {meaning && <Text id="quiz-meaning" size="sm" c="jade.6">{meaning}</Text>}
              {flash === 'wrong' && (
                <Text id="quiz-wrong-hint" className={styles.quizToast}>
                  {t('quiz.wrong')}
                </Text>
              )}
            </Stack>
          </Box>
        )}
        {card && (
          <Text id="quiz-caption" className="knd-quiz-caption tabular">
            {t('quiz.caption', { n: total - remaining + 1, total })}
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
        <Text id="quiz-session-error" size="xs" className="knd-error" ta="center" py={4}>{sessionError}</Text>
      )}

      <Progress id="quiz-progress" value={progress} size="xs" radius={0} />

      {/* Debajo de 800px las métricas van en su propia barra. */}
      <Box id="quiz-metrics-top-bar" className={styles.quizMetricsTopBar}>
        {metricsBox('top')}
      </Box>

      <Paper id="quiz-footer" withBorder radius={0} p="sm" className={styles.footerPaper}>
        <Box className={styles.quizFooter}>
          {metricsBox()}

          <form id="quiz-answer-form" className={styles.quizAnswerForm} onSubmit={onSubmit}>
            <TextInput
              ref={inputRef}
              id="answer-input"
              className={styles.quizAnswer}
              value={typed}
              // Un Enter mantenido no reenvía: mandaría respuestas vacías como errores.
              onKeyDown={(e) => { if (e.key === 'Enter' && e.repeat) e.preventDefault(); }}
              onChange={(e) => {
                setTyped(e.currentTarget.value);
                if (flash === 'wrong') setFlash('none');
                // Escribir vuelve al kana: se escribe mirando el signo.
                if (flipped) setFlipped(false);
              }}
              placeholder={t('quiz.placeholder')}
              // El centrado del texto está en `.quizAnswer` (`--input-text-align`).
              error={flash === 'wrong'}
              // Sin autocorrección: iOS cambiaría «ka» por «Ka».
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
              autoComplete="off"
            />
          </form>

          <Group className={styles.quizReveal} gap="0.375rem" wrap="nowrap">
            <Text size="0.59375rem" c="dark.3">
              <Kbd>{t('keys.space')}</Kbd>
            </Text>
            <Button id="reveal-btn" variant="default" size="compact-sm" onClick={onReveal}>
              {flipped ? t('quiz.hide') : t('quiz.reveal')}
            </Button>
          </Group>
        </Box>
      </Paper>

      <ConfirmModal
        id="quiz-exit-modal"
        opened={confirmExit}
        onClose={() => {
          setConfirmExit(false);
          exitClosing.current = true;
          setTimeout(() => { exitClosing.current = false; });
        }}
        onClosed={() => inputRef.current?.focus()}
        jp="退"
        title={t('round.exitModal.title')}
        confirm={t('round.exitModal.confirm')}
        confirmId="quiz-exit-confirm"
        enterConfirms
        // El quiz ya bloquea el scroll; el del modal le cambiaba el ancho.
        lockScroll={false}
        onConfirm={async () => { router.replace('/'); }}
      >
        {t('round.exitModal.body', { remaining })}
      </ConfirmModal>
    </Stack>
  );
}
