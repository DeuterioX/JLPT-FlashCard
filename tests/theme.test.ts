import { describe, it, expect } from 'vitest';
import { theme } from '../theme';

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
    const c = (a: string, b: string) => {
      const Y = (h: string) => {
        const f = (i: number) => {
          const v = parseInt(h.slice(i, i + 2), 16) / 255;
          return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * f(1) + 0.7152 * f(3) + 0.0722 * f(5);
      };
      const [hi, lo] = [Y(a), Y(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    const t = theme.colors!.dark!;
    // Texto principal sobre el fondo de página.
    expect(c(t[0], t[7])).toBeGreaterThan(14);
    // Texto atenuado sobre una superficie: sigue siendo texto.
    expect(c(t[2], t[6])).toBeGreaterThan(4.5);
    // El romaji bajo cada kana, sobre el papel. Es el que menos aire tiene.
    expect(c(theme.other!.sumiDim, theme.other!.papel)).toBeGreaterThan(4.5);
  });

  it('usa jade como color primario, con el shade correcto en modo oscuro', () => {
    expect(theme.primaryColor).toBe('jade');
    expect(theme.colors?.jade?.[6]).toBe('#3FBF8F');
    // Por defecto Mantine usa el shade 8 en dark, que sería demasiado apagado.
    expect(theme.primaryShade).toEqual({ light: 6, dark: 6 });
  });

  it('define shu para los estados de error', () => {
    expect(theme.colors?.shu?.[6]).toBe('#E2604A');
  });
});
