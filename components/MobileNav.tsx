'use client';

import { Anchor, Box, Text, rem } from '@mantine/core';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LINKS, isActive } from '@/lib/nav';
import styles from './MobileNav.module.css';

/**
 * La navegación de teléfono: la barra de pestañas de abajo.
 *
 * No confundir con `MobileNavbar`, la barra de ARRIBA de las pantallas de
 * Mazos, con la flecha para volver.
 */
export function MobileNav() {
  const path = usePathname();

  return (
    <Box component="nav" id="nav-mobile" className="knd-nav-mobile">
      {LINKS.map((l) => (
        <Anchor
          key={l.href}
          id={`nav-mobile-${l.id}`}
          component={Link}
          href={l.href}
          underline="never"
          /* La pestaña entera -la columna centrada y su color- vive en
             `.${styles.tab}`: `c=` lo escribe Mantine inline, como el `bg` de
             `DesktopNav`. */
          className={isActive(path, l.href) ? `${styles.tab} ${styles.tabOn}` : styles.tab}
        >
          <Text className="mincho" size={rem(18)} lh={1.2}>{l.jp}</Text>
          {/* `lh` explícito: con un `size` libre Mantine deja interlineado 1
              y se come el descendente de «Práctica». */}
          <Text size="11px" lh={1.3}>{l.label}</Text>
        </Anchor>
      ))}
    </Box>
  );
}
