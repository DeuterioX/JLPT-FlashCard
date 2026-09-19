'use client';

import { MantineProvider } from '@mantine/core';
import { theme } from '../theme';

/**
 * El tema importa acá adentro -no en app/layout.tsx-, que es un Server
 * Component: si `theme` se le pasa a `<MantineProvider>` desde un
 * componente de servidor, Next.js tiene que serializarlo para cruzar al
 * cliente, y una función dentro del tema (como el `styles` de Switch que
 * lee `props.checked`, la forma que documenta Mantine) rompe el build con
 * "Functions cannot be passed directly to Client Components". Con este
 * wrapper, `theme` se construye enteramente del lado del cliente y nunca
 * cruza esa frontera.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      {children}
    </MantineProvider>
  );
}
