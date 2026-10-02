import '@mantine/core/styles.css';
import './globals.css';
import type { Viewport } from 'next';
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';
import { Providers } from '../components/Providers';
import { AppShell } from '../components/AppShell';
import { headers } from 'next/headers';
import { userAgent } from 'next/server';
import { M_PLUS_2, M_PLUS_1_Code, Zen_Kaku_Gothic_New, Zen_Old_Mincho } from 'next/font/google';
import { APP_NAME, APP_DESCRIPTION } from '../lib/app-meta';

/**
 * Las cuatro familias, auto-hospedadas por Next en vez de pedidas a Google.
 *
 * Antes venían por un `<link rel="stylesheet">` a fonts.googleapis.com, y eso
 * es lo que más caro salía de toda la app: esa hoja bloquea el primer pintado
 * y, al cubrir el japonés entero de cuatro familias, Google la devuelve con
 * 1.321 reglas `@font-face` -324 KB gzip, más que TODO el JS junto-. Medido
 * con la red a 10 Mbps: arrancaba a los 86ms y terminaba a los 666. Y medido
 * causalmente: bloqueando esa URL, el primer pintado bajaba de 980ms a 418.
 *
 * Con `next/font` el CSS se inlinea en el documento -cero requests, cero
 * conexión a un tercero, cero bloqueo- y los archivos de fuente se sirven
 * desde el mismo origen.
 *
 * `preload: false` no es opcional acá: una fuente japonesa no tiene un subset
 * con nombre, se sirve partida en más de cien rangos unicode, y precargarlos
 * todos sería peor que el problema que estamos resolviendo. Sin precarga, el
 * navegador baja únicamente los rangos que la página realmente usa.
 *
 * Y cada peso pedido es un juego COMPLETO de rangos: con japonés, cada peso
 * cuesta más de cien reglas `@font-face`. Por eso acá se pide lo mínimo:
 *
 *  - Las dos familias de M PLUS tienen versión VARIABLE, así que se pide sin
 *    `weight`: un solo juego de archivos cubre todos los pesos en vez de uno
 *    por peso. Cuatro pesos de la de interfaz pasan a ser uno.
 *  - Las dos japonesas no tienen variable, así que van con los pesos que la
 *    app realmente les pide: el kana de las listas se usa en 400 y 500
 *    -medido, no hay ningún `fw` de 700 sobre `.kana`- y la mincho, que es
 *    sólo glifo de rótulo, únicamente en 400. Si alguna vez hace falta una
 *    negrita ahí, el navegador la sintetiza.
 */
const fUi = M_PLUS_2({
  display: 'swap',
  preload: false,
  variable: '--knd-f-ui',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
});
const fMono = M_PLUS_1_Code({
  display: 'swap',
  preload: false,
  variable: '--knd-f-mono',
  fallback: ['ui-monospace', 'monospace'],
});
const fKana = Zen_Kaku_Gothic_New({
  weight: ['400', '500'],
  display: 'swap',
  preload: false,
  variable: '--knd-f-kana',
  fallback: ['sans-serif'],
});
const fMincho = Zen_Old_Mincho({
  weight: ['400'],
  display: 'swap',
  preload: false,
  variable: '--knd-f-mincho',
  fallback: ['Georgia', 'serif'],
});

const FONTS = [fUi, fMono, fKana, fMincho].map((f) => f.variable).join(' ');

export const metadata = { title: APP_NAME, description: APP_DESCRIPTION };
// `interactiveWidget: 'resizes-content'` le pide al navegador que, cuando
// aparezca el teclado virtual, achique el LAYOUT viewport y no solo el
// visual. Se deja porque no cuesta nada y ayuda donde se respeta, pero NO
// se puede depender de esto: medido en un iPhone real con el teclado
// abierto, `innerHeight` daba 721 contra un `visualViewport.height` de 425,
// o sea que el layout viewport se quedó del alto completo igual. Por eso
// QuizRunner.tsx dimensiona la pantalla del quiz leyendo `visualViewport`
// directo, que es el único que reporta el alto realmente visible.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  interactiveWidget: 'resizes-content',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Si es un teléfono lo decide el SERVIDOR, por el user-agent, y no el CSS.
  //
  // Hasta ahora la app mandaba las DOS navegaciones en cada página -la barra
  // de arriba y la de pestañas de abajo- y escondía una con una media query.
  // Funcionaba, pero significa mandar siempre marcado que nadie va a ver, y
  // duplicar en el DOM algo que no es un detalle sino la navegación entera.
  //
  // El precio, dicho sin vueltas: achicar la ventana en una laptop ya no
  // cambia la navegación, porque el user-agent no cambia. Es una capacidad que
  // se pierde a cambio de mandar una sola versión. Lo fino -qué entra en una
  // fila, cuántas columnas tiene una grilla- lo sigue decidiendo el CSS, que
  // para eso sí reacciona al ancho real.
  //
  // El modo dispositivo de las herramientas de desarrollo manda user-agent de
  // móvil, así que emular un teléfono ahí sigue mostrando el teléfono.
  const { device } = userAgent({ headers: await headers() });
  const phone = device.type === 'mobile';

  return (
    <html lang="es" className={FONTS} data-phone={phone || undefined} {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body>
        <Providers>
          <AppShell phone={phone}>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
