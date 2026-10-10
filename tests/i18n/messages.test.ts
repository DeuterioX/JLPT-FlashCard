import { describe, expect, it } from 'vitest';
import es from '../../lib/i18n/messages/es.json';
import en from '../../lib/i18n/messages/en.json';
import ptBR from '../../lib/i18n/messages/pt-BR.json';

function keys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]);
}

// El castellano es la referencia: cada idioma tiene exactamente sus claves.
describe.each([['en', en], ['pt-BR', ptBR]])('mensajes en %s', (_, messages) => {
  it('tiene las mismas claves que el castellano', () => {
    expect(keys(messages).sort()).toEqual(keys(es).sort());
  });
});
