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

    // Jade es TEXTO además de relleno -la pestaña activa, el significado
    // revelado-, así que tiene que leerse como tal.
    expect(c(theme.colors!.jade![6], t[6])).toBeGreaterThan(4.5);

    // Shu tiene DOS papeles y por eso dos valores. `shu.6` es el del diseño
    // y es RELLENO -el botón de borrar, el filete del gesto, la marca del
    // encabezado, el glifo de los modales-: le alcanza con el 3:1 que pide
    // una marca. `shuTxt` es el que se lee, y ése sí necesita 4,5.
    expect(c(theme.colors!.shu![6], t[7])).toBeGreaterThan(3);
    expect(c(theme.other!.shuTxt, t[6])).toBeGreaterThan(4.5);
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
    // El color del diseño. Antes era `#E2604A`, más claro, porque el mismo
    // token se usaba para rellenar y para escribir; ahora escribir tiene el
    // suyo y el relleno puede ser el que pide el diseño.
    expect(theme.colors?.shu?.[6]).toBe('#C4402E');
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
    // Sobre papel claro el relleno del diseño ya se lee solo, así que acá
    // `shu.6` no se redefine; lo que cambia de lado es el shu de texto.
    expect(contraste(theme.colors!.shu![6], fondo)).toBeGreaterThan(3);
    expect(contraste(l['--knd-shu-txt'], sup)).toBeGreaterThan(4.5);
    // La letra sobre el botón primario lleno.
    expect(contraste('#FFFFFF', l['--mantine-primary-color-filled'])).toBeGreaterThan(4.5);
    // El papel no cambia de esquema, así que el romaji sigue midiéndose
    // contra el mismo crema.
    expect(contraste(theme.other!.sumiDim, theme.other!.papel)).toBeGreaterThan(4.5);
  });
});

describe('los tokens del resolver existen de verdad', () => {
  it('ninguna variable --knd-* sale vacía', () => {
    // Esta prueba nace de un bug real: el resolver leía `t.other.scrim` y
    // `t.other.sombraModal`, y ninguno de los dos estaba en `theme.other`. El
    // resultado era `--knd-scrim: undefined`, o sea que en esquema OSCURO el
    // velo del modal quedaba completamente transparente -medido en vivo,
    // `rgba(0, 0, 0, 0)`- y el diálogo flotaba sobre la pantalla anterior sin
    // nada que la apartara. En claro no se veía, porque el bloque `light`
    // define las dos por su cuenta; o sea que el esquema que sí andaba tapaba
    // al que no. Nada en TypeScript lo agarra: `theme.other` es un objeto
    // libre y leerle una clave que no existe es válido.
    const v = cssVariablesResolver(theme as never);
    for (const bloque of [v.variables, v.light, v.dark]) {
      for (const [k, valor] of Object.entries(bloque ?? {})) {
        expect(valor, `${k} no tiene valor`).toBeTypeOf('string');
        expect(String(valor).trim(), `${k} está vacía`).not.toBe('');
        expect(String(valor), `${k} quedó en undefined`).not.toContain('undefined');
      }
    }
  });
});
