import {
  createTheme, rem,
  type CSSVariablesResolver, type MantineColorsTuple, type MantineTheme,
} from '@mantine/core';

// Tinta, no negro ni índigo. Reemplaza el `dark` gris neutro de Mantine.
// Mantine deriva de este array TODAS sus variables semánticas, así que
// redefinirlo alcanza para que cada componente se acomode solo.
// Ojo con el orden: en la escala de Mantine el 6 es MÁS CLARO que el 7.
//
// La escala anterior era índigo (#0F1220 de fondo). Ésta es el gris-verde de
// la tinta, de la dirección «tinta y papel»: la app entera pasa a ser el
// entorno donde vive el papel, en vez de un azul que compite con él.
const dark: MantineColorsTuple = [
  '#EFEBE0', // 0 → --mantine-color-text
  '#CDD3C9', // 1
  '#9BA49B', // 2 → texto atenuado
  '#6E7570', // 3 → placeholders
  '#3A433D', // 4 → --mantine-color-default-border
  '#272E29', // 5 → hover
  '#1B211D', // 6 → --mantine-color-default (superficies)
  '#111513', // 7 → --mantine-color-body (fondo de página)
  '#0C0F0D', // 8
  '#080A09', // 9
];

// Acción y acierto. Antes salía de #3FBF8F, un jade brillante que contra la
// escala de tinta se veía neón. Ahora de #4FA37B, el verde de «tinta y
// papel»: misma familia de tono que la tinta y no un acento que le grita.
//
// La rampa NO se generó de cero: se midió, para cada tono de la vieja, qué
// proporción de blanco o de negro tenía respecto de su propio tono 6, y se
// reaplicó sobre el ancla nueva. Así conserva la trayectoria que había
// generado Mantine y sólo se mueve el ancla.
const jade: MantineColorsTuple = [
  '#ECF5F1', '#D2E7DD', '#AED5C2', '#87C0A5', '#65AE8C',
  '#5EAB86', '#4FA37B', '#418565', '#32674E', '#234836',
];

