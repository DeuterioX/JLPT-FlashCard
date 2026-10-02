import { Box, Group, Text } from '@mantine/core';
import Image from 'next/image';
import logo from '../public/logo.png';
import { APP_NAME, APP_NAME_JP } from '../lib/app-meta';

/**
 * La marca de la app: el zorro y el nombre.
 *
 * Vive acá y no copiada en cada cabecera porque ya divergieron una vez: al
 * cambiar el logo, el quiz -que no pasa por `AppShell`, se dibuja a pantalla
 * completa- se quedó con el cuadrado de la あ que tenían las dos antes. Con
 * un solo componente eso no puede volver a pasar.
 *
 * El zorro va a 34px (`.knd-brand-logo`). La cabecera del quiz compensa ese
 * alto con menos padding, así que mide lo mismo que antes (ver la nota en
 * QuizRunner).
 *
 * `alt` vacío a propósito: el nombre está al lado, así que un lector de
 * pantalla que anunciara la imagen estaría repitiendo.
 */
export function Brand({
  id, nameId, withName = true,
}: {
  id?: string;
  nameId?: string;
  /** Sin nombre donde el ancho está peleado y el zorro alcanza para la
      identidad -la barra de teléfono, que además lleva título propio-. */
  withName?: boolean;
}) {
  return (
    <Group id={id} gap={7} wrap="nowrap">
      {/* El tamaño lo pone `.knd-brand-logo`: se mide por ALTO y no por ancho
          -ver la clase-. `width`/`height` siguen acá porque Next los pide para
          reservar el lugar y no es lo mismo que el tamaño con el que se pinta. */}
      <Image src={logo} alt="" width={34} height={34} priority className="knd-brand-logo" />
      {withName && (
        <Box>
          <Text id={nameId} fw={700} size="sm" lh={1.25}>{APP_NAME}</Text>
          {/* El nombre en katakana, más chico y más fino: acompaña al nombre,
              no compite con él. Los dos juntos siguen midiendo menos que el
              zorro, así que la barra no crece. */}
          <Text className="kana knd-brand-sub" aria-hidden>{APP_NAME_JP}</Text>
        </Box>
      )}
    </Group>
  );
}
