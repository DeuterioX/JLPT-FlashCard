import { describe, it, expect } from 'vitest';
import { parseSelection, serializeSelection } from '../lib/selection-cookie';

describe('cookie de selección', () => {
  it('serializa y vuelve a leer la misma selección', () => {
    expect(parseSelection(serializeSelection([3, 1, 2]))).toEqual([1, 2, 3]);
  });

  it('devuelve vacío si la cookie no existe', () => {
    expect(parseSelection(undefined)).toEqual([]);
    expect(parseSelection('')).toEqual([]);
  });

  it('descarta basura sin romperse', () => {
    // Una cookie corrupta no puede tirar abajo la home.
    expect(parseSelection('1,abc,,3,-5,2.7')).toEqual([1, 3]);
  });

  it('deduplica', () => {
    expect(parseSelection('2,2,2')).toEqual([2]);
  });
});
