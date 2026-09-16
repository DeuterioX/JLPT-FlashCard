import { describe, it, expect } from 'vitest';
import {
  startRound, submit, reveal, currentCard, isFinished, accuracy, shuffle,
  type QuizCard,
} from '../../lib/quiz/engine';

const card = (id: number, prompt: string, ...answers: string[]): QuizCard => ({
  id, prompt, meaning: null, answers, primary: answers[0],
});

const DECK = [card(1, 'か', 'ka'), card(2, 'し', 'shi', 'si'), card(3, 'ね', 'ne')];

/** RNG determinístico para que el barajado sea reproducible. */
const seeded = (seed: number) => () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};

describe('shuffle', () => {
  it('conserva todos los elementos', () => {
    const out = shuffle(DECK, seeded(1));
    expect(out).toHaveLength(3);
    expect(out.map((c) => c.id).sort()).toEqual([1, 2, 3]);
  });

  it('no muta el array original', () => {
    const original = [...DECK];
    shuffle(DECK, seeded(7));
    expect(DECK).toEqual(original);
  });
});

describe('ronda', () => {
  it('arranca con todas las cartas y los contadores en cero', () => {
    const s = startRound(DECK, seeded(1));
    expect(s.queue).toHaveLength(3);
    expect(s.correct).toBe(0);
    expect(s.incorrect).toBe(0);
    expect(isFinished(s)).toBe(false);
  });

  it('al acertar saca la carta y avanza', () => {
    const s = startRound([card(1, 'か', 'ka')], seeded(1));
    const r = submit(s, 'ka');
    expect(r.outcome).toBe('correct');
    expect(r.state.correct).toBe(1);
    expect(r.state.queue).toHaveLength(0);
    expect(isFinished(r.state)).toBe(true);
  });

  it('al errar deja la carta en su lugar y no la re-encola', () => {
    const s = startRound(DECK, seeded(1));
    const first = currentCard(s)!;
    const r = submit(s, 'zzz');

    expect(r.outcome).toBe('incorrect');
    expect(r.state.incorrect).toBe(1);
    expect(r.state.queue).toHaveLength(3);
    // La MISMA carta sigue al frente: no avanza hasta acertarla.
    expect(currentCard(r.state)!.id).toBe(first.id);
  });

  it('acepta cualquiera de las romanizaciones', () => {
    const s = startRound([card(2, 'し', 'shi', 'si')], seeded(1));
    expect(submit(s, 'si').outcome).toBe('correct');
    expect(submit(s, 'shi').outcome).toBe('correct');
  });

  it('revelar cuenta como error y deja la carta', () => {
    const s = startRound([card(1, 'か', 'ka')], seeded(1));
    const r = reveal(s);
    expect(r.answer).toBe('ka');
    expect(r.state.incorrect).toBe(1);
    expect(r.state.revealedCurrent).toBe(true);
    expect(r.state.queue).toHaveLength(1);
  });

  it('limpia la marca de revelado al pasar de carta', () => {
    let s = startRound([card(1, 'か', 'ka'), card(3, 'ね', 'ne')], seeded(1));
    s = reveal(s).state;
    expect(s.revealedCurrent).toBe(true);
    s = submit(s, currentCard(s)!.primary).state;
    expect(s.revealedCurrent).toBe(false);
  });

  it('una ronda entera termina en cero restantes', () => {
    let s = startRound(DECK, seeded(1));
    while (!isFinished(s)) s = submit(s, currentCard(s)!.primary).state;
    expect(s.correct).toBe(3);
    expect(s.queue).toHaveLength(0);
  });

  it('calcula accuracy sobre intentos, no sobre cartas', () => {
    let s = startRound([card(1, 'か', 'ka')], seeded(1));
    s = submit(s, 'zzz').state;   // 1 error
    s = submit(s, 'ka').state;    // 1 acierto
    expect(accuracy(s)).toBeCloseTo(0.5);
  });

  it('accuracy es 1 antes del primer intento, no NaN', () => {
    expect(accuracy(startRound(DECK, seeded(1)))).toBe(1);
  });

  it('submit en una ronda terminada no altera los contadores', () => {
    // Conducir la ronda a su fin respondiendo correctamente todas las cartas.
    let s = startRound([card(1, 'か', 'ka')], seeded(1));
    while (!isFinished(s)) s = submit(s, currentCard(s)!.primary).state;

    // En este punto, la ronda está terminada.
    expect(isFinished(s)).toBe(true);
    const finishedState = s;

    // Intentar submit en una ronda terminada: no debe cambiar nada.
    const r = submit(finishedState, 'cualquier respuesta');
    expect(r.state.correct).toBe(finishedState.correct);
    expect(r.state.incorrect).toBe(finishedState.incorrect);
    expect(r.state.queue).toEqual(finishedState.queue);
    expect(r.state.queue).toHaveLength(0);
  });

  it('reveal en una ronda terminada no altera los contadores', () => {
    // Conducir la ronda a su fin respondiendo correctamente todas las cartas.
    let s = startRound([card(1, 'か', 'ka'), card(2, 'し', 'shi')], seeded(1));
    while (!isFinished(s)) s = submit(s, currentCard(s)!.primary).state;

    // En este punto, la ronda está terminada.
    expect(isFinished(s)).toBe(true);
    const finishedState = s;

    // Intentar reveal en una ronda terminada: no debe cambiar nada.
    const r = reveal(finishedState);
    expect(r.state.correct).toBe(finishedState.correct);
    expect(r.state.incorrect).toBe(finishedState.incorrect);
    expect(r.state.queue).toEqual(finishedState.queue);
    expect(r.state.queue).toHaveLength(0);
  });
});
