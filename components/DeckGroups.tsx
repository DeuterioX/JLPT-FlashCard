'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Stack, Group, Text, Button, Paper, Divider, Modal, TextInput, Anchor, rem, useMantineTheme,
} from '@mantine/core';
import { SectionLabel } from './SectionLabel';
import { BuiltinDot } from './BuiltinDot';
import { errorFrom, NETWORK_ERROR } from '@/lib/client/errors';
import type { DeckSummary } from '@/lib/services/decks';

/**
 * Grupos de un mazo. Es la misma lista que Mazos un nivel más abajo -mismas
 * filas, mismos botones, en el mismo orden- porque un grupo es el mismo tipo
 * de objeto que un mazo: se BORRA desde el listado y se RENOMBRA desde
 * adentro, igual que un mazo se borra desde DeckList y se renombra desde su
 * propia pantalla.
 *
 * Un mazo de un solo grupo no llega acá: `app/decks/[id]/page.tsx` redirige
 * directo a sus cartas, porque el nivel de grupos sólo se muestra cuando
 * significa algo.
 */
export function DeckGroups({ deck }: { deck: DeckSummary }) {
  const router = useRouter();
  const { other } = useMantineTheme();
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
      <Group id="deck-header" className="knd-crumb-row" gap="0.5rem">
        {/* La barra va como elemento APARTE, no dentro del texto del enlace.
            Con «Mazos /» adentro, el separador queda con un espacio de texto
            de un lado y el `gap` del Group del otro, así que la miga se ve
            distinta a la de la pantalla de palabras, que sí lo separa. Y un
            espacio literal pegado a un tag es lo que CLAUDE.md prohíbe:
            puede colapsar a ancho cero. */}
        <Anchor
          id="deck-breadcrumb" className="knd-crumb"
          component={Link} href="/decks" size="sm" underline="hover"
        >
          Mazos
        </Anchor>
        <Text c="dark.3" size="sm">/</Text>
        <Text id="deck-name" fw={700} size={rem(15)} lh={1.4} className="kana">{deck.name}</Text>
        {/* En un mazo incluido el punto ocupa el lugar del botón: sin él, la
            ausencia de acciones se lee como "falta algo" y no como "esto no
            se edita". */}
        {readOnly ? <BuiltinDot /> : (
          <Button
            id="rename-deck-btn"
            variant="default" bg="transparent" size="compact-xs"
            onClick={() => { setRenameValue(deck.name); setRenameError(null); setRenameOpen(true); }}
          >
            Renombrar
          </Button>
        )}
      </Group>

      <Group className="knd-sect-row" gap={10} wrap="nowrap">
        <SectionLabel id="groups-count">
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

      <Paper id="groups-list" withBorder style={{ overflow: 'hidden' }}>
        {deck.groups.map((g, i) => (
          <div key={g.id} id={`group-row-${g.id}`}>
            {i > 0 && <Divider color={other.borderSoft} />}
            <Group
              gap={12}
              wrap="nowrap"
              style={{ padding: '0.625rem 0.8125rem' }}
              className="knd-row-tap"
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('button, a, input')) return;
                router.push(`/decks/${deck.id}/groups/${g.id}`);
              }}
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
              <Group gap={5} wrap="nowrap">
                {/* El último grupo no se borra: una carta siempre pertenece a
                    uno, así que el mazo necesita al menos uno. */}
                {!readOnly && (
                  <Button
                    id={`group-delete-${g.id}`}
                    variant="subtle" color="shu.6" size="compact-xs"
                    disabled={deck.groups.length === 1}
                    title={deck.groups.length === 1 ? 'El mazo necesita al menos un grupo' : undefined}
                    onClick={() => { setDelError(null); setConfirm(g); }}
                  >
                    Borrar
                  </Button>
                )}
              </Group>
            </Group>
          </div>
        ))}
      </Paper>

      <Modal id="rename-deck-modal" opened={renameOpen} onClose={() => setRenameOpen(false)} title="Renombrar mazo">
        <Stack
          component="form"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (!renameValue.trim() || renameBusy) return;
            void renameDeck();
          }}
        >
          <TextInput
            id="rename-deck-input" label="Nombre"
            value={renameValue} onChange={(e) => setRenameValue(e.currentTarget.value)}
          />
          {renameError && <Text c="shu.6" size="sm">{renameError}</Text>}
          <Button type="submit" disabled={!renameValue.trim() || renameBusy} loading={renameBusy}>
            Guardar
          </Button>
        </Stack>
      </Modal>

      <Modal id="new-group-modal" opened={newOpen} onClose={() => setNewOpen(false)} title="Nuevo grupo">
        <Stack
          component="form"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (!newName.trim() || newBusy) return;
            void createGroup();
          }}
        >
          <TextInput
            id="new-group-input" label="Nombre" placeholder="Verdura"
            value={newName} onChange={(e) => setNewName(e.currentTarget.value)}
          />
          {newError && <Text c="shu.6" size="sm">{newError}</Text>}
          <Button type="submit" disabled={!newName.trim() || newBusy} loading={newBusy}>
            Crear
          </Button>
        </Stack>
      </Modal>

      <Modal id="delete-group-modal" opened={!!confirm} onClose={() => setConfirm(null)} title="¿Borrar el grupo?">
        <Stack>
          {/* El diálogo nombra lo que se lleva puesto: `deleteGroup` borra en
              cascada, igual que borrar un mazo. */}
          <Text size="sm">
            {confirm && `Se va «${confirm.name}» con ${
              confirm.cardCount === 1 ? '1 carta' : `${confirm.cardCount} cartas`
            } y sus intentos registrados. No se puede deshacer.`}
          </Text>
          {delError && <Text c="shu.6" size="sm">{delError}</Text>}
          <Group>
            <Button variant="default" onClick={() => setConfirm(null)} disabled={delBusy}>Cancelar</Button>
            <Button color="shu.6" onClick={deleteGroup} loading={delBusy}>Borrar grupo</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
