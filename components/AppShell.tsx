'use client';

import { AppShell as MantineShell, Group, Text, Anchor, Box, rem } from '@mantine/core';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Brand } from './Brand';
import { PHONE_QUERY } from '@/lib/client/screen';
import { ThemeToggle } from './ThemeToggle';

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
 * Teléfono o escritorio: el servidor adivina, la pantalla manda.
 *
 * El user-agent decide qué navegación VIAJA en el HTML, así que se manda una
 * sola y no las dos -que era el punto de sacarlo del CSS-. Pero esa decisión
 * se toma una vez, al pedir el documento, y hay dos casos donde queda vieja:
 * achicar la ventana de una laptop, y cambiar el modo dispositivo de las
 * herramientas de desarrollo sin recargar. En los dos el user-agent no cambia
 * y el ancho sí.
 *
 * Así que después de montar manda el ancho. El `useEffect` corre DESPUÉS de la
 * hidratación, así que el servidor y el primer render del cliente coinciden
 * siempre -que era el motivo por el que esto no se hacía con `useMediaQuery` a
 * secas-, y recién ahí se corrige si hace falta. En un teléfono de verdad el
 * servidor ya acertó y no se corrige nada.
 *
 * El atributo `data-phone` del `<html>` se mueve junto, porque el CSS lo usa
 * para elegir entre la barra de pantalla y la miga.
 */
function usePhone(fromUA: boolean) {
  const [phone, setPhone] = useState(fromUA);
  useEffect(() => {
    const mq = window.matchMedia(PHONE_QUERY);
    const apply = () => {
      setPhone(mq.matches);
      document.documentElement.toggleAttribute('data-phone', mq.matches);
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return phone;
}

/**
 * La navegación: barra de pestañas abajo en teléfono, barra arriba en
 * escritorio. Se manda UNA de las dos, no las dos.
 *
 * Quién decide es el servidor, por el user-agent, en `app/layout.tsx`. Antes
 * se mandaban siempre las dos y el CSS escondía una; eso evitaba el parpadeo
 * de `useMediaQuery` -que devuelve un valor en el servidor y otro al montar-
 * pero significaba duplicar en el DOM la navegación entera de la app en cada
 * página.
 *
 * Lo que NO decide el user-agent es el resto del layout. Cuántas columnas
 * tiene una grilla o qué entra en una fila lo sigue resolviendo el CSS contra
 * el ancho real, que para eso sí es la herramienta correcta. El corte de ese
 * CSS es el `sm` de Mantine (768px), el mismo que usa la grilla de
 * Estadísticas: una sola escala en toda la app.
 *
 * La altura de la barra de pestañas (con su safe-area incluida) vive en
 * `app/globals.css`, en la variable `--knd-bottom-offset`: `ActionBar` y
 * `.knd-main-pb` la leen para no quedar tapados por esta barra ni duplicar el
 * padding de la zona segura.
 */
export function AppShell({ children, phone: phoneUA }: { children: React.ReactNode; phone: boolean }) {
  const path = usePathname();
  const phone = usePhone(phoneUA);

  // El quiz se muestra a pantalla completa: sin navegación que distraiga.
  if (path === '/quiz') return <>{children}</>;

  return (
    <MantineShell header={{ height: 48 }} padding="md">
      {/* El header está SIEMPRE, también en teléfono: no es sólo navegación,
          lleva la marca, y Práctica y Estadísticas no traen otra barra arriba.
          Además reserva los 48px del `padding-top` del main, que la barra de
          pantalla de Mazos (`fixed`) ocupa al taparlo. Lo que viaja sólo en
          escritorio son los links y el botón de tema. */}
      <MantineShell.Header id="app-header">
        <Group h="100%" px="md" gap="xl" wrap="nowrap">
          <Brand id="app-brand" nameId="app-name" />
          {!phone && (<>
          {/* Cada link es su propia "píldora" (padding + radio + fondo en
              el activo), como en el diseño -no solo un `gap` entre textos
              sueltos, que es lo que los dejaba pegoteados. */}
          <Group id="nav-desktop" gap={4}>
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
          {/* Al ras de la derecha, separado de la navegación: no es un lugar
              más al que ir, es una preferencia. */}
          {/* Falta decidir dónde va en teléfono. */}
          <Box ml="auto">
            <ThemeToggle id="theme-toggle" />
          </Box>
          </>)}
        </Group>
      </MantineShell.Header>

      <MantineShell.Main id="main" className="knd-main-pb">
        {children}
      </MantineShell.Main>

      {phone && (
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
      )}
    </MantineShell>
  );
}
