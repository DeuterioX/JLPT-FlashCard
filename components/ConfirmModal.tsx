'use client';

import { useEffect, useEffectEvent } from 'react';
import { Button, Modal, Text } from '@mantine/core';
import { ModalTitle } from './ModalTitle';
import { ModalActions } from './ModalActions';
import { useAction } from '@/lib/client/action';
import styles from './ConfirmModal.module.css';

/**
 * El modal que confirma algo que no se puede deshacer.
 *
 * Estaba escrito tres veces -borrar mazo, borrar grupo, borrar palabra- y lo
 * único distinto entre las tres era la frase de la advertencia, que cada
 * pantalla arma con lo que su cascada se lleva puesto. Por eso la frase es
 * `children` y no un prop de texto: lleva negritas y plurales propios.
 */
export function ConfirmModal({
  id, opened, onClose, onClosed, jp, title, confirm, confirmId, onConfirm, enterConfirms, lockScroll, children,
}: {
  /** El id del modal, tal cual: los tres existentes no comparten un patrón. */
  id: string;
  opened: boolean;
  onClose: () => void;
  /** Cuando terminó de cerrarse: recién ahí se puede mover el foco afuera. */
  onClosed?: () => void;
  jp: string;
  title: string;
  /** El verbo del botón rojo: «Borrar el mazo». */
  confirm: string;
  confirmId?: string;
  onConfirm: () => Promise<string | void>;
  /** Enter confirma y Esc cancela. Sólo para lo que no borra nada. */
  enterConfirms?: boolean;
  /** `false` si la pantalla de abajo ya bloquea el scroll por su cuenta. */
  lockScroll?: boolean;
  /** La advertencia, con sus negritas. */
  children: React.ReactNode;
}) {
  return (
    <Modal
      id={id}
      opened={opened}
      onClose={onClose}
      lockScroll={lockScroll}
      onExitTransitionEnd={onClosed}
      title={<ModalTitle jp={jp}>{title}</ModalTitle>}
    >
      {/* Sólo mientras está abierto: así el error de un intento fallido no
          sigue ahí la próxima vez que se abra. */}
      {opened && (
        <Body confirm={confirm} confirmId={confirmId} onConfirm={onConfirm} onClose={onClose} enterConfirms={enterConfirms}>
          {children}
        </Body>
      )}
    </Modal>
  );
}

function Body({
  confirm, confirmId, onConfirm, onClose, enterConfirms, children,
}: {
  confirm: string;
  confirmId?: string;
  onConfirm: () => Promise<string | void>;
  onClose: () => void;
  enterConfirms?: boolean;
  children: React.ReactNode;
}) {
  const action = useAction();

  // En la ventana y no en el modal: Enter tiene que confirmar aunque el foco
  // todavía no haya llegado.
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    // `preventDefault` también para Enter: si el foco sigue en un input de
    // abajo, su formulario se enviaría.
    if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
    if (e.key === 'Enter' && !e.repeat) void action.run(onConfirm);
  });
  useEffect(() => {
    if (!enterConfirms) return;
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enterConfirms]);

  return (
    // Con `enterConfirms` el foco va al cuerpo y no a un botón: un botón
    // enfocado se activa también con Espacio, que en el quiz es revelar.
    <div
      className={styles.body}
      tabIndex={enterConfirms ? -1 : undefined}
      data-autofocus={enterConfirms || undefined}
    >
      <Text className="knd-delete-note">{children}</Text>
      {action.error && <Text className={`knd-error ${styles.error}`}>{action.error}</Text>}
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
    </div>
  );
}
