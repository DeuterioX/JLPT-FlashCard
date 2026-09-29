'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Stack, Group, Text, Button, Paper, Divider, Modal, Anchor, rem,
} from '@mantine/core';
import { Navbar } from './Navbar';
import { RenameButton } from './RenameButton';
import { SectionLabel } from './SectionLabel';
import { BuiltinDot } from './BuiltinDot';
import { SwipeRow } from './SwipeRow';
import { ModalActions } from './ModalActions';
import { CampoPapel } from './CampoPapel';
import { ModalTitle } from './ModalTitle';
import { errorFrom, NETWORK_ERROR } from '@/lib/client/errors';
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
  const [renameBusy, setRenameBusy] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const renameRef = useRef(false);

  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBusy, setNewBusy] = useState(false);
  const [newError, setNewError] = useState<string | null>(null);
  const newRef = useRef(false);

  // Renombrar un GRUPO, que es distinto de renombrar el mazo de arriba. El
  // diseño lo pone en cada fila; antes sólo se podía desde adentro del grupo.
  const [gRename, setGRename] = useState<DeckSummary['groups'][number] | null>(null);
  const [gRenameValue, setGRenameValue] = useState('');
  const [gRenameBusy, setGRenameBusy] = useState(false);
  const [gRenameError, setGRenameError] = useState<string | null>(null);
  const gRenameRef = useRef(false);

  const [confirm, setConfirm] = useState<DeckSummary['groups'][number] | null>(null);
  const [delBusy, setDelBusy] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);
  const delRef = useRef(false);

  async function renameDeck() {
    if (renameRef.current) return;
    renameRef.current = true;
    setRenameBusy(true);
    setRenameError(null);
    try {
      const res = await fetch(`/api/decks/${deck.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: renameValue }),
      });
      if (!res.ok) {
        setRenameError(await errorFrom(res));
        return;
      }
      setRenameOpen(false);
      router.refresh();
    } catch {
      setRenameError(NETWORK_ERROR);
    } finally {
      renameRef.current = false;
      setRenameBusy(false);
    }
  }

  async function createGroup() {
    if (newRef.current) return;
    newRef.current = true;
    setNewBusy(true);
    setNewError(null);
    try {
      const res = await fetch(`/api/decks/${deck.id}/groups`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      if (!res.ok) {
        setNewError(await errorFrom(res));
        return;
      }
      setNewOpen(false);
      setNewName('');
      router.refresh();
    } catch {
      setNewError(NETWORK_ERROR);
    } finally {
      newRef.current = false;
      setNewBusy(false);
    }
  }

  function openGRename(g: DeckSummary['groups'][number]) {
    setGRenameValue(g.name);
    setGRenameError(null);
    setGRename(g);
  }

  async function renameGroupName() {
    if (gRenameRef.current || !gRename) return;
    gRenameRef.current = true;
    setGRenameBusy(true);
    setGRenameError(null);
    try {
      const res = await fetch(`/api/groups/${gRename.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: gRenameValue }),
      });
      if (!res.ok) {
        setGRenameError(await errorFrom(res));
        return;
      }
      setGRename(null);
      router.refresh();
    } catch {
      setGRenameError(NETWORK_ERROR);
    } finally {
      gRenameRef.current = false;
      setGRenameBusy(false);
    }
  }

  async function deleteGroup() {
    if (delRef.current || !confirm) return;
    delRef.current = true;
    setDelBusy(true);
    setDelError(null);
    try {
      const res = await fetch(`/api/groups/${confirm.id}`, { method: 'DELETE' });
      if (!res.ok) {
        setDelError(await errorFrom(res));
        return;
      }
      setConfirm(null);
      router.refresh();
    } catch {
      setDelError(NETWORK_ERROR);
    } finally {
      delRef.current = false;
      setDelBusy(false);
    }
  }

  return (
    <Stack id="deck-groups-screen" gap="md">
      <Navbar
        id="deck-header"
        levels={[{ label: 'Mazos', href: '/decks' }, { label: deck.name }]}
        currentId="deck-name"
        currentClassName="kana"
        action={readOnly ? <BuiltinDot /> : (
          <RenameButton id="rename-deck-btn" onClick={() => { setRenameValue(deck.name); setRenameError(null); setRenameOpen(true); }} />
        )}
      />

      <Group className="knd-sect-row" gap={10} wrap="nowrap">
        <SectionLabel id="groups-count" jp="組">
          {`${deck.groups.length} grupos · ${deck.cardCount} cartas`}
        </SectionLabel>
        {readOnly
          ? <Text className="romaji" size={rem(9)} tt="uppercase" c="dark.3" style={{ letterSpacing: '0.08em' }}>sólo lectura</Text>
          : (
            <Button id="new-group-btn" size="compact-sm" onClick={() => { setNewName(''); setNewError(null); setNewOpen(true); }}>
              + Nuevo grupo
            </Button>
          )}
      </Group>

      <Paper id="groups-list" className="knd-lista" withBorder style={{ overflow: 'hidden' }}>
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
                : { etiqueta: 'Borrar', onAction: () => { setDelError(null); setConfirm(g); } }}
            >
            <Group
              gap={12}
              wrap="nowrap"
              style={{ padding: '0.625rem 0.8125rem' }}
            >
              <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
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
                    variant="subtle" color="shu.6" size="compact-xs" className="knd-borrar-fila"
                    disabled={deck.groups.length === 1}
                    title={deck.groups.length === 1 ? 'El mazo necesita al menos un grupo' : undefined}
                    onClick={() => { setDelError(null); setConfirm(g); }}
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
            if (!renameValue.trim() || renameBusy) return;
            void renameDeck();
          }}
        >
          <CampoPapel
            id="rename-deck-input" label="Nombre"
            value={renameValue} onChange={(e) => setRenameValue(e.currentTarget.value)}
          />
          {renameError && <Text c="var(--knd-shu-txt)" size="sm">{renameError}</Text>}
          <ModalActions onCancel={() => setRenameOpen(false)} busy={renameBusy}>
            <Button type="submit" disabled={!renameValue.trim() || renameBusy} loading={renameBusy}>
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
            if (!gRenameValue.trim() || gRenameBusy) return;
            void renameGroupName();
          }}
        >
          <CampoPapel
            id="rename-group-row-input" label="Nombre"
            value={gRenameValue} onChange={(e) => setGRenameValue(e.currentTarget.value)}
          />
          {gRenameError && <Text c="var(--knd-shu-txt)" size="sm">{gRenameError}</Text>}
          <ModalActions onCancel={() => setGRename(null)} busy={gRenameBusy}>
            <Button type="submit" disabled={!gRenameValue.trim() || gRenameBusy} loading={gRenameBusy}>
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
            if (!newName.trim() || newBusy) return;
            void createGroup();
          }}
        >
          <CampoPapel
            id="new-group-input" label="Nombre" placeholder="Verdura"
            value={newName} onChange={(e) => setNewName(e.currentTarget.value)}
          />
          {newError && <Text c="var(--knd-shu-txt)" size="sm">{newError}</Text>}
          <ModalActions onCancel={() => setNewOpen(false)} busy={newBusy}>
            <Button type="submit" disabled={!newName.trim() || newBusy} loading={newBusy}>
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
          <Text className="knd-borrar-nota">
            {'Se va a borrar '}
            <b>{`«${confirm?.name ?? ''}»`}</b>
            {' y sus '}
            <b>{confirm?.cardCount === 1 ? '1 carta' : `${confirm?.cardCount ?? 0} cartas`}</b>
            {'. No se puede deshacer.'}
          </Text>
          {delError && <Text c="var(--knd-shu-txt)" size="sm">{delError}</Text>}
          <ModalActions onCancel={() => setConfirm(null)} busy={delBusy}>
            <Button color="shu.6" onClick={deleteGroup} loading={delBusy}>Borrar el grupo</Button>
          </ModalActions>
        </Stack>
      </Modal>
    </Stack>
  );
}
