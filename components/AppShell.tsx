'use client';

import { AppShell as MantineShell, Group, Text, Anchor, Box, rem } from '@mantine/core';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Brand } from './Brand';

// `id` es el sufijo del `id=""` de cada link (`nav-desktop-practice`,
// `nav-mobile-stats`, ...), para poder referirse a uno puntual sin depender
// de su posición ni de su texto visible.
// El ícono de cada pestaña es un KANJI en mincho, no un pictograma de una
// librería: 文 «escritura» para Práctica, 冊 «volumen encuadernado» para Mazos
// y 計 «cuenta, medición» para Estadísticas. Es la decisión del canvas y no un
// adorno: los tres son la misma familia de trazo que el resto de los rótulos
// japoneses de la app -los encabezados de sección, los títulos de modal-, así
// que la barra de abajo deja de ser el único lugar con dibujos de otra
// procedencia. Los de Bootstrap seguían siendo los de la maqueta vieja.
const LINKS = [
  { href: '/', label: 'Práctica', jp: '文', id: 'practice' },
  { href: '/decks', label: 'Mazos', jp: '冊', id: 'decks' },
  { href: '/stats', label: 'Estadísticas', jp: '計', id: 'stats' },
];

/**
 * Un link de navegación está activo cuando la pantalla ESTÁ DENTRO de su
 * sección, no sólo cuando la ruta coincide exacta: editar un grupo es
 * `/decks/3/groups/7`, que sigue siendo Mazos. Se compara contra `href + '/'`
 * y no con un `startsWith(href)` pelado para que un futuro `/decksomething`
 * no encienda Mazos. Práctica, que vive en `/`, queda cubierta por la
 * igualdad: su prefijo sería `//`, que ninguna ruta empieza así.
 */
function isActive(path: string, href: string) {
  return path === href || path.startsWith(`${href}/`);
}

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
      <MantineShell.Header id="app-header">
        <Group h="100%" px="md" gap="xl">
          <Brand id="app-brand" nameId="app-name" />
          {/* Cada link es su propia "píldora" (padding + radio + fondo en
              el activo), como en el diseño -no solo un `gap` entre textos
              sueltos, que es lo que los dejaba pegoteados. */}
          <Group id="nav-desktop" gap={4} className="knd-nav-desktop">
            {LINKS.map((l) => (
              <Anchor
                key={l.href}
                id={`nav-desktop-${l.id}`}
                component={Link}
                href={l.href}
                size="sm"
                px="sm"
                py={4}
                /* Los colores los pone `.knd-nav-link` y no un `c=`, porque
                   Mantine escribe ese prop inline y un estilo inline le gana
                   a la regla del hover. */
                className={`knd-nav-link${isActive(path, l.href) ? ' knd-nav-link-on' : ''}`}
                bg={isActive(path, l.href) ? 'dark.5' : undefined}
                underline="never"
                style={{ borderRadius: 'var(--mantine-radius-sm)' }}
              >
                {l.label}
              </Anchor>
            ))}
          </Group>
        </Group>
      </MantineShell.Header>

      <MantineShell.Main id="main" className="knd-main-pb">
        {children}
      </MantineShell.Main>

      <Box
        pos="fixed"
        bottom={0}
        left={0}
        right={0}
        id="nav-mobile"
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
            id={`nav-mobile-${l.id}`}
            component={Link}
            href={l.href}
            underline="never"
            /* Columna centrada y no `text-align: center`: centrar es trabajo
               de la celda, no del glifo. */
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              /* El `gap: 1px` del mockup. Es poco, pero con el `lh` de abajo
                 es lo que separa la etiqueta del ícono. */
              gap: '0.0625rem',
            }}
            c={isActive(path, l.href) ? 'jade.6' : 'dimmed'}
          >
            {/* 18px y `lh: 1.2`, como en el `tabbar()` del canvas. */}
            <Text className="mincho" size={rem(18)} lh={1.2}>{l.jp}</Text>
            {/* El `lh` explícito no es decorativo: Mantine no resuelve un
                `size` en string libre contra `theme.lineHeights` y devuelve
                una caja de línea MENOR que la letra -medido, 11px de caja
                para 11px de letra, o sea interlineado 1-, que le come el
                descendente a «Práctica» y la pega al ícono. El mockup usa
                1.3. Es el mismo problema que ya está anotado en `ListRow`. */}
            <Text size="11px" lh={1.3}>{l.label}</Text>
          </Anchor>
        ))}
      </Box>
    </MantineShell>
  );
}
