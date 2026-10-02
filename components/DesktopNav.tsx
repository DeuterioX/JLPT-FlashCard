'use client';

import { Anchor, Box, Group } from '@mantine/core';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LINKS, isActive } from '@/lib/nav';
import { ThemeToggle } from './ThemeToggle';

/**
 * La navegación de escritorio: los links y el botón de tema, dentro del header
 * de la app. El header y la marca no son de acá, porque también están en
 * teléfono.
 */
export function DesktopNav() {
  const path = usePathname();

  return (
    <>
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
              px="sm"
              py={4}
              /* Color por clase y no por `c=`: Mantine lo escribe inline y le
                 ganaría a la regla del hover. */
              className={`knd-nav-link${active ? ' knd-nav-link-on' : ''}`}
              bg={active ? 'dark.5' : undefined}
              underline="never"
              style={{ borderRadius: 'var(--mantine-radius-sm)' }}
            >
              {l.label}
            </Anchor>
          );
        })}
      </Group>
      {/* Falta decidir dónde va en teléfono. */}
      <Box ml="auto">
        <ThemeToggle id="theme-toggle" />
      </Box>
    </>
  );
}
