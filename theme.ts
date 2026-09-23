import { createTheme, rem, type MantineColorsTuple, type MantineTheme } from '@mantine/core';

// Índigo profundo, no negro. Reemplaza el `dark` gris neutro de Mantine.
// Mantine deriva de este array TODAS sus variables semánticas, así que
// redefinirlo alcanza para que cada componente se acomode solo.
// Ojo con el orden: en la escala de Mantine el 6 es MÁS CLARO que el 7.
const dark: MantineColorsTuple = [
  '#E9EBF4', // 0 → --mantine-color-text
  '#C3C8DC', // 1
  '#868DA8', // 2 → texto atenuado
  '#5D6480', // 3 → placeholders
  '#2C3249', // 4 → --mantine-color-default-border
  '#212639', // 5 → hover
  '#181C2E', // 6 → --mantine-color-default (superficies)
  '#0F1220', // 7 → --mantine-color-body (fondo de página)
  '#0B0E19', // 8
  '#070912', // 9
];

// Acción y acierto. Generado desde #3FBF8F con el generador de Mantine.
const jade: MantineColorsTuple = [
  '#E9F9F2', '#CDEFE2', '#A6E2CB', '#7BD4B2', '#57C79D',
  '#4BC796', '#3FBF8F', '#339C76', '#27795C', '#1A5641',
];

// Error. Generado desde #E2604A.
const shu: MantineColorsTuple = [
  '#FDEEEB', '#F9D6CF', '#F2B4A7', '#EC917F', '#E7755F',
  '#E56B55', '#E2604A', '#C74E3A', '#A43D2C', '#7F2C1F',
];

