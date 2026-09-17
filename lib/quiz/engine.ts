import { matchesAnswer } from '../kana/normalize';

export type QuizCard = {
  id: number;
  prompt: string;
  meaning: string | null;
  answers: string[];
  primary: string;
};

export type RoundState = {
  /** Cartas que faltan. La actual es queue[0]. */
  queue: QuizCard[];
  correct: number;
  incorrect: number;
  /**
   * Si ya se reveló la carta actual. Solo evita que revelar dos veces la
   * misma carta cuente dos errores (`reveal` no hace nada la segunda vez);
   * no cambia cómo se cuenta el acierto que venga después, que suma como
   * cualquier otro. Se apaga al acertar y pasar de carta.
   */
  revealedCurrent: boolean;
};

/** Fisher-Yates. El rng es inyectable para que los tests sean reproducibles. */
export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function startRound(cards: QuizCard[], rng: () => number = Math.random): RoundState {
  return { queue: shuffle(cards, rng), correct: 0, incorrect: 0, revealedCurrent: false };
}

export function currentCard(state: RoundState): QuizCard | null {
  return state.queue[0] ?? null;
}

export function isFinished(state: RoundState): boolean {
  return state.queue.length === 0;
}

/** Aciertos sobre intentos totales. 1 cuando todavía no hubo ninguno. */
export function accuracy(state: RoundState): number {
  const total = state.correct + state.incorrect;
  return total === 0 ? 1 : state.correct / total;
}

export function submit(
  state: RoundState,
  typed: string,
): { state: RoundState; outcome: 'correct' | 'incorrect' } {
  const card = currentCard(state);
  if (!card) return { state, outcome: 'incorrect' };

  if (!matchesAnswer(typed, card.answers)) {
    // La carta NO se re-encola: se queda al frente hasta que se acierte.
    return { state: { ...state, incorrect: state.incorrect + 1 }, outcome: 'incorrect' };
  }

  return {
    state: {
      queue: state.queue.slice(1),
      correct: state.correct + 1,
      incorrect: state.incorrect,
      revealedCurrent: false,
    },
    outcome: 'correct',
  };
}

/** Revelar cuenta como error: si no, la métrica mentiría. */
export function reveal(state: RoundState): { state: RoundState; answer: string } {
  const card = currentCard(state);
  if (!card) return { state, answer: '' };
  // Revelar dos veces la misma carta es un solo error.
  if (state.revealedCurrent) return { state, answer: card.primary };
  return {
    state: { ...state, incorrect: state.incorrect + 1, revealedCurrent: true },
    answer: card.primary,
  };
}
