'use client';

import { AppShell as MantineShell, Group, Text, Anchor, Box } from '@mantine/core';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const LINKS = [
  { href: '/', label: 'Práctica', glyph: 'あ' },
  { href: '/mazos', label: 'Mazos', glyph: '▤' },
  { href: '/estadisticas', label: 'Estadísticas', glyph: '◷' },
];

/**
 * Navegación responsive sin `useMediaQuery`: ese hook devuelve `undefined`/
 * `false` en el render de servidor y el valor real recién después de montar,
 * lo que puede parpadear o desincronizar la hidratación. Además el breakpoint
 * de diseño es 640px, que no coincide con ningún breakpoint por defecto de
 * Mantine (576/768/992/...), así que ni `visibleFrom`/`hiddenFrom` (que usan
 * esos breakpoints del tema) sirven tal cual. En cambio, los dos bloques de
 * navegación se renderizan siempre y `app/globals.css` decide cuál se ve con
 * un `@media (max-width: 640px)` puro: servidor y cliente arrancan iguales.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  // El quiz se muestra a pantalla completa: sin navegación que distraiga.
  if (path === '/practicar') return <>{children}</>;

  return (
    <MantineShell header={{ height: 48 }} padding="md">
      <MantineShell.Header>
        <Group h="100%" px="md" gap="xl">
          <Group gap={7}>
            <Text className="kana" fw={700} size="sm">あ</Text>
            <Text fw={700} size="sm">Kana Drill</Text>
          </Group>
          <Group gap={4} className="knd-nav-desktop">
            {LINKS.map((l) => (
              <Anchor
                key={l.href}
                component={Link}
                href={l.href}
                size="sm"
                c={path === l.href ? undefined : 'dimmed'}
                underline="never"
              >
                {l.label}
              </Anchor>
            ))}
          </Group>
        </Group>
      </MantineShell.Header>

      <MantineShell.Main className="knd-main-pb">{children}</MantineShell.Main>

      <Box
        pos="fixed"
        bottom={0}
        left={0}
        right={0}
        className="safe-bottom knd-nav-mobile"
        pt={6}
        style={{
          background: 'var(--mantine-color-dark-6)',
          borderTop: '1px solid var(--mantine-color-default-border)',
          zIndex: 100,
        }}
      >
        {LINKS.map((l) => (
          <Anchor
            key={l.href}
            component={Link}
            href={l.href}
            underline="never"
            style={{ flex: 1, textAlign: 'center' }}
            c={path === l.href ? 'jade.6' : 'dimmed'}
          >
            <Text className="kana" size="lg" lh={1.2}>{l.glyph}</Text>
            <Text size="9px">{l.label}</Text>
          </Anchor>
        ))}
      </Box>
    </MantineShell>
  );
}
