'use client';

import { Group, Text, Anchor, Box, rem } from '@mantine/core';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Brand } from './Brand';
import { PHONE_QUERY } from '@/lib/client/screen';
import { ThemeToggle } from './ThemeToggle';

// `id` es el sufijo del `id=""` de cada link (`nav-desktop-practice`, ...).
// Los íconos de las pestañas son kanji en mincho, como el resto de los rótulos
// japoneses de la app: 文 escritura, 冊 volumen, 計 medición.
const LINKS = [
  { href: '/', label: 'Práctica', jp: '文', id: 'practice' },
  { href: '/decks', label: 'Mazos', jp: '冊', id: 'decks' },
  { href: '/stats', label: 'Estadísticas', jp: '計', id: 'stats' },
];

/**
 * Activo cuando la pantalla está DENTRO de la sección (`/decks/3/groups/7` es
 * Mazos). Contra `href + '/'` para que un `/decksomething` no encienda Mazos.
 */
function isActive(path: string, href: string) {
  return path === href || path.startsWith(`${href}/`);
}

/**
 * Teléfono o escritorio: el servidor adivina por el user-agent, la pantalla
 * manda.
 *
 * El primer render tiene que ser el del servidor, o la hidratación no
 * coincide: por eso arranca con lo que dijo el user-agent y no con un
 * `useMediaQuery`. El ancho se mira recién en el `useEffect`, que corre
 * después de hidratar, y corrige los casos donde el user-agent queda viejo:
 * una laptop con la ventana angosta, o el modo dispositivo de DevTools sin
 * recargar. En un teléfono de verdad no corrige nada.
 *
 * `data-phone` en el `<html>` se mueve junto: el CSS lo usa para elegir entre
 * la barra de pantalla y la miga.
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
 * Header, contenido y barra de pestañas, en una columna donde sólo el
 * contenido scrollea (ver `.knd-shell` en globals.css).
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
    <div className="knd-shell">
      {/* También en teléfono, por la marca: Práctica y Estadísticas no traen
          otra barra. Donde la pantalla trae la suya, el CSS la apaga. */}
      <Box component="header" id="app-header" className="knd-app-header" bg="dark.6">
        <Group h="100%" px="md" gap="xl" wrap="nowrap">
          <Brand id="app-brand" nameId="app-name" />
          {!phone && (<>
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
                /* Color por clase y no por `c=`: Mantine lo escribe inline y
                   le ganaría a la regla del hover. */
                className={`knd-nav-link${isActive(path, l.href) ? ' knd-nav-link-on' : ''}`}
                bg={isActive(path, l.href) ? 'dark.5' : undefined}
                underline="never"
                style={{ borderRadius: 'var(--mantine-radius-sm)' }}
              >
                {l.label}
              </Anchor>
            ))}
          </Group>
          {/* Falta decidir dónde va en teléfono. */}
          <Box ml="auto">
            <ThemeToggle id="theme-toggle" />
          </Box>
          </>)}
        </Group>
      </Box>

      {/* Lo único que scrollea. Una pantalla con barras propias (`Screen`) lo
          llena y scrollea adentro suyo; las demás scrollean acá. */}
      <Box component="main" id="main" ref={main} className="knd-main">
        {children}
      </Box>

      {phone && (
      <Box
        component="nav"
        id="nav-mobile"
        className="knd-nav-mobile"
        style={{
          background: 'var(--mantine-color-dark-6)',
          borderTop: '1px solid var(--mantine-color-default-border)',
        }}
      >
        {LINKS.map((l) => (
          <Anchor
            key={l.href}
            id={`nav-mobile-${l.id}`}
            component={Link}
            href={l.href}
            underline="never"
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.0625rem',
            }}
            c={isActive(path, l.href) ? 'jade.6' : 'dimmed'}
          >
            <Text className="mincho" size={rem(18)} lh={1.2}>{l.jp}</Text>
            {/* `lh` explícito: con un `size` libre Mantine deja interlineado 1
                y se come el descendente de «Práctica». */}
            <Text size="11px" lh={1.3}>{l.label}</Text>
          </Anchor>
        ))}
      </Box>
      )}
    </div>
  );
}