// Error y acento. Anclada en el #C4402E del diseño. La rampa se reconstruyó
// como la de jade: se midió qué proporción de blanco o de negro tenía cada
// tono respecto de su propio tono 6 y se reaplicó sobre el ancla nueva.
//
// El 6 es el color de RELLENO -el botón de borrar, el filete del gesto, la
// marca del encabezado, el glifo de los modales-, y ahí 3,61:1 contra la
// página oscura y 4,56 contra la clara es de sobra: una marca no es texto.
// Como TEXTO no alcanza (3,21:1), y shu es texto en treinta y un lugares, así
// que para eso está `shuTxt`.
const shu: MantineColorsTuple = [
  '#F9EDEB', '#F1D1CC', '#E3A59D', '#D77C70', '#CC5B4B',
  '#C94F3E', '#C4402E', '#A23526', '#802A1E', '#5E1F16',
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
  // Las cuatro familias del canvas, no las de IBM que había antes. Son cuatro
  // y cada una tiene un trabajo: `M PLUS 2` es la interfaz, `M PLUS 1 Code` es
  // todo número y romaji, `Zen Kaku Gothic New` es el kana de las listas y
  // `Zen Old Mincho` -la serif japonesa- es el kanji de rótulo: el glifo de
  // cada encabezado de sección, el de cada modal, los de la barra de pestañas
  // y el carácter dentro del 原稿用紙. Las dos japonesas no son
  // intercambiables: la gótica es señalización y la mincho es escritura, y el
  // papel de manuscrito es escritura.
  fontFamily: '"M PLUS 2", system-ui, -apple-system, "Segoe UI", sans-serif',
  fontFamilyMonospace: '"M PLUS 1 Code", ui-monospace, monospace',
  headings: { fontFamily: '"M PLUS 2", system-ui, sans-serif' },
  // El jade (#3FBF8F) es un verde claro: texto blanco encima da bajo
  // contraste. autoContrast hace que Mantine elija texto oscuro o claro
  // según la luminosidad del fondo, componente por componente, en vez de
  // asumir blanco siempre.
  autoContrast: true,
  // El umbral por defecto de Mantine es 0.3, y el jade nuevo (#4FA37B) mide
  // 0.2944 de luminancia: cae del lado equivocado por seis milésimas y
  // autoContrast le pone letra BLANCA al botón primario, que sobre ese verde
  // da 3,05:1. Con letra oscura da 6,89:1, que además es lo que pide el
  // diseño -el verde lleno siempre lleva tinta encima-. El jade viejo era
  // más claro (0.4076) y caía del lado bueno solo.
  luminanceThreshold: 0.25,
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
          // Por variable de CSS y no por `t.other`: el tema se construye una
          // vez y no sabe de esquemas, así que en claro se habría quedado con
          // la bolita oscura sobre el verde hondo.
          backgroundColor: props.checked
            ? 'var(--knd-switch-thumb)'
            : 'var(--mantine-color-dark-2)',
        },
      }),
    },
    // Ningún campo de esta app tiene algo que el navegador pueda adivinar:
    // no hay login, y lo que se escribe son palabras en japonés y nombres de
    // mazos. El autocompletado sólo molesta -y, cuando actúa, Chrome pinta el
    // campo con SU fondo claro, que sobre el tema oscuro se ve como una caja
    // iluminada de la nada-. Se declara una vez acá en vez de repetirlo en
    // los quince campos que hay.
    TextInput: {
      defaultProps: { autoComplete: 'off' },
    },
    Modal: {
      // Centrado vertical. Mantine los ancla arriba por defecto, y en una
      // pantalla alta el diálogo queda pegado al techo, lejos de donde está
      // mirando quien lo abrió.
      defaultProps: {
        centered: true,
        // `pop`, el default de Mantine, escala el diálogo desde su esquina a
        // la vez que lo desvanece: se lee como si entrara desde arriba y
        // desde la izquierda al mismo tiempo, tres movimientos en uno. Un
        // modal no viene de ningún lado -aparece encima de lo que estabas
        // mirando-, así que la transición honesta es sólo opacidad. Corta,
        // porque lo que sigue es escribir o decidir, no mirar la animación.
        transitionProps: { transition: 'fade', duration: 140, timingFunction: 'ease-out' },
        // El radio va como PROP y no en `styles`: `styles` lo escribe como
        // estilo inline y ahí ninguna hoja puede pisarlo, ni con una media
        // query. El buscador del diccionario necesita pisarlo -en teléfono va a
        // pantalla completa y una esquina redondeada a pantalla completa deja
        // ver el fondo por los cuatro vértices-, y con el prop lo puede hacer
        // porque Mantine lo resuelve contra `--modal-radius` en su propia
        // hoja. Medido: con el radio en `styles`, `.knd-dict-modal` a 390px
        // seguía dando `border-radius: 10px`.
        radius: 10,
      },
      // Medido contra el tablero: el modal no tenía NADA de esto. Sin borde,
      // con el radio de `md` en vez de 10, con la sombra de fábrica de
      // Mantine, sin la línea que separa la cabecera del cuerpo y con el velo
      // negro al 60% en vez del de la escala.
      styles: {
        content: {
          backgroundColor: 'var(--mantine-color-dark-6)',
          border: '1px solid var(--mantine-color-dark-4)',
          boxShadow: 'var(--knd-sombra-modal)',
        },
        header: {
          backgroundColor: 'var(--mantine-color-dark-6)',
          borderBottom: '1px solid var(--knd-border-soft)',
          padding: `${rem(14)} ${rem(16)}`,
        },
        body: { padding: rem(16) },
        overlay: { backgroundColor: 'var(--knd-scrim)' },
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
        // 600 y no 500: los tres tipos de botón del diseño -primario,
        // peligro y default- llevan el mismo peso, y con 500 el rótulo se
        // leía más liviano que el resto de la pantalla.
        label: { fontWeight: 600 },
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
            // Los dos rellenos del diseño traen su propio rótulo y no el que
            // elige autoContrast. autoContrast acierta el LADO -claro sobre
            // shu, oscuro sobre jade- pero usa blanco y negro puros, y el
            // diseño usa dos tintas de la paleta: `#F7F3EA` sobre el rojo y
            // `verdeInk` sobre el verde. Blanco puro sobre shu vibra, y negro
            // puro sobre jade es el único negro absoluto de la app.
            ...(variant === 'filled' && props.color?.startsWith('shu')
              ? { '--button-color': '#F7F3EA', '--button-padding-x': rem(14) }
              : {}),
            ...(variant === 'filled' && !props.color
              ? { '--button-color': 'var(--knd-verde-ink)' }
              : {}),
            // `.btn` del diseño: el botón por defecto va sobre
            // `--a-surface-2` (dark.5), no sobre el dark.6 que Mantine usa
            // como `--mantine-color-default`. Es el botón más repetido del
            // mockup (11 usos, en todas las pantallas), así que se corrige
            // acá y no pantalla por pantalla.
            ...(variant === 'default'
              ? {
                '--button-bg': 'var(--mantine-color-dark-5)',
                // `boton()` default: 12px de relleno lateral contra los 18
                // del tamaño `sm` de Mantine. Se nota al lado de un primario,
                // que sí lleva 18: el diseño hace más angosto al secundario.
                '--button-padding-x': rem(12),
              }
              : {}),
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

    // `--a-border-soft` del diseño: un borde más sutil que el `dark.4`
    // -"--a-border"- que usa el resto de la app (la barra de acción, el
    // riel del switcher). No es el mismo tono, así que no alcanza con
    // dejar el borde "default" de Mantine. Lo piden la tarjeta de grupo sin
    // seleccionar y, en Estadísticas, las tiles, los paneles y el fondo de
    // las barras -por eso el nombre es el del diseño y no el de un uso-.
    borderSoft: '#272E29',
    switchThumbActiveBg: '#06231A',
    // El velo del modal y su sombra. Estaban leyéndose del tema pero NO
    // estaban acá: `t.other.scrim` daba `undefined`, así que `--knd-scrim`
    // salía vacía y el velo del esquema oscuro era completamente transparente
    // -medido: `rgba(0, 0, 0, 0)`-. O sea que el modal flotaba sobre la
    // pantalla anterior sin nada que la apartara, y encima sin sombra. En
    // claro no se notaba porque el bloque `light` del resolver las define.
    scrim: 'rgba(8,10,9,.72)',
    sombraModal: '0 20px 60px rgba(0,0,0,.5)',
    // La sombra de la hoja de 原稿用紙. Es negro al 35% y eso sirve SOBRE una
    // página oscura; estaba escrita a mano en globals.css, o sea que la misma
    // sombra negra caía también sobre la página clara, donde una hoja crema no
    // proyecta una mancha negra: proyecta sumi muy tenue. El bloque `light`
    // del resolver la cambia.
    sombraHoja: '0 10px 30px rgba(0,0,0,.35)',

    // El papel y la tinta que va encima. No son parte de la escala de
    // Mantine a propósito: la escala es el ENTORNO -fondos, bordes, texto de
    // interfaz- y esto es un material, el 原稿用紙 donde vive el kana. Por
    // eso no cambian con el esquema de color: una hoja de papel no se vuelve
    // oscura porque la app lo sea.
    papel: '#E8E1CF',
    sumi: '#191713',
    sumiDim: '#5F594E',
    // La misma hoja, sin elegir. Es lo que dice si un grupo entra o no en la
    // ronda: el interruptor lo repite, pero el que se ve de lejos es el
    // papel. 33 puntos de L* por debajo del papel elegido.
    papelOff: '#8E897A',
    papelInk: '#23211C',
    papelInkDim: '#3E3A33',
    // La pauta del 原稿用紙: shu al 16%, un renglón por carta.
    pauta: 'rgb(196 64 46 / 16%)',

    // El tercer color, el único fuera de jade/shu: el ámbar del semáforo de
    // Estadísticas, entre 60 y 85% de aciertos. Estaba como hex suelto en
    // StatsBoard. No hay ninguno de Mantine que se le parezca -su `yellow.6`
    // es `#fab005`, un amarillo anaranjado, contra este latón apagado- y
    // codifica un estado real, así que el tono importa.
    ambar: '#C8A23E',
    // El shu, y hay UNO SOLO: el `#C4402E` del canvas, igual de relleno que de
    // texto y en los dos esquemas. Acá hubo un intento de partirlo en dos -un
    // rojo aclarado para texto, `#D77C70`, y otro oscurecido para claro- para
    // llegar a 4,5:1 de contraste. Se descartó: al lado del relleno de un
    // botón de borrar, del filete de un encabezado y del glifo de un modal,
    // ese aclarado se lee salmón y la pantalla queda con dos rojos que no son
    // el mismo color. La paleta del canvas tiene un solo shu y no tiene
    // variante por tema, a propósito -es el acento de la marca-.
    //
    // El precio está medido y es consciente: como texto sobre la superficie
    // oscura da 3,21:1, por debajo del 4,5:1 que pide un texto corrido. Es el
    // color de los mensajes de error y de las cifras de error, nunca de algo
    // que haya que leer largo, y siempre acompañado por la palabra que dice lo
    // mismo. Sobre la página clara da 4,60:1.
    shuTxt: '#C4402E',
    // La tinta que se apoya SOBRE el verde: el rótulo del botón primario y la
    // bolita del switch encendido. En el diseño es un token propio
    // (`verdeInk`) justamente porque se da vuelta por tema -tinta casi negra
    // sobre el verde oscuro, casi blanca sobre el verde claro- y el bloque
    // `light` del resolver lo cambia. No es blanco y negro puros, que es lo
    // que elegiría autoContrast solo.
    verdeInk: '#08170F',
    // El ámbar que se LEE, igual que `shuTxt` con el shu: el relleno de la
    // barra del semáforo va en `ambar`, pero como cifra sobre la página ese
    // da 2,35:1. En oscuro alcanza el mismo; el bloque `light` lo baja.
    ambarTxt: '#C8A23E',
    // El verde que se lee SOBRE PAPEL. El significado revelado del quiz sale
    // en verde -es la recompensa de haber acertado-, pero el jade de la app
    // está calibrado contra superficies oscuras y sobre la hoja crema da
    // 2,41:1. Éste es el jade dos tonos más oscuro: 4,99:1 sobre el papel.
    // No tiene variante por tema porque el papel tampoco: es un material.
    verdePapel: '#32674E',
  },
});

