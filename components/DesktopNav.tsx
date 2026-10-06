'use client';

import { Anchor, Group } from '@mantine/core';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LINKS, isActive } from '@/lib/nav';
import styles from './DesktopNav.module.css';

/**
 * La navegación de escritorio: los links, dentro del header de la app. El header y la marca no son de acá, porque también están en
 * teléfono.
 */
export function DesktopNav() {
  const path = usePathname();

  return (
    <Group id="nav-desktop" gap={4}>
      {LINKS.map((l) => {
        const active = isActive(path, l.href);
        return (
          <Anchor
            key={l.href}
            id={`nav-desktop-${l.id}`}
            component={Link}
            href={l.href}
            size="sm"
            /* La píldora entera -color, fondo, radio y relleno- vive en
               `.${styles.navLink}`, no en props: Mantine escribe `bg`, `px` y
               `py` inline, y un estilo inline le gana tanto a la regla del
               hover como a la clase. De hecho le ganaba: el radio y el
               relleno de la clase no llegaban a verse nunca. */
            className={active ? `${styles.navLink} ${styles.navLinkOn}` : styles.navLink}
            underline="never"
          >
            {l.label}
          </Anchor>
        );
      })}
    </Group>
  );
}
