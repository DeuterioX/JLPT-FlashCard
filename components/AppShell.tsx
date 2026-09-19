'use client';

import { AppShell as MantineShell, Group, Text, Anchor, Box } from '@mantine/core';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { APP_NAME } from '../lib/app-meta';

const LINKS = [
  { href: '/', label: 'Práctica', glyph: 'あ' },
  { href: '/decks', label: 'Mazos', glyph: '▤' },
  { href: '/stats', label: 'Estadísticas', glyph: '◷' },
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
 *
 * La altura de la barra de pestañas (con su safe-area incluida) también vive
 * en `app/globals.css`, en la variable `--knd-bottom-offset`: `ActionBar` y
 * `.knd-main-pb` la leen para no quedar tapados por esta barra ni duplicar
 * el padding de la zona segura.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  // El quiz se muestra a pantalla completa: sin navegación que distraiga.
  if (path === '/quiz') return <>{children}</>;

  return (
    <MantineShell header={{ height: 48 }} padding="md">
      <MantineShell.Header>
        <Group h="100%" px="md" gap="xl">
          <Group gap={7}>
            {/* `.brand i` del diseño: la marca va invertida -fondo claro,
                texto oscuro- adentro de un cuadrado chico con las puntas
                redondeadas, no como texto suelto. */}
            <Box
              className="kana"
              style={{
                width: '1.375rem',
                height: '1.375rem',
                display: 'grid',
                placeItems: 'center',
                borderRadius: '0.3125rem',
                background: 'var(--mantine-color-text)',
                color: 'var(--mantine-color-body)',
                fontSize: '0.75rem',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              あ
            </Box>
            <Text fw={700} size="sm">{APP_NAME}</Text>
          </Group>
          {/* Cada link es su propia "píldora" (padding + radio + fondo en
              el activo), como en el diseño -no solo un `gap` entre textos
              sueltos, que es lo que los dejaba pegoteados. */}
          <Group gap={4} className="knd-nav-desktop">
            {LINKS.map((l) => (
              <Anchor
                key={l.href}
                component={Link}
                href={l.href}
                size="sm"
                px="sm"
                py={4}
                c={path === l.href ? undefined : 'dimmed'}
                bg={path === l.href ? 'dark.5' : undefined}
                underline="never"
                style={{ borderRadius: 'var(--mantine-radius-sm)' }}
              >
                {l.label}
              </Anchor>
            ))}
          </Group>
        </Group>
      </MantineShell.Header>

      <MantineShell.Main className="knd-main-pb">
        {children}
      </MantineShell.Main>

      <Box
        pos="fixed"
        bottom={0}
        left={0}
        right={0}
        className="knd-nav-mobile"
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
            <Text size="11px">{l.label}</Text>
          </Anchor>
        ))}
      </Box>
    </MantineShell>
  );
}
