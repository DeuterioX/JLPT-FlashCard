'use client';

import { Box, Group } from '@mantine/core';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Brand } from './Brand';
import { DesktopNav } from './DesktopNav';
import { MobileNav } from './MobileNav';
import { usePhone } from '@/lib/client/screen';
import styles from './AppShell.module.css';

/**
 * Header, contenido y barra de pestañas, en una columna donde sólo el
 * contenido scrollea (ver `.${styles.shell}` en globals.css).
 *
 * Viaja UNA navegación, la que decidió el user-agent en `app/layout.tsx`, y no
 * las dos con el CSS escondiendo una. El resto del layout -columnas, qué entra
 * en una fila- sí lo resuelve el CSS contra el ancho real, con el corte en el
 * `sm` de Mantine.
 */
export function AppShell({ children, phone: phoneUA }: { children: React.ReactNode; phone: boolean }) {
  const path = usePathname();
  const phone = usePhone(phoneUA);
  const main = useRef<HTMLElement>(null);

  // El `main` vive en el layout y persiste entre navegaciones, con su scroll:
  // Next sólo resetea el de la ventana, que ya no scrollea.
  useEffect(() => { main.current?.scrollTo(0, 0); }, [path]);

  // El quiz va a pantalla completa, sin navegación.
  if (path === '/quiz') return <>{children}</>;

  return (
    <div className={styles.shell}>
      {/* También en teléfono, por la marca: Práctica y Estadísticas no traen
          otra barra. Donde la pantalla trae la suya, el CSS la apaga. */}
      <Box component="header" id="app-header" className={styles.appHeader} bg="dark.6">
        <Group h="100%" px="md" gap="xl" wrap="nowrap">
          <Brand id="app-brand" nameId="app-name" />
          {!phone && <DesktopNav />}
        </Group>
      </Box>

      <Box component="main" id="main" ref={main} className={styles.main}>
        {children}
      </Box>

      {phone && <MobileNav />}
    </div>
  );
}
