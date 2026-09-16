import { describe, it, expect } from 'vitest';
import { normalizeAnswer, matchesAnswer } from '../../lib/kana/normalize';

describe('normalizeAnswer', () => {
  it('pasa a minúsculas y recorta', () => {
    expect(normalizeAnswer('  KA  ')).toBe('ka');
    expect(normalizeAnswer('Shi')).toBe('shi');
  });

  it('colapsa espacios internos', () => {
    expect(normalizeAnswer('kon  nichi   wa')).toBe('kon nichi wa');
  });

  it('normaliza a NFC', () => {
    // "ā" compuesta y descompuesta tienen que dar lo mismo.
    expect(normalizeAnswer('ā')).toBe(normalizeAnswer('ā'));
  });
});

describe('matchesAnswer', () => {
  it('acepta la primaria y las alternativas por igual', () => {
    expect(matchesAnswer('shi', ['shi', 'si'])).toBe(true);
    expect(matchesAnswer('si', ['shi', 'si'])).toBe(true);
  });

  it('ignora mayúsculas y espacios de más', () => {
    expect(matchesAnswer('  SHI ', ['shi', 'si'])).toBe(true);
  });

  it('rechaza lo que no está en la lista', () => {
    expect(matchesAnswer('ma', ['ne'])).toBe(false);
  });

  it('rechaza la cadena vacía', () => {
    // Apretar Enter sin escribir nada no puede contar como acierto.
    expect(matchesAnswer('', ['ka'])).toBe(false);
    expect(matchesAnswer('   ', ['ka'])).toBe(false);
  });
});
