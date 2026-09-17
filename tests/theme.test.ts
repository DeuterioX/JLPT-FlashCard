import { describe, it, expect } from 'vitest';
import { theme } from '../theme';

describe('tema de Mantine', () => {
  it('reemplaza el gris neutro de Mantine por la paleta índigo', () => {
    // Mantine 8 trae dark-7 = #242424 (gris puro). El diseño exige índigo.
    expect(theme.colors?.dark?.[7]).toBe('#0F1220');
    expect(theme.colors?.dark?.[6]).toBe('#181C2E');
    expect(theme.colors?.dark?.[4]).toBe('#2C3249');
    expect(theme.colors?.dark?.[0]).toBe('#E9EBF4');
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
