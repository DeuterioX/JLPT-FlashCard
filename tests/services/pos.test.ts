import { describe, it, expect } from 'vitest';
import { posEnCastellano } from '../../lib/services/pos';

describe('posEnCastellano', () => {
  it('traduce los códigos más frecuentes', () => {
    expect(posEnCastellano('n')).toBe('sustantivo');
    expect(posEnCastellano('exp')).toBe('expresión');
    expect(posEnCastellano('adv')).toBe('adverbio');
    expect(posEnCastellano('prt')).toBe('partícula');
  });

  it('junta todas las clases de verbo en una sola etiqueta', () => {
    for (const c of ['v1', 'v5r', 'v5s', 'vs-i', 'vk', 'vz', 'v2a-s', 'v4r', 'v5k-s']) {
      expect(posEnCastellano(c)).toBe('verbo');
    }
  });

  it('conserva la distinción -i / -na de los adjetivos', () => {
    expect(posEnCastellano('adj-i')).toBe('adjetivo -i');
    expect(posEnCastellano('adj-na')).toBe('adjetivo -na');
    // El resto de las familias de adjetivo no cambian cómo se usa la palabra.
    expect(posEnCastellano('adj-no')).toBe('adjetivo');
    expect(posEnCastellano('adj-nari')).toBe('adjetivo');
  });

  it('no inventa una etiqueta cuando el código no dice nada', () => {
    expect(posEnCastellano('unc')).toBeNull();
    expect(posEnCastellano(null)).toBeNull();
    expect(posEnCastellano('')).toBeNull();
    expect(posEnCastellano('xyz')).toBeNull();
  });
});
