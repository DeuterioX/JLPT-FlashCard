export const LOCALES = ['es', 'en', 'pt-BR'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'es';
// El idioma elegido en Ajustes. Cookie y no URL: el server la lee y renderiza
// ya en ese idioma, sin rutas por idioma.
export const LOCALE_COOKIE = 'NEXT_LOCALE';

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}
