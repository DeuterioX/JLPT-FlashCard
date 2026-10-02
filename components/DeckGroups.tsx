'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Stack, Group, Text, Button, Paper, Divider, Modal, Anchor, rem,
} from '@mantine/core';
import { Screen } from './Screen';
import { RenameButton } from './RenameButton';
import { SectionLabel } from './SectionLabel';
import { BuiltinDot } from './BuiltinDot';
import { SwipeRow } from './SwipeRow';
import { ModalActions } from './ModalActions';
import { PaperField } from './PaperField';
import { ModalTitle } from './ModalTitle';
import { errorFrom } from '@/lib/client/errors';
import { useAction } from '@/lib/client/action';
import type { DeckSummary } from '@/lib/services/decks';

/**
 * Grupos de un mazo. Es la misma lista que Mazos un nivel más abajo -mismas
 * filas, mismos botones, en el mismo orden- porque un grupo es el mismo tipo
 * de objeto que un mazo: se BORRA desde el listado y se RENOMBRA desde
 * adentro, igual que un mazo se borra desde DeckList y se renombra desde su
 * propia pantalla.
 *
 * Un mazo de un solo grupo SÍ llega acá, con su única fila y el Borrar
 * apagado: un mazo necesita al menos un grupo. Acá decía que
 * `app/decks/[id]/page.tsx` redirige directo a las cartas en ese caso; no
 * existe tal redirect -no hay ninguno en toda la app fuera del quiz- y el
 * `disabled` de más abajo no es una rama muerta.
 */