export const theme = createTheme({
  primaryColor: 'jade',
  // Mantine usa el shade 8 en dark por defecto, que apaga demasiado el jade.
  primaryShade: { light: 6, dark: 6 },
  colors: { dark, jade, shu },
  // El orden importa: "Segoe UI" es una fuente del sistema en Windows,
  // siempre disponible al instante. Puesta primero, el navegador la usa
  // para TODO el texto de la interfaz y "IBM Plex Sans" -la que realmente
  // pide el diseño- nunca llega a usarse, aunque cargue bien. Quedaba con
  // un grosor de letra distinto al del diseño en toda la app, no en un
  // lugar puntual. El orden de acá es el mismo del `body` del CSS
  // original: IBM Plex Sans primero, Segoe UI como fallback al final.
  fontFamily: '"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif',
  fontFamilyMonospace: '"IBM Plex Mono", ui-monospace, monospace',
  headings: { fontFamily: '"Zen Kaku Gothic New", "IBM Plex Sans", sans-serif' },
  // El jade (#3FBF8F) es un verde claro: texto blanco encima da bajo
  // contraste. autoContrast hace que Mantine elija texto oscuro o claro
  // según la luminosidad del fondo, componente por componente, en vez de
  // asumir blanco siempre.
  autoContrast: true,
  // El diseño distingue controles (botones, cards, inputs → 7px) de
  // contenedores (Paper, paneles → 9px). El default de Mantine (`sm` =
  // 4px) no llegaba a ninguno de los dos. `defaultRadius: 'sm'` cubre los
  // controles; `Paper` pide `md` explícitamente más abajo para los 9px.
  // En `rem()`, no en px sueltos -quedaban clavados en ese tamaño exacto
  // en 2K/4K mientras el resto de la app (texto, paddings) sí escalaba;
  // se verificó en vivo: probado con `px`, el radio no se movía ni un
  // poco al doblar el `font-size` de la raíz-.
  radius: { xs: rem(4), sm: rem(7), md: rem(9), lg: rem(12), xl: rem(20) },
  defaultRadius: 'sm',
  // "Subir un paso" el tamaño de letra base NO se hace pisando `fontSizes`
  // con valores en px fijos: los botones e inputs de Mantine tienen su
  // propia altura (`--button-height-*`, etc.) en `rem`, calibrada contra
  // la escala DEFAULT de Mantine. Si acá se sube `sm` de 14px a 16px pero
  // esa altura se queda en la misma, el texto queda más grande que la caja
  // que lo contiene -pasó de verdad, con el botón "+ Nuevo mazo"-. La
  // escala se deja en el default de Mantine (en rem) y el "un paso más
  // grande" se logra en `globals.css` subiendo el `font-size` del `html`:
  // como todo en Mantine se mide en `rem`, texto Y cajas escalan juntos.
  components: {
    // Las superficies elevadas (cards, paneles, la barra de acción, el
    // header) tienen que distinguirse del fondo de la página. El default
    // de Mantine deja a Paper con el mismo color que el body si no se lo
    // pide explícito; acá se resuelve una sola vez -con el radio de
    // "contenedor" (9px, ver arriba)- para que ningún componente se olvide.
    Paper: {
      defaultProps: { bg: 'dark.6', radius: 'md' },
    },
    // Card renderiza un <Paper> por dentro (ver Card.mjs) y SÍ hereda sus
    // `defaultProps` -incluido `radius: 'md'`-, así que sin este override
    // quedaba con el radio de "contenedor" (9px) en vez del de "control"
    // (7px, el del diseño para tarjetas clickeables como la de grupo).
    Card: {
      defaultProps: { bg: 'dark.6', radius: 'sm' },
    },
    // El `.sw` del diseño (26×15, bolita 11px, padding 2px) no coincide
    // exacto con ningún tamaño de Mantine, pero tratar de clavarlo a mano
    // -pisando `--switch-thumb-size`/`--switch-track-label-padding` una
    // por una- ya salió mal una vez: si se desincronizan entre sí, la
    // bolita queda corrida. Mejor apoyarse en un preset entero y
    // consistente: de los cinco (`xs` a `xl`), `xs` (32×16, bolita 12px,
    // padding 2px) es el que más cerca cae, y el padding da EXACTO -ahí
    // es donde el cálculo de posición puede desalinearse si no coincide-.
    Switch: {
      // Mantine dibuja por default un punto interno en la bolita
      // (`::before` al 40% de su tamaño, ver `withThumbIndicator`),
      // pensado para una bolita de tamaño normal. En una bolita chica se
      // ve como un ojo/bullseye -no existe en el `.sw::after` del CSS
      // original, que es un círculo sólido y nada más-.
      defaultProps: { size: 'xs', withThumbIndicator: false },
      // Forma oficial de los docs de Mantine: `styles` puede ser una
      // función `(theme, props) => estilos` y lee el `checked` real de
      // cada instancia acá mismo -por eso `GroupCard.tsx` ya no necesita
      // ninguna rama condicional propia-. Esto solo es seguro porque
      // `theme` se importa dentro de `components/Providers.tsx` (un
      // Client Component) y nunca cruza como prop desde un Server
      // Component: si cruzara esa frontera, Next.js no podría serializar
      // esta función y el build rompería (pasó de verdad).
      styles: (t: MantineTheme, props: { checked?: boolean }) => ({
        thumb: {
          border: 'none',
          backgroundColor: props.checked
            ? t.other.switchThumbActiveBg
            : 'var(--mantine-color-dark-2)',
        },
      }),
    },
    Modal: {
      // Centrado vertical. Mantine los ancla arriba por defecto, y en una
      // pantalla alta el diálogo queda pegado al techo, lejos de donde está
      // mirando quien lo abrió.
      defaultProps: { centered: true },
      styles: {
        content: { backgroundColor: 'var(--mantine-color-dark-6)' },
        header: { backgroundColor: 'var(--mantine-color-dark-6)' },
      },
    },
    // Mantine pinta `Kbd` en negrita, con fondo `dark.6` y texto brillante
    // `dark.0` en modo oscuro (ver node_modules/@mantine/core/styles/Kbd.css)
    // -queda como una insignia blanca resaltada-. El diseño (`.kbd`) lo
    // quiere sutil: sin fondo, texto apagado (`--a-dim`, dark.2), sin
    // negrita, con un borde inferior un poco más grueso para un efecto de
    // "tecla apretada" en vez del resaltado. `styles` acá son propiedades
    // planas (sin `&:focus` ni selectores anidados), así que sí se
    // aplican -a diferencia del intento fallido con TextInput más abajo-.
    Kbd: {
      styles: {
        root: {
          backgroundColor: 'transparent',
          color: 'var(--mantine-color-dark-2)',
          fontWeight: 400,
          borderColor: 'var(--mantine-color-dark-4)',
          borderBottomWidth: rem(2),
        },
      },
    },
    // El foco de CUALQUIER TextInput (el de respuesta del quiz, los campos
    // del editor de mazo, el buscador de diccionario) usa el azul dedicado
    // del diseño (`--a-focus`), no el jade primario que Mantine usa por
    // default. NO se resuelve acá: en Mantine 9 `styles` ya no compila
    // selectores anidados (`'&:focus': {...}`) a una regla CSS real -se
    // vuelca tal cual como `style` inline del elemento, así que esa clave
    // quedaba como una propiedad inline inválida y no hacía nada- (probado
    // en vivo: cero reglas con el color en toda la hoja de estilos). El fix
    // real está en `app/globals.css`, contra la clase pública y estable
    // `.mantine-TextInput-input` que Mantine expone justo para esto.
    // El header y el pie de la app (AppShell.Header/Main) no son Paper,
    // así que el fix de arriba no los alcanza: se repite acá.
    AppShellHeader: {
      defaultProps: { bg: 'dark.6' },
    },
    // El deck switcher y el selector de rango de estadísticas comparten
    // este componente. Valores tomados del diseño (sección "El sistema
    // compartido"): riel en la superficie -1 (dark.5), y la opción activa
    // "hundida" en el color de fondo de la página (dark.7) en vez de
    // resaltada, como un botón presionado. `withItemsBorders={false}` saca
    // los separadores verticales entre opciones que Mantine agrega por
    // default -eso era el "|" que se veía entre "7 días" y "30 días", no
    // texto suelto-.
    // Medidas también del CSS del diseño (`.seg`/`.seg span`/`.seg
    // span.on`): contenedor 8px de radio y 3px de padding, opción 6px de
    // radio, texto 12px, y la opción activa con la sombra "hundida" que
    // la separa de las demás -Mantine no la trae por default-.
    SegmentedControl: {
      defaultProps: { withItemsBorders: false },
      styles: {
        root: {
          backgroundColor: 'var(--mantine-color-dark-5)',
          borderRadius: rem(8),
          padding: rem(3),
        },
        indicator: {
          backgroundColor: 'var(--mantine-color-dark-7)',
          borderRadius: rem(6),
          boxShadow: `0 ${rem(1)} ${rem(2)} rgba(0, 0, 0, 0.35)`,
        },
        label: {
          fontSize: rem(12),
          padding: `${rem(4)} ${rem(12)}`,
          // Mantine le pone 600 a este label por default; el diseño
          // (`.seg span`, `.seg span.on`) no fija ningún peso -queda en
          // el normal de la tipografía de interfaz, 400-.
          fontWeight: 400,
        },
      },
    },
    // El diseño (`.btn`) pide 500 -no el 600 que Mantine trae por
    // default para el label del botón- y texto neutro (`--a-text`,
    // blanco) para los botones normales y "ghost". El jade queda
    // reservado para el CTA principal (`.btn.pri`, filled): acá NO se
    // puede resolver con un color fijo -pisaría también el filled-, así
    // que `vars` (función, mismo mecanismo que el `styles` de Switch de
    // arriba) lee el `variant` real de cada instancia y solo fuerza el
    // texto neutro en `subtle`/`default`/`outline`, dejando `filled`
    // como venía (jade + autoContrast).
    Button: {
      styles: {
        label: { fontWeight: 500 },
      },
      vars: (_t: MantineTheme, props: { variant?: string; color?: string; size?: string }) => {
        // Mantine trata el `variant` sin especificar como "filled" -su
        // propio `varsResolver` hace `variant || 'filled'`-, pero ACÁ
        // llega crudo (`undefined`), no con ese fallback ya aplicado. Sin
        // este mismo fallback, "Comenzar" (filled por default, sin pasar
        // `variant`) caía en la rama "neutro" -pasó de verdad: quedó con
        // el texto blanco de acá en vez del oscuro por autoContrast-.
        const variant = props.variant ?? 'filled';
        // `!props.color` es imprescindible: sin eso este override le ganaba
        // a CUALQUIER `color=""` explícito y lo dejaba en blanco. Pasó de
        // verdad -medido-: los dos botones de borrar de la app
        // (`variant="subtle" color="shu"`, en DeckList y DeckEditor) se
        // veían blancos en vez de rojos, o sea que la acción destructiva no
        // se leía como destructiva. Este bloque existe para los botones
        // NEUTROS; el que pide un color, ya eligió.
        const neutral = variant !== 'filled' && !props.color;
        return {
          root: {
            ...(neutral ? { '--button-color': 'var(--mantine-color-text)' } : {}),
            // `.btn` del diseño: el botón por defecto va sobre
            // `--a-surface-2` (dark.5), no sobre el dark.6 que Mantine usa
            // como `--mantine-color-default`. Es el botón más repetido del
            // mockup (11 usos, en todas las pantallas), así que se corrige
            // acá y no pantalla por pantalla.
            ...(variant === 'default' ? { '--button-bg': 'var(--mantine-color-dark-5)' } : {}),
            // `.btn.sm` del diseño: 11px y 9px de padding lateral, contra
            // los 12px/7px que trae `compact-xs`.
            ...(props.size === 'compact-xs'
              ? { '--button-fz': rem(11), '--button-padding-x': rem(9) }
              : {}),
          },
        };
      },
    },
  },
  // Valores puntuales del diseño que no son parte de ninguna escala de
  // color (ni jade, ni dark): `theme.other` es el lugar de Mantine para
  // tokens de diseño sueltos, así ningún componente los vuelve a escribir
  // como hex a mano -se leen con `useMantineTheme().other.*`-.
  other: {
    groupCardActiveBg: '#141E28',
    groupCardActiveBorder: '#2E5A4C',
    // `--a-border-soft` del diseño: un borde más sutil que el `dark.4`
    // -"--a-border"- que usa el resto de la app (la barra de acción, el
    // riel del switcher). No es el mismo tono, así que no alcanza con
    // dejar el borde "default" de Mantine. Lo piden la tarjeta de grupo sin
    // seleccionar y, en Estadísticas, las tiles, los paneles y el fondo de
    // las barras -por eso el nombre es el del diseño y no el de un uso-.
    borderSoft: '#232840',
    switchThumbActiveBg: '#06231A',
    // `--a-focus` del diseño: el borde de foco de CUALQUIER input es este
    // azul dedicado, no el jade primario que Mantine usa por default para
    // el foco de todo control (`--input-bd-focus: var(--mantine-primary-color-filled)`).
    // Confirmado contra el mockup real: el mismo token aparece tanto en el
    // input de respuesta del quiz (`.answer`) como en los campos del editor
    // de mazo (`.field.focus`) -es compartido, no exclusivo del quiz-.
    inputFocusBorder: '#6C8CFF',
  },
});
