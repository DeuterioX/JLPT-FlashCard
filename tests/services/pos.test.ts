import { describe, it, expect } from 'vitest';
import { posInSpanish } from '../../lib/services/pos';

describe('posInSpanish', () => {
  it('traduce los códigos más frecuentes', () => {
    expect(posInSpanish('n')).toBe('sustantivo');
    expect(posInSpanish('exp')).toBe('expresión');
    expect(posInSpanish('adv')).toBe('adverbio');
    expect(posInSpanish('prt')).toBe('partícula');
  });

  it('junta todas las clases de verbo en una sola label', () => {
    for (const c of ['v1', 'v5r', 'v5s', 'vs-i', 'vk', 'vz', 'v2a-s', 'v4r', 'v5k-s']) {
      expect(posInSpanish(c)).toBe('verbo');
    }
  });

  it('conserva la distinción -i / -na de los adjetivos', () => {
    expect(posInSpanish('adj-i')).toBe('adjetivo -i');
    expect(posInSpanish('adj-na')).toBe('adjetivo -na');
    // El resto de las familias de adjetivo no cambian cómo se usa la palabra.
    expect(posInSpanish('adj-no')).toBe('adjetivo');
    expect(posInSpanish('adj-nari')).toBe('adjetivo');
  });

  it('no inventa una label cuando el código no dice nada', () => {
    expect(posInSpanish('unc')).toBeNull();
    expect(posInSpanish(null)).toBeNull();
    expect(posInSpanish('')).toBeNull();
    expect(posInSpanish('xyz')).toBeNull();
  });
});