export function DeckGroups({ deck }: { deck: DeckSummary }) {
  const router = useRouter();
  const readOnly = deck.isBuiltin;

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(deck.name);
  const renameDeckAction = useAction();

  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const createGroupAction = useAction();

  // Renombrar un GRUPO, que es distinto de renombrar el mazo de arriba. El
  // diseño lo pone en cada fila; antes sólo se podía desde adentro del grupo.
  const [gRename, setGRename] = useState<DeckSummary['groups'][number] | null>(null);
  const [gRenameValue, setGRenameValue] = useState('');
  const renameGroupAction = useAction();

  const [confirm, setConfirm] = useState<DeckSummary['groups'][number] | null>(null);
  const deleteGroupAction = useAction();

  const renameDeck = () => renameDeckAction.run(async () => {
    const res = await fetch(`/api/decks/${deck.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: renameValue }),
    });
    if (!res.ok) return errorFrom(res);
    setRenameOpen(false);
    router.refresh();
  });

  const createGroup = () => createGroupAction.run(async () => {
    const res = await fetch(`/api/decks/${deck.id}/groups`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    if (!res.ok) return errorFrom(res);
    setNewOpen(false);
    setNewName('');
    router.refresh();
  });

  function openGRename(g: DeckSummary['groups'][number]) {
    setGRenameValue(g.name);
    renameGroupAction.setError(null);
    setGRename(g);
  }

  const renameGroupName = () => renameGroupAction.run(async () => {
    if (!gRename) return;
    const res = await fetch(`/api/groups/${gRename.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: gRenameValue }),
    });
    if (!res.ok) return errorFrom(res);
    setGRename(null);
    router.refresh();
  });

  const deleteGroup = () => deleteGroupAction.run(async () => {
    if (!confirm) return;
    const res = await fetch(`/api/groups/${confirm.id}`, { method: 'DELETE' });
    if (!res.ok) return errorFrom(res);
    setConfirm(null);
    router.refresh();
  });

  return (
    <Screen nav={{
      id: 'deck-header',
      levels: [{ label: 'Mazos', href: '/decks' }, { label: deck.name }],
      currentId: 'deck-name',
      currentClassName: 'kana',
      action: readOnly ? <BuiltinDot /> : (
        <RenameButton id="rename-deck-btn" onClick={() => { setRenameValue(deck.name); renameDeckAction.setError(null); setRenameOpen(true); }} />
      ),
    }}>
      <Stack id="deck-groups-screen" gap="md">
        <Group className="knd-sect-row" gap={10} wrap="nowrap">
          <SectionLabel id="groups-count" jp="組">
            {`${deck.groups.length} grupos · ${deck.cardCount} cartas`}
          </SectionLabel>
          {readOnly
            ? <Text className="romaji" size={rem(9)} tt="uppercase" c="dark.3" style={{ letterSpacing: '0.08em' }}>sólo lectura</Text>
            : (
              <Button id="new-group-btn" size="compact-sm" onClick={() => { setNewName(''); createGroupAction.setError(null); setNewOpen(true); }}>
                + Nuevo grupo
              </Button>
            )}
        </Group>

        <Paper id="groups-list" withBorder style={{ overflow: 'hidden' }}>
          {deck.groups.map((g, i) => (
            <div key={g.id} id={`group-row-${g.id}`}>
              {i > 0 && <Divider color={'var(--knd-border-soft)'} />}
              {/* Renombrar a la izquierda, Borrar a la derecha, y Borrar no
                  aparece cuando es el último grupo -un mazo necesita al menos
                  uno-, que en escritorio es el botón apagado de más abajo. */}
              <SwipeRow
                label={g.name}
                tappable
                onTap={() => router.push(`/decks/${deck.id}/groups/${g.id}`)}
                leading={readOnly
                  ? undefined
                  : { etiqueta: 'Renombrar', onAction: () => openGRename(g) }}
                trailing={readOnly || deck.groups.length === 1
                  ? undefined
                  : { etiqueta: 'Borrar', onAction: () => { deleteGroupAction.setError(null); setConfirm(g); } }}
              >
              <Group
                gap={12}
                wrap="nowrap"
                style={{ padding: '0.625rem 0.8125rem' }}
              >
                {/* `knd-swipe-pin`: el nombre no se va de pantalla cuando el gesto
                    corre la fila para descubrir Borrar. Ver globals.css. */}
                <Stack gap={0} className="knd-swipe-pin" style={{ flex: 1, minWidth: 0 }}>
                  {/* El nombre ES el enlace. Antes el único elemento enfocable
                      de la fila era el botón «Ver cartas», y al sacarlo -la
                      fila entera ya navega al tocarla- el teclado se quedaba
                      sin camino. Además esto devuelve el clic derecho y el
                      abrir en otra pestaña, que un `onClick` no da. */}
                  <Anchor
                    component={Link}
                    href={`/decks/${deck.id}/groups/${g.id}`}
                    underline="never"
                    c="var(--mantine-color-text)"
                    size={rem(13)}
                    lh={1.45}
                    fw={500}
                    className="kana"
                  >
                    {g.name}
                  </Anchor>
                  <Text size={rem(11)} lh={1.45} c="dark.3">
                    {g.cardCount === 1 ? '1 carta' : `${g.cardCount} cartas`}
                  </Text>
                </Stack>
                <Group className="knd-group-actions" gap={5} wrap="nowrap">
                  {/* El último grupo no se borra: una carta siempre pertenece a
                      uno, así que el mazo necesita al menos uno. */}
                  {!readOnly && (
                    <Button
                      id={`group-delete-${g.id}`}
                      variant="subtle" color="shu.6" size="compact-xs" className="knd-row-delete"
                      disabled={deck.groups.length === 1}
                      title={deck.groups.length === 1 ? 'El mazo necesita al menos un grupo' : undefined}
                      onClick={() => { deleteGroupAction.setError(null); setConfirm(g); }}
                    >
                      Borrar
                    </Button>
                  )}
                  {!readOnly && (
                    <Button
                      id={`group-rename-${g.id}`}
                      variant="default" size="compact-xs"
                      onClick={() => openGRename(g)}
                    >
                      Renombrar
                    </Button>
                  )}
                </Group>
              </Group>
              </SwipeRow>
            </div>
          ))}
        </Paper>

        <Modal id="rename-deck-modal" opened={renameOpen} onClose={() => setRenameOpen(false)} title={<ModalTitle jp="改">Renombrar mazo</ModalTitle>}>
          <Stack
            component="form"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              if (!renameValue.trim() || renameDeckAction.busy) return;
              void renameDeck();
            }}
          >
            <PaperField
              id="rename-deck-input" label="Nombre"
              value={renameValue} onChange={(e) => setRenameValue(e.currentTarget.value)}
            />
            {renameDeckAction.error && <Text c="var(--knd-shu-txt)" size="sm">{renameDeckAction.error}</Text>}
            <ModalActions onCancel={() => setRenameOpen(false)} busy={renameDeckAction.busy}>
              <Button type="submit" disabled={!renameValue.trim() || renameDeckAction.busy} loading={renameDeckAction.busy}>
                Guardar
              </Button>
            </ModalActions>
          </Stack>
        </Modal>

        <Modal
          id="rename-group-row-modal"
          opened={!!gRename}
          onClose={() => setGRename(null)}
          title={<ModalTitle jp="改">Renombrar grupo</ModalTitle>}
        >
          <Stack
            component="form"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              if (!gRenameValue.trim() || renameGroupAction.busy) return;
              void renameGroupName();
            }}
          >
            <PaperField
              id="rename-group-row-input" label="Nombre"
              value={gRenameValue} onChange={(e) => setGRenameValue(e.currentTarget.value)}
            />
            {renameGroupAction.error && <Text c="var(--knd-shu-txt)" size="sm">{renameGroupAction.error}</Text>}
            <ModalActions onCancel={() => setGRename(null)} busy={renameGroupAction.busy}>
              <Button type="submit" disabled={!gRenameValue.trim() || renameGroupAction.busy} loading={renameGroupAction.busy}>
                Guardar
              </Button>
            </ModalActions>
          </Stack>
        </Modal>

        <Modal id="new-group-modal" opened={newOpen} onClose={() => setNewOpen(false)} title={<ModalTitle jp="新">Nuevo grupo</ModalTitle>}>
          <Stack
            component="form"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              if (!newName.trim() || createGroupAction.busy) return;
              void createGroup();
            }}
          >
            <PaperField
              id="new-group-input" label="Nombre" placeholder="Verdura"
              value={newName} onChange={(e) => setNewName(e.currentTarget.value)}
            />
            {createGroupAction.error && <Text c="var(--knd-shu-txt)" size="sm">{createGroupAction.error}</Text>}
            <ModalActions onCancel={() => setNewOpen(false)} busy={createGroupAction.busy}>
              <Button type="submit" disabled={!newName.trim() || createGroupAction.busy} loading={createGroupAction.busy}>
                Crear
              </Button>
            </ModalActions>
          </Stack>
        </Modal>

        <Modal id="delete-group-modal" opened={!!confirm} onClose={() => setConfirm(null)} title={<ModalTitle jp="削">¿Borrar el grupo?</ModalTitle>}>
          <Stack gap={14}>
            {/* La frase del diseño: el verbo adelante y en negrita sólo lo que
                desaparece. `deleteGroup` borra en cascada, igual que borrar un
                mazo, así que el número de cartas es parte de la advertencia y no
                un dato de color. */}
            <Text className="knd-delete-note">
              {'Se va a borrar '}
              <b>{`«${confirm?.name ?? ''}»`}</b>
              {' y sus '}
              <b>{confirm?.cardCount === 1 ? '1 carta' : `${confirm?.cardCount ?? 0} cartas`}</b>
              {'. No se puede deshacer.'}
            </Text>
            {deleteGroupAction.error && <Text c="var(--knd-shu-txt)" size="sm">{deleteGroupAction.error}</Text>}
            <ModalActions onCancel={() => setConfirm(null)} busy={deleteGroupAction.busy}>
              <Button color="shu.6" onClick={deleteGroup} loading={deleteGroupAction.busy}>Borrar el grupo</Button>
            </ModalActions>
          </Stack>
        </Modal>
      </Stack>
    </Screen>
  );
}
