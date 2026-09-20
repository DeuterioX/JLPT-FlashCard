import '@mantine/core/styles.css';
import './globals.css';
import type { Viewport } from 'next';
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';
import { Providers } from '../components/Providers';
import { AppShell } from '../components/AppShell';
import { APP_NAME, APP_DESCRIPTION } from '../lib/app-meta';

export const metadata = { title: APP_NAME, description: APP_DESCRIPTION };
// `interactiveWidget: 'resizes-content'`: en Safari/iOS el teclado virtual
// solo achica el "visual viewport" -el `visualViewport.height` que ya lee
// QuizRunner.tsx-, pero el LAYOUT viewport (contra el que se calcula el
// scroll de la página) se queda del alto completo. Esa diferencia es lo
// que confirmó un usuario en un iPhone real: aparecían scrollbars vertical
// y horizontal y el contenido se corría fuera de pantalla, algo que en
// Android Chrome (probado en vivo en un emulador) no pasaba -ahí el
// layout viewport sí se achica solo-. Esta directiva (soporte en Safari
// desde iOS 17.4) le pide al navegador que redimensione el layout viewport
// también, no solo el visual, así el layout entero de la página coincide
// con el área que el teclado deja libre en vez de depender solo del JS.
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
