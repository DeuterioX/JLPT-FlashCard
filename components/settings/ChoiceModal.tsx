'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Modal, Stack } from '@mantine/core';
import { ModalTitle } from '../ModalTitle';
import { ModalActions } from '../ModalActions';
import { ChoiceList, type Choice } from '../ChoiceList';

/**
 * Elegir el valor de un ajuste: la lista de opciones, Cancelar y Guardar.
 *
 * Con confirmación y no aplicando al tocar, como «Mover palabra»: elegir y
 * ejecutar son dos pasos, y así hay una salida que no cambia nada.
 */
export function ChoiceModal({
  id, opened, onClose, jp, title, value, options, onSave,
}: {
  id: string;
  opened: boolean;
  onClose: () => void;
  jp: string;
  title: string;
  value: string;
  options: Choice[];
  onSave: (value: string) => void;
}) {
  return (
    <Modal id={`${id}-modal`} opened={opened} onClose={onClose} title={<ModalTitle jp={jp}>{title}</ModalTitle>}>
      {/* El cuerpo sólo existe con el modal abierto, así arranca cada vez en el
          valor de ahora y no en lo que se tocó la vez anterior sin guardar. */}
      {opened && <Body id={id} value={value} options={options} onClose={onClose} onSave={onSave} />}
    </Modal>
  );
}

function Body({
  id, value, options, onClose, onSave,
}: {
  id: string;
  value: string;
  options: Choice[];
  onClose: () => void;
  onSave: (value: string) => void;
}) {
  const t = useTranslations('common');
  const [draft, setDraft] = useState(value);
  return (
    <Stack gap={10}>
      <ChoiceList idPrefix={id} value={draft} onChange={setDraft} options={options} />
      <ModalActions onCancel={onClose}>
        <Button id={`${id}-save`} onClick={() => { onSave(draft); onClose(); }}>
          {t('save')}
        </Button>
      </ModalActions>
    </Stack>
  );
}
