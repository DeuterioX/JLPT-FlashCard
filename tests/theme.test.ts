import { describe, it, expect } from 'vitest';
import { theme, cssVariablesResolver } from '../theme';

function contraste(a: string, b: string) {
  const Y = (h: string) => {
    const f = (i: number) => {
      const v = parseInt(h.slice(i, i + 2), 16) / 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(1) + 0.7152 * f(3) + 0.0722 * f(5);
  };
  const [hi, lo] = [Y(a), Y(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('tema de Mantine', () => {
  it('reemplaza el gris neutro de Mantine por la escala de tinta', () => {
    // Mantine 8 trae dark-7 = #242424 (gris puro). Acá es el gris-verde de
    // la tinta, que antes de «tinta y papel» era índigo (#0F1220).
    expect(theme.colors?.dark?.[7]).toBe('#111513');
    expect(theme.colors?.dark?.[6]).toBe('#1B211D');
    expect(theme.colors?.dark?.[4]).toBe('#3A433D');
    expect(theme.colors?.dark?.[0]).toBe('#EFEBE0');
  });

  it('el papel y la tinta que va encima no salen de la escala', () => {
    // Son un material, no el entorno: la hoja de 原稿用紙 donde vive el
    // kana. Por eso viven en `other` y no en la escala de Mantine.
    expect(theme.other?.papel).toBe('#E8E1CF');
    expect(theme.other?.sumi).toBe('#191713');
    expect(theme.other?.sumiDim).toBe('#5F594E');
  });

  it('el texto se lee sobre el fondo, y el romaji sobre el papel', () => {
    // Las razones importan más que los hexes: un cambio de paleta que baje
    // de estos números rompe el test aunque los colores «se vean bien».
    const c = contraste;
    const t = theme.colors!.dark!;
    // Texto principal sobre el fondo de página.
    expect(c(t[0], t[7])).toBeGreaterThan(14);
    // Texto atenuado sobre una superficie: sigue siendo texto.
    expect(c(t[2], t[6])).toBeGreaterThan(4.5);
    // El romaji bajo cada kana, sobre el papel. Es el que menos aire tiene.
    expect(c(theme.other!.sumiDim, theme.other!.papel)).toBeGreaterThan(4.5);

    // Los dos acentos son TEXTO, no sólo relleno: jade en la pestaña activa
    // y en el significado revelado, shu en cada mensaje de error y en cada
    // botón de Borrar -31 lugares-. Por esto shu se quedó en #E2604A: el
    // #C4402E de la propuesta da 3,21:1 acá y no se lee.
    expect(c(theme.colors!.jade![6], t[6])).toBeGreaterThan(4.5);
    expect(c(theme.colors!.shu![6], t[6])).toBeGreaterThan(4.5);
  });

  it('usa jade como color primario, con el shade correcto en modo oscuro', () => {
    expect(theme.primaryColor).toBe('jade');
    expect(theme.colors?.jade?.[6]).toBe('#4FA37B');
    // Por defecto Mantine usa el shade 8 en dark, que sería demasiado apagado.
    expect(theme.primaryShade).toEqual({ light: 6, dark: 6 });
    // El jade nuevo mide 0.2944 de luminancia y el umbral por defecto de
    // autoContrast es 0.3: sin bajarlo, el botón primario queda con letra
    // blanca a 3,05:1 en vez de tinta a 6,89:1.
    expect(theme.luminanceThreshold).toBeLessThan(0.2944);
  });

  it('define shu para los estados de error', () => {
    expect(theme.colors?.shu?.[6]).toBe('#E2604A');
  });

  it('el esquema claro se lee tan bien como el oscuro', () => {
    // El bloque `light` del resolver redefine la escala `dark` de Mantine,
    // que es la que esta app usa como SU escala semántica. Si esos valores se
    // tocan sin mirar, acá se nota.
    const l = cssVariablesResolver(theme as never).light as Record<string, string>;
    const fondo = l['--mantine-color-dark-7'];
    const sup = l['--mantine-color-dark-6'];

    expect(contraste(l['--mantine-color-dark-0'], fondo)).toBeGreaterThan(14);
    expect(contraste(l['--mantine-color-dark-2'], sup)).toBeGreaterThan(4.5);
    // Los acentos son TEXTO también en claro: el jade y el shu de esquema
    // oscuro dan 2,7:1 y 3,2:1 sobre una página clara, por eso acá bajan.
    expect(contraste(l['--mantine-color-jade-6'], sup)).toBeGreaterThan(4.5);
    expect(contraste(l['--mantine-color-shu-6'], sup)).toBeGreaterThan(4.5);
    // La letra sobre el botón primario lleno.
    expect(contraste('#FFFFFF', l['--mantine-primary-color-filled'])).toBeGreaterThan(4.5);
    // El papel no cambia de esquema, así que el romaji sigue midiéndose
    // contra el mismo crema.
    expect(contraste(theme.other!.sumiDim, theme.other!.papel)).toBeGreaterThan(4.5);
  });
});
