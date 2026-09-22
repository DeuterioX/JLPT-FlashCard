import { Group, Text } from '@mantine/core';
import Image from 'next/image';
import logo from '../public/logo.png';
import { APP_NAME } from '../lib/app-meta';

/**
 * La marca de la app: el zorro y el nombre.
 *
 * Vive acá y no copiada en cada cabecera porque ya divergieron una vez: al
 * cambiar el logo, el quiz -que no pasa por `AppShell`, se dibuja a pantalla
 * completa- se quedó con el cuadrado de la あ que tenían las dos antes. Con
 * un solo componente eso no puede volver a pasar.
 *
 * El zorro va a 34px: comprobado renderizando a tamaño real y ampliando sin
 * interpolar, a 24 y 26 la cara se empasta y abajo de 30 se pierden los
 * anteojos. La cabecera del quiz compensa ese alto con menos padding, así
 * que mide lo mismo que antes (ver la nota en QuizRunner).
 *
 * `alt` vacío a propósito: el nombre está al lado, así que un lector de
 * pantalla que anunciara la imagen estaría repitiendo.
 */
export function Brand({ id, nameId }: { id?: string; nameId?: string }) {
  return (
    <Group id={id} gap={7} wrap="nowrap">
      <Image
        src={logo}
        alt=""
        width={34}
        height={34}
        priority
        style={{ width: '2.125rem', height: 'auto', flexShrink: 0 }}
      />
      <Text id={nameId} fw={700} size="sm">{APP_NAME}</Text>
    </Group>
  );
}
