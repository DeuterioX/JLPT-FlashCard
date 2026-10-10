import type messages from './messages/es.json';
import type { Locale } from './locales';

// El castellano es la referencia: una clave que falte en otro idioma es un
// error de tipos.
declare module 'next-intl' {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