/**
 * Lo de `theme.other` que también hace falta desde CSS.
 *
 * `other` sólo existe en JS, así que hasta acá el azul del foco vivía dos
 * veces: como token acá y como `#6c8cff` escrito a mano en globals.css -y el
 * token, de hecho, no lo leía nadie-. El papel y el sumi van a hacer falta
 * en CSS sí o sí cuando la hoja de 原稿用紙 entre en el quiz, así que en vez
 * de sumar una segunda copia se expone el diccionario.
 *
 * Van en `variables` y no en `dark`: no dependen del esquema de color. El
 * papel es un MATERIAL -una hoja no se vuelve oscura porque la app lo sea- y
 * el foco es el mismo en los dos.
 */
/**
 * Lo de `theme.other` que también hace falta desde CSS, y la versión clara de
 * todo lo que cambia con el esquema.
 *
 * `other` sólo existe en JS y no sabe de esquemas, así que cualquier token
 * que tenga que cambiar entre claro y oscuro TIENE que viajar por acá. Por
 * eso `borderSoft` y el ámbar dejaron de leerse con `useMantineTheme()` en
 * los componentes: en JS se habrían quedado con el valor oscuro.
 *
 * El bloque `light` redefine la escala `dark` de Mantine. Suena raro, pero es
 * lo correcto: esta app usa `dark.N` como SU escala semántica -`dark.3` es
 * «placeholder», no «gris oscuro»- y la usa en todos lados. Redefiniendo esas
 * diez variables en esquema claro, cada componente se acomoda solo, igual que
 * pasó al cambiar el array de índigo a tinta.
 *
 * `jade.6` y `shu.6` también se redefinen. Los dos son TEXTO en la app -la
 * pestaña activa, cada mensaje de error, cada botón de Borrar- y sobre una
 * página clara el jade da 2,7:1 y el shu 3,2:1. Los tonos 8 de sus propias
 * escalas dan 5,96:1 y 5,72:1, así que no hace falta inventar colores: ya
 * están en la rampa.
 */
