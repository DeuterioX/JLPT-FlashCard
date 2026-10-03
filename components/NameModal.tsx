'use client';

import { useState, type FormEvent } from 'react';
import { Button, Modal, Stack, Text } from '@mantine/core';
import { ModalTitle } from './ModalTitle';
import { ModalActions } from './ModalActions';
import { PaperField } from './PaperField';
import { useAction } from '@/lib/client/action';

/**
 * Un modal de UN campo de texto: renombrar algo, o crearlo con un nombre.
 *
 * Esta forma estaba escrita cuatro veces -renombrar mazo, renombrar grupo
 * desde la lista, renombrar grupo desde su pantalla, nuevo grupo- y las cuatro
 * cargaban con lo mismo: el estado del campo, la línea de error, y la
 * condición de «vacío u ocupado» repetida en el `onSubmit` y en el `disabled`
 * del botón. Olvidarse de una de las dos no se nota hasta que alguien manda el
 * formulario vacío.
 *
 * Se queda con el estado y con la acción, así que el llamador sólo dice qué
 * pedirle a la API. El cuerpo devuelve el mensaje de error, o nada si anduvo,
 * igual que en cualquier otro `useAction`.
 */
export function NameModal({
  id, opened, onClose, jp, title, ...campo
}: Props) {
  return (
    <Modal
      id={`${id}-modal`}
      opened={opened}
      onClose={onClose}
      title={<ModalTitle jp={jp}>{title}</ModalTitle>}
    >
      {/* El formulario sólo existe mientras el modal está abierto, y por eso
          arranca limpio cada vez: con el nombre que toca y sin el error de la
          vez anterior. Renombrar dos grupos seguidos usa el mismo modal, así
          que con el estado afuera el segundo abría con el nombre del primero. */}
      {opened && <Formulario id={id} onClose={onClose} {...campo} />}
    </Modal>
  );
}

type Props = {
  /** Prefijo de los ids: `${id}-modal` y `${id}-input`. */
  id: string;
  opened: boolean;
  onClose: () => void;
  /** El kanji del título. */
  jp: string;
  title: string;
  label: string;
  placeholder?: string;
  /** Con qué arranca el campo. */
  initial?: string;
  /** El verbo del botón: «Guardar», «Crear». */
  submit: string;
  /**
   * Id del botón que envía, si alguien lo necesita. No se deriva de `id`: el
   * botón que ABRE el modal ya suele llamarse `${id}-btn` -«rename-deck-btn»,
   * «new-group-btn»-, y derivarlo dejaba dos elementos con el mismo id en la
   * página.
   */
  submitId?: string;
  onSubmit: (value: string) => Promise<string | void>;
};

function Formulario({
  id, onClose, label, placeholder, initial = '', submit, submitId, onSubmit,
}: Omit<Props, 'opened' | 'jp' | 'title'>) {
  const [value, setValue] = useState(initial);
  const action = useAction();
  const frenado = !value.trim() || action.busy;

  return (
    <Stack
      component="form"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        if (frenado) return;
        void action.run(() => onSubmit(value));
      }}
    >
      <PaperField
        id={`${id}-input`}
        label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.currentTarget.value)}
      />
      {action.error && <Text c="var(--knd-shu-txt)" size="sm">{action.error}</Text>}
      <ModalActions onCancel={onClose} busy={action.busy}>
        <Button id={submitId} type="submit" disabled={frenado} loading={action.busy}>
          {submit}
        </Button>
      </ModalActions>
    </Stack>
  );
}
