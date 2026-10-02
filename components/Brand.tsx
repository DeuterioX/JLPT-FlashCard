import { Box, Group, Text } from '@mantine/core';
import Image from 'next/image';
import logo from '../public/logo.png';
import { APP_NAME, APP_NAME_JP } from '../lib/app-meta';

/**
 * La marca de la app: el zorro, el nombre y el nombre en katakana.
 *
 * Un solo componente y no copiado en cada cabecera porque ya divergieron una
 * vez: al cambiar el logo, el quiz -que se dibuja a pantalla completa, sin
 * pasar por `AppShell`- se quedó con el cuadrado de la あ.
 *
 * El `alt` vacío y el `aria-hidden` son a propósito: los dos repiten un nombre
 * que ya está escrito al lado.
 */
export function Brand({
  id, nameId, withName = true,
}: {
  id?: string;
  nameId?: string;
  withName?: boolean;
}) {
  return (
    <Group id={id} gap={7} wrap="nowrap">
      <Image src={logo} alt="" width={34} height={34} priority className="knd-brand-logo" />
      {withName && (
        <Box>
          <Text id={nameId} fw={700} size="sm" lh={1.25}>{APP_NAME}</Text>
          <Text className="kana knd-brand-sub" aria-hidden>{APP_NAME_JP}</Text>
        </Box>
      )}
    </Group>
  );
}
