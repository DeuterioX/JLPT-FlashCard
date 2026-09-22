import { describe, it, expect } from 'vitest';
import { toKana } from '../../lib/kana/to-kana';
import { toRomaji } from '../../lib/kana/transliterate';

describe('toKana', () => {
  it('transcribe romaji simple', () => {
    expect(toKana('sakana', 'hiragana')).toBe('さかな');
    expect(toKana('neko', 'hiragana')).toBe('ねこ');
    expect(toKana('kamera', 'katakana')).toBe('カメラ');
  });

  it('elige el silabario que se le pide, porque el romaji no lo dice', () => {
    expect(toKana('neko', 'hiragana')).toBe('ねこ');
    expect(toKana('neko', 'katakana')).toBe('ネコ');
  });

  it('prioriza la coincidencia más larga', () => {
    // Leyendo de a una letra, "kya" saldría き + や.
    expect(toKana('kyaku', 'hiragana')).toBe('きゃく');
    expect(toKana('shouyu', 'hiragana')).toBe('しょうゆ');
  });

  it('acepta las romanizaciones alternativas de la tabla', () => {
    expect(toKana('si', 'hiragana')).toBe('し');
    expect(toKana('tu', 'hiragana')).toBe('つ');
    expect(toKana('syo', 'hiragana')).toBe('しょ');
    expect(toKana('jya', 'hiragana')).toBe('じゃ');
  });

  it('resuelve a favor del kana básico cuando dos comparten romanización', () => {
    // "o" es お y を; "zu" es ず y づ; "ji" es じ y ぢ. Gana el primero de la
    // tabla, que es el que alguien espera al tipear.
    expect(toKana('o', 'hiragana')).toBe('お');
    expect(toKana('zu', 'hiragana')).toBe('ず');
    expect(toKana('ji', 'hiragana')).toBe('じ');
  });

  it('convierte la consonante doble en sokuon', () => {
    expect(toKana('kitte', 'hiragana')).toBe('きって');
    expect(toKana('gakkou', 'hiragana')).toBe('がっこう');
    expect(toKana('zasshi', 'hiragana')).toBe('ざっし');
    expect(toKana('kitte', 'katakana')).toBe('キッテ');
  });

  it('escribe ん cuando la n no arranca sílaba', () => {
    expect(toKana('shinbun', 'hiragana')).toBe('しんぶん');
    expect(toKana('nihon', 'hiragana')).toBe('にほん');
    // En el medio, la segunda n arranca la sílaba siguiente.
    expect(toKana('konnichiwa', 'hiragana')).toBe('こんにちわ');
    // Al final, "nn" es la forma alternativa de ん que la tabla acepta.
    expect(toKana('honn', 'hiragana')).toBe('ほん');
  });

  it('usa el apóstrofo para forzar ん', () => {
    expect(toKana("hon'ya", 'hiragana')).toBe('ほんや');
    expect(toKana('honya', 'hiragana')).toBe('ほにゃ');
  });

  it('escribe la vocal larga tal cual en hiragana', () => {
    // Las dos formas existen y suenan igual; el romaji tipeado decide cuál.
    expect(toKana('toukyou', 'hiragana')).toBe('とうきょう');
    expect(toKana('ookii', 'hiragana')).toBe('おおきい');
  });

  it('usa chōonpu para la vocal larga en katakana', () => {
    expect(toKana('suupaa', 'katakana')).toBe('スーパー');
    expect(toKana('koohii', 'katakana')).toBe('コーヒー');
    expect(toKana('toukyou', 'katakana')).toBe('トーキョー');
  });

  it('llega a los sonidos que sólo existen en katakana', () => {
    expect(toKana('fairu', 'katakana')).toBe('ファイル');
    expect(toKana('chekku', 'katakana')).toBe('チェック');
    expect(toKana('viza', 'katakana')).toBe('ヴィザ');
  });

  it('deja pasar lo que no reconoce', () => {
    expect(toKana('sakana!', 'hiragana')).toBe('さかな!');
    expect(toKana('', 'hiragana')).toBe('');
  });

  it('ignora mayúsculas y espacios de los extremos', () => {
    expect(toKana('  SaKaNa  ', 'hiragana')).toBe('さかな');
  });

  it('vuelve al romaji de partida al pasar por toRomaji', () => {
    // La prueba de que las dos tablas son la misma: lo que sale de una tiene
    // que poder entrar en la otra.
    for (const r of ['sakana', 'kitte', 'shinbun', 'kyaku', 'gakkou', 'toukyou']) {
      expect(toRomaji(toKana(r, 'hiragana'))).toBe(r);
    }
    for (const r of ['suupaa', 'koohii', 'fairu']) {
      expect(toRomaji(toKana(r, 'katakana'))).toBe(r);
    }
  });
});
