import { Button, Group } from '@mantine/core';
import { useTranslations } from 'next-intl';

/**
 * El pie de un modal: Cancelar y después la acción, en una fila pegada a la
 * derecha.
 *
 * Estaba distinto en cada modal: los de formulario tenían UN botón a ancho
 * completo y sin salida -cerrar era la ✕ de la esquina o Esc-, y los de
 * borrar tenían los dos pero alineados a la izquierda. El diseño los arma
 * todos igual, y que una acción destructiva tenga su Cancelar al lado no es
 * decoración: es la salida.
 *
 * Cancelar va PRIMERO en el DOM y por lo tanto también en el tabulador: desde
 * un campo, el primer Tab cae en la salida y no en el botón que ejecuta.
 */
export function ModalActions({
  onCancel, busy, children,
}: {
  onCancel: () => void;
  /** Mientras la acción corre, cancelar tampoco: la petición ya salió. */
  busy?: boolean;
  /** El botón que ejecuta. */
  children: React.ReactNode;
}) {
  const t = useTranslations('common');
  return (
    <Group justify="flex-end" gap="xs" wrap="nowrap">
      <Button variant="default" onClick={onCancel} disabled={busy}>
        {t('cancel')}
      </Button>
      {children}
    </Group>
  );
}
