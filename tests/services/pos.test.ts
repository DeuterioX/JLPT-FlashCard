import { describe, it, expect } from 'vitest';
import { posCategory } from '../../lib/services/pos';

describe('posCategory', () => {
  it('traduce los códigos más frecuentes', () => {
    expect(posCategory('n')).toBe('noun');
    expect(posCategory('exp')).toBe('expression');
    expect(posCategory('adv')).toBe('adverb');
    expect(posCategory('prt')).toBe('particle');
  });

  it('junta todas las clases de verbo en una sola label', () => {
    for (const c of ['v1', 'v5r', 'v5s', 'vs-i', 'vk', 'vz', 'v2a-s', 'v4r', 'v5k-s']) {
      expect(posCategory(c)).toBe('verb');
    }
  });

  it('conserva la distinción -i / -na de los adjetivos', () => {
    expect(posCategory('adj-i')).toBe('adjI');
    expect(posCategory('adj-na')).toBe('adjNa');
    // El resto de las familias de adjetivo no cambian cómo se usa la palabra.
    expect(posCategory('adj-no')).toBe('adjective');
    expect(posCategory('adj-nari')).toBe('adjective');
  });

  it('no inventa una label cuando el código no dice nada', () => {
    expect(posCategory('unc')).toBeNull();
    expect(posCategory(null)).toBeNull();
    expect(posCategory('')).toBeNull();
    expect(posCategory('xyz')).toBeNull();
  });
});
