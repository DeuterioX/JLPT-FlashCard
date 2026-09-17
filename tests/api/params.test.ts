import { describe, it, expect } from 'vitest';
import { parseLimit, parseRange } from '../../lib/api/params';

describe('parseRange', () => {
  it('acepta los tres rangos', () => {
    expect(parseRange('7d')).toBe('7d');
    expect(parseRange('30d')).toBe('30d');
    expect(parseRange('all')).toBe('all');
  });

  it('cae a 30 días con cualquier otra cosa', () => {
    expect(parseRange(null)).toBe('30d');
    expect(parseRange(undefined)).toBe('30d');
    expect(parseRange('')).toBe('30d');
    expect(parseRange('1y')).toBe('30d');
  });
});

describe('parseLimit', () => {
  it('usa el default si falta o no es un número', () => {
    expect(parseLimit(null, 20)).toBe(20);
    expect(parseLimit(undefined, 20)).toBe(20);
    expect(parseLimit('', 20)).toBe(20);
    expect(parseLimit('abc', 20)).toBe(20);
    expect(parseLimit('Infinity', 20)).toBe(20);
  });

  it('usa el default con cero, negativos y fracciones entre 0 y 1', () => {
    expect(parseLimit('0', 20)).toBe(20);
    expect(parseLimit('-5', 20)).toBe(20);
    expect(parseLimit('0.5', 20)).toBe(20);
  });

  it('redondea hacia abajo y topa al máximo', () => {
    expect(parseLimit('7', 20)).toBe(7);
    expect(parseLimit('7.9', 20)).toBe(7);
    expect(parseLimit('1', 20)).toBe(1);
    expect(parseLimit('500', 20)).toBe(100);
    expect(parseLimit('500', 20, 50)).toBe(50);
  });
});
