import '@mantine/core/styles.css';
import './globals.css';
import type { Viewport } from 'next';
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';
import { Providers } from '../components/Providers';
import { AppShell } from '../components/AppShell';
import { APP_NAME, APP_DESCRIPTION } from '../lib/app-meta';

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap"
        />
      </head>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
