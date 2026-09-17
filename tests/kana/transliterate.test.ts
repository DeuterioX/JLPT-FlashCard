import { describe, it, expect } from 'vitest';
import { toRomaji } from '../../lib/kana/transliterate';

describe('toRomaji', () => {
  it('transcribe kana simple', () => {
    expect(toRomaji('さかな')).toBe('sakana');
    expect(toRomaji('ねこ')).toBe('neko');
    expect(toRomaji('カメラ')).toBe('kamera');
  });

  it('prioriza la contracción sobre el carácter suelto', () => {
    // Si leyera de a un carácter, きゃ saldría "kiya".
    expect(toRomaji('きゃく')).toBe('kyaku');
    expect(toRomaji('しょうゆ')).toBe('shouyu');
  });

  it('duplica la consonante siguiente con el sokuon', () => {
    expect(toRomaji('がっこう')).toBe('gakkou');
    expect(toRomaji('きって')).toBe('kitte');
    expect(toRomaji('ざっし')).toBe('zasshi');
  });

  it('repite la vocal anterior con la marca de vocal larga', () => {
    expect(toRomaji('スーパー')).toBe('suupaa');
    expect(toRomaji('コーヒー')).toBe('koohii');
  });

  it('maneja los extendidos de katakana', () => {
    expect(toRomaji('ファイル')).toBe('fairu');
    expect(toRomaji('チェック')).toBe('chekku');
  });

  it('deja intacto lo que no sabe transcribir', () => {
    // Kanji y latino pasan sin tocar; el usuario corrige a mano.
    expect(toRomaji('魚')).toBe('魚');
    expect(toRomaji('')).toBe('');
  });

  it('ignora un sokuon al final, que no tiene consonante que duplicar', () => {
    expect(toRomaji('あっ')).toBe('a');
  });
});
