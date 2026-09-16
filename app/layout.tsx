import '@mantine/core/styles.css';
import './globals.css';
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from '@mantine/core';
import { theme } from '../theme';
import { AppShell } from '../components/AppShell';

export const metadata = { title: 'Kana Drill' };

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
        <MantineProvider theme={theme} defaultColorScheme="dark">
          <AppShell>{children}</AppShell>
        </MantineProvider>
      </body>
    </html>
  );
}
