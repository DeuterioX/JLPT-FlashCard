'use client';

import { Button, Modal, Stack, Text } from '@mantine/core';
import { ModalTitle } from './ModalTitle';
import { ModalActions } from './ModalActions';
import { useAction } from '@/lib/client/action';

/**
 * El modal que confirma algo que no se puede deshacer.
 *
 * Estaba escrito tres veces -borrar mazo, borrar grupo, borrar palabra- y lo
 * único distinto entre las tres era la frase de la advertencia, que cada
 * pantalla arma con lo que su cascada se lleva puesto. Por eso la frase es
 * `children` y no un prop de texto: lleva negritas y plurales propios.
 */
export function ConfirmModal({
  id, opened, onClose, jp, title, confirm, confirmId, onConfirm, children,
}: {
  /** El id del modal, tal cual: los tres existentes no comparten un patrón. */
  id: string;
  opened: boolean;
  onClose: () => void;
  jp: string;
  title: string;
  /** El verbo del botón rojo: «Borrar el mazo». */
  confirm: string;
  confirmId?: string;
  onConfirm: () => Promise<string | void>;
  /** La advertencia, con sus negritas. */
  children: React.ReactNode;
}) {
  return (
    <Modal
      id={id}
      opened={opened}
      onClose={onClose}
      title={<ModalTitle jp={jp}>{title}</ModalTitle>}
    >
      {/* Sólo mientras está abierto: así el error de un intento fallido no
          sigue ahí la próxima vez que se abra. */}
      {opened && (
        <Body confirm={confirm} confirmId={confirmId} onConfirm={onConfirm} onClose={onClose}>
          {children}
        </Body>
      )}
    </Modal>
  );
}

function Body({
  confirm, confirmId, onConfirm, onClose, children,
}: {
  confirm: string;
  confirmId?: string;
  onConfirm: () => Promise<string | void>;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const action = useAction();

  return (
    <Stack gap={14}>
      <Text className="knd-delete-note">{children}</Text>
      {action.error && <Text className="knd-error" size="sm">{action.error}</Text>}
      <ModalActions onCancel={onClose} busy={action.busy}>
        <Button
          id={confirmId}
          color="shu.6"
          onClick={() => void action.run(onConfirm)}
          loading={action.busy}
          disabled={action.busy}
        >
          {confirm}
        </Button>
      </ModalActions>
    </Stack>
  );
}
