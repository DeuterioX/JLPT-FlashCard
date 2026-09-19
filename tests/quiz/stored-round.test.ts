import { describe, it, expect } from 'vitest';
import { decideRoundStart, parseStoredRound } from '../../lib/quiz/stored-round';

const cards = [{ id: 1, prompt: 'か', meaning: null, answers: ['ka'], primary: 'ka' }];
const normal = { sessionId: 7, groupIds: [3, 4], cards, mode: 'normal' as const };
const review = { sessionId: 9, groupIds: [5], cards, mode: 'review' as const };

describe('parseStoredRound', () => {
  it('lee una ronda válida', () => {
    expect(parseStoredRound(JSON.stringify(review))).toEqual(review);
  });

  it('toma como normal una ronda vieja sin `mode`', () => {
    const old: Partial<typeof normal> = { ...normal };
    delete old.mode;
    expect(parseStoredRound(JSON.stringify(old))?.mode).toBe('normal');
  });

  it('descarta JSON roto o incompleto', () => {
    expect(parseStoredRound('{')).toBeNull();
    expect(parseStoredRound('null')).toBeNull();
    expect(parseStoredRound(JSON.stringify({ ...normal, groupIds: ['x'] }))).toBeNull();
    expect(parseStoredRound(JSON.stringify({ ...normal, sessionId: '7' }))).toBeNull();
  });
});

describe('decideRoundStart', () => {
  it('ronda normal sin usar: reusa la sesión que ya abrió el server', () => {
    expect(decideRoundStart(normal, null)).toEqual({ kind: 'reuse', sessionId: 7 });
  });

  it('ronda normal ya usada: abre una sesión nueva para los mismos grupos', () => {
    expect(decideRoundStart(normal, '7')).toEqual({ kind: 'fresh', groupIds: [3, 4] });
  });

  it('repaso sin usar: reusa la sesión', () => {
    expect(decideRoundStart(review, null)).toEqual({ kind: 'reuse', sessionId: 9 });
  });

  it('repaso ya usado: vuelve a estadísticas', () => {
    expect(decideRoundStart(review, '9')).toEqual({ kind: 'redirect', to: '/stats' });
  });

  it('una marca de OTRA ronda no cuenta como usada', () => {
    expect(decideRoundStart(normal, '6')).toEqual({ kind: 'reuse', sessionId: 7 });
    expect(decideRoundStart(review, '7')).toEqual({ kind: 'reuse', sessionId: 9 });
  });

  it('una ronda vieja sin `mode`, ya usada, arranca fresca (no redirige)', () => {
    const old: Partial<typeof normal> = { ...normal };
    delete old.mode;
    const parsed = parseStoredRound(JSON.stringify(old))!;
    expect(decideRoundStart(parsed, '7')).toEqual({ kind: 'fresh', groupIds: [3, 4] });
    expect(decideRoundStart(parsed, null)).toEqual({ kind: 'reuse', sessionId: 7 });
  });
});