export const cssVariablesResolver: CSSVariablesResolver = (t) => ({
  variables: {
    // El papel y la tinta que va encima NO cambian: son un material.
    '--knd-papel': t.other.papel,
    '--knd-sumi': t.other.sumi,
    '--knd-sumi-dim': t.other.sumiDim,
    '--knd-pauta': t.other.pauta,
    '--knd-verde-papel': t.other.verdePapel,
    // Éstos sí cambian; acá van sus valores de esquema oscuro.
    '--knd-papel-off': t.other.papelOff,
    '--knd-papel-ink': t.other.papelInk,
    '--knd-papel-ink-dim': t.other.papelInkDim,
    '--knd-border-soft': t.other.borderSoft,
    '--knd-ambar': t.other.ambar,
    '--knd-shu-txt': t.other.shuTxt,
    '--knd-scrim': t.other.scrim,
    '--knd-sombra-modal': t.other.sombraModal,
    '--knd-sombra-hoja': t.other.sombraHoja,
    '--knd-switch-thumb': t.other.switchThumbActiveBg,
    '--knd-verde-ink': t.other.verdeInk,
    '--knd-ambar-txt': t.other.ambarTxt,
  },
  light: {
    // La escala de tinta, invertida en VALOR y no en nombre: `dark.0` sigue
    // siendo el texto más fuerte y `dark.7` el fondo de la página.
    '--mantine-color-dark-0': '#1B211D',
    '--mantine-color-dark-1': '#39423B',
    '--mantine-color-dark-2': '#5C655D',
    '--mantine-color-dark-3': '#8A928A',
    '--mantine-color-dark-4': '#CBD0C9',
    '--mantine-color-dark-5': '#E6E9E3',
    '--mantine-color-dark-6': '#FBFCF9',
    '--mantine-color-dark-7': '#F1F3EE',
    '--mantine-color-dark-8': '#FDFEFC',
    '--mantine-color-dark-9': '#FFFFFF',

    // Las semánticas que Mantine no deriva de `dark` en esquema claro.
    '--mantine-color-body': '#F1F3EE',
    '--mantine-color-text': '#1B211D',
    '--mantine-color-default': '#FBFCF9',
    '--mantine-color-default-hover': '#E6E9E3',
    '--mantine-color-default-border': '#CBD0C9',
    '--mantine-color-default-color': '#1B211D',
    '--mantine-color-dimmed': '#5C655D',
    '--mantine-color-placeholder': '#8A928A',

    // Los acentos, bajados hasta que se lean como texto sobre papel claro.
    // El verde del canvas para claro. Da 5,07:1 como texto y 4,68:1 de
    // relleno contra la página, así que no hacía falta bajarlo más -yo había
    // puesto uno más oscuro de la propia rampa y se apartaba del diseño-.
    '--mantine-color-jade-6': '#2C7A54',
    '--mantine-color-jade-filled': '#2C7A54',
    '--mantine-color-jade-filled-hover': '#234836',
    '--mantine-primary-color-filled': '#2C7A54',
    '--mantine-primary-color-filled-hover': '#234836',
    // `shu.6` no se toca acá y el texto tampoco: es el mismo `#C4402E` que en
    // oscuro. Un solo shu, como en la paleta del canvas.
    '--knd-shu-txt': '#C4402E',
    // Sobre el verde claro la letra se da vuelta: la regla del diseño es «lo
    // que se apoya sobre verde va en verdeInk», y ese token cambia por tema.
    '--knd-verde-ink': '#F2F7F4',
    // El ámbar del canvas mide 2,35:1 como texto sobre la página clara -y
    // 2,16:1 incluso como relleno de barra-, así que la CIFRA usa este, que
    // es el `ambarTxt` de la paleta clara del diseño: 4,91:1. El relleno de
    // la barra sigue siendo el ámbar de siempre, que ahí es una marca.
    '--knd-ambar-txt': '#8A6A12',
    '--knd-scrim': 'rgba(27,33,29,.34)',
    '--knd-sombra-modal': '0 18px 48px rgba(25,23,19,.18)',
    // Más corta y mucho más liviana: sobre una página clara, el negro al 35%
    // del tema oscuro es una mancha. Son los valores del canvas.
    '--knd-sombra-hoja': '0 8px 24px rgba(25,23,19,.14)',

    // El papel apagado se va en TEMPERATURA, no en claridad: en claro no hay
    // lugar para bajar 33 puntos de L* sin quedar más oscuro que la página.
    // Deja de ser crema y pasa a ser un gris neutro, que al lado de una hoja
    // cálida se lee como apagado aunque la diferencia de luz sea chica.
    '--knd-papel-off': '#D2D1CB',
    '--knd-papel-ink': '#6E6A62',
    '--knd-papel-ink-dim': '#908B81',
    '--knd-border-soft': '#E6E9E3',
    '--knd-ambar': '#8A6A12',
    // Sobre el verde hondo de claro, la bolita va clara.
    '--knd-switch-thumb': '#F2F7F4',
  },
  dark: {},
});
