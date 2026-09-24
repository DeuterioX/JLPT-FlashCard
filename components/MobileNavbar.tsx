import { Group, Text, Anchor } from '@mantine/core';
import Link from 'next/link';
import { Brand } from './Brand';

/**
 * La barra de arriba en teléfono: volver, la marca, dónde estás y la acción
 * de la pantalla.
 *
 * Ocupa el lugar de la barra del AppShell -misma altura, mismo fondo- en vez
 * de sumarse a ella, y por eso la miga desaparece del contenido: los 46px
 * verticales que ocupaba se devuelven a la lista.
 *
 * El «volver» es un ENLACE al nivel de arriba, no `history.back()`. Con
 * historial, entrando por un enlace compartido o después de recargar te saca
 * de la app; y si llegaste a un grupo desde Estadísticas, «atrás» te devuelve
 * a Estadísticas en vez de subir al mazo. Son dos gestos distintos a
 * propósito: éste sube en la jerarquía y el del sistema vuelve en el
 * historial.
 */
export function MobileNavbar({
  up, title, action,
}: {
  /** El nivel de arriba. Sin esto no hay flecha: es la pantalla raíz. */
  up?: { href: string; label: string };
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <Group className="knd-mobile-navbar" gap="0.5rem" wrap="nowrap">
      {up && (
        <Anchor
          className="knd-navbar-back"
          component={Link}
          href={up.href}
          aria-label={`Volver a ${up.label}`}
          underline="never"
        >
          <svg
            /* En `rem` y no en px, para que acompañe al resto cuando la app
               escala subiendo el `font-size` de la raíz. Son los mismos 15px
               a escala 100%. */
            viewBox="0 0 16 16" fill="none"
            stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true"
            style={{ width: '0.9375rem', height: '0.9375rem' }}
          >
            <path d="M10 3 5 8l5 5" />
          </svg>
        </Anchor>
      )}
      {/* Sólo el zorro, sin «Kitsune Cards»: la flecha, la marca y el título
          son tres cosas compitiendo por 368px, y la que no puede perder es la
          que dice dónde estás. El nombre de la app queda a un toque, en la
          raíz. */}
      <Brand withName={false} />
      <Text className="knd-navbar-title" fw={700} size="sm" lh={1.4}>{title}</Text>
      {action && <Group className="knd-navbar-action" gap={6} wrap="nowrap">{action}</Group>}
    </Group>
  );
}
