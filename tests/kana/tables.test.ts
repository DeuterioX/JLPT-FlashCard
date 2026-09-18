import { describe, it, expect } from 'vitest';
import { HIRAGANA, KATAKANA, type KanaGroup } from '../../lib/kana/tables';

const cards = (gs: KanaGroup[]) => gs.reduce((n, g) => n + g.cards.length, 0);
const inSection = (gs: KanaGroup[], s: string) => gs.filter((g) => g.section === s);

describe('hiragana', () => {
  it('tiene 26 grupos y 104 cartas', () => {
    expect(HIRAGANA).toHaveLength(26);
    expect(cards(HIRAGANA)).toBe(104);
  });

  it('se reparte en 10 básicos (46), 5 dakuten (25) y 11 contracciones (33)', () => {
    expect(inSection(HIRAGANA, 'Básicos')).toHaveLength(10);
    expect(cards(inSection(HIRAGANA, 'Básicos'))).toBe(46);
    expect(inSection(HIRAGANA, 'Dakuten')).toHaveLength(5);
    expect(cards(inSection(HIRAGANA, 'Dakuten'))).toBe(25);
    expect(inSection(HIRAGANA, 'Contracciones')).toHaveLength(11);
    expect(cards(inSection(HIRAGANA, 'Contracciones'))).toBe(33);
  });

  it('trata きゃ como una sola carta', () => {
    const kya = HIRAGANA.find((g) => g.name === 'Serie KY')!;
    expect(kya.cards.map((c) => c.prompt)).toEqual(['きゃ', 'きゅ', 'きょ']);
    expect(kya.cards[0].romaji[0]).toBe('kya');
  });

  it('acepta Hepburn y Kunrei donde difieren', () => {
    const find = (p: string) =>
      HIRAGANA.flatMap((g) => g.cards).find((c) => c.prompt === p)!;
    expect(find('し').romaji).toEqual(['shi', 'si']);
    expect(find('つ').romaji).toEqual(['tsu', 'tu']);
    expect(find('ふ').romaji).toEqual(['fu', 'hu']);
    expect(find('を').romaji).toEqual(['wo', 'o']);
    expect(find('ん').romaji).toEqual(['n', 'nn']);
    expect(find('か').romaji).toEqual(['ka']); // sin alternativa
  });
});

describe('katakana', () => {
  it('tiene 33 grupos y 131 cartas', () => {
    expect(KATAKANA).toHaveLength(33);
    expect(cards(KATAKANA)).toBe(131);
  });

  it('incluye 7 grupos de extendidos con 27 cartas', () => {
    expect(inSection(KATAKANA, 'Extendidos')).toHaveLength(7);
    expect(cards(inSection(KATAKANA, 'Extendidos'))).toBe(27);
  });

  it('no incluye la marca de vocal larga como carta', () => {
    expect(KATAKANA.flatMap((g) => g.cards).some((c) => c.prompt === 'ー')).toBe(false);
  });
});

describe('ambos silabarios', () => {
  it('no repite prompts dentro del mismo silabario', () => {
    for (const set of [HIRAGANA, KATAKANA]) {
      const prompts = set.flatMap((g) => g.cards).map((c) => c.prompt);
      expect(new Set(prompts).size).toBe(prompts.length);
    }
  });

  it('toda carta tiene al menos una romanización, la primera es la primaria', () => {
    for (const c of [...HIRAGANA, ...KATAKANA].flatMap((g) => g.cards)) {
      expect(c.romaji.length).toBeGreaterThan(0);
      expect(c.romaji[0]).toMatch(/^[a-z]+$/);
    }
  });
});
