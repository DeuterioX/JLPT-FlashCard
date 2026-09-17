'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Stack, Group, Text, Button, Paper, TextInput, Divider, Box, Modal } from '@mantine/core';
import { toRomaji } from '@/lib/kana/transliterate';
import type { DeckSummary } from '@/lib/services/decks';

export type EditorCard = {
  id: number; prompt: string; meaning: string | null; primary: string; groupId: number;
};

const GENERIC_ERROR = 'No se pudo completar la acción. Probá de nuevo.';
const NETWORK_ERROR = 'No hay conexión con el servidor. Probá de nuevo.';

/** Lee el `error` del body de una respuesta no-OK; si no vino como JSON, el genérico. */
async function errorFrom(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.error === 'string') return body.error;
  } catch {
    // el body no vino como JSON: se usa el mensaje genérico
  }
  return GENERIC_ERROR;
}

export function DeckEditor({
  deck, cards,
}: { deck: DeckSummary; cards: EditorCard[] }) {
  const router = useRouter();

  // El panel de diccionario se conecta en la Task 16: por ahora solo hace
  // falta el setter para dejar el botón enchufado (queda deshabilitado, así
  // que nunca se dispara todavía).
  const [, setDictOpen] = useState(false);

  const [selectedGroupId, setSelectedGroupId] = useState(deck.groups[0]?.id ?? 0);
  // Si el grupo elegido ya no existe (se borró desde otro lado y llegó un
  // `router.refresh()`), se cae al primero. Se deriva en el render -no en un
  // efecto- para no sincronizar estado que ya se puede calcular al vuelo.
  const groupId = deck.groups.some((g) => g.id === selectedGroupId)
    ? selectedGroupId
    : (deck.groups[0]?.id ?? 0);

  const [prompt, setPrompt] = useState('');
  const [romaji, setRomaji] = useState('');
  const [meaning, setMeaning] = useState('');
  // Si el usuario tocó el romaji, dejamos de pisárselo con el autocompletado.
  const [romajiTouched, setRomajiTouched] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const addRef = useRef(false);

  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const deleteRef = useRef(false);

  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [groupBusy, setGroupBusy] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);
  const groupRef = useRef(false);

  // Un solo grupo: se esconde la columna y se ve una lista plana.
  const showGroups = deck.groups.length > 1;
  const visible = cards.filter((c) => c.groupId === groupId);

  function onPrompt(value: string) {
    setPrompt(value);
    if (!romajiTouched) setRomaji(toRomaji(value));
  }

  async function add() {
    if (addRef.current) return;
    addRef.current = true;
    setAddBusy(true);
    setAddError(null);
    try {
      const res = await fetch(`/api/groups/${groupId}/cards`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt, meaning: meaning || null, answers: [romaji] }),
      });
      if (!res.ok) {
        setAddError(await errorFrom(res));
        return;
      }
      setPrompt('');
      setRomaji('');
      setMeaning('');
      setRomajiTouched(false);
      router.refresh();
    } catch {
      setAddError(NETWORK_ERROR);
    } finally {
      addRef.current = false;
      setAddBusy(false);
    }
  }

  async function removeCard(id: number) {
    if (deleteRef.current) return;
    deleteRef.current = true;
    setDeletingId(id);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/cards/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        setDeleteError(await errorFrom(res));
        return;
      }
      router.refresh();
    } catch {
      setDeleteError(NETWORK_ERROR);
    } finally {
      deleteRef.current = false;
      setDeletingId(null);
    }
  }

  function openGroupModal() {
    setNewGroupName('');
    setGroupError(null);
    setGroupModalOpen(true);
  }

  async function createGroup() {
    if (groupRef.current) return;
    groupRef.current = true;
    setGroupBusy(true);
    setGroupError(null);
    try {
      const res = await fetch(`/api/decks/${deck.id}/groups`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: newGroupName }),
      });
      if (!res.ok) {
        setGroupError(await errorFrom(res));
        return;
      }
      setGroupModalOpen(false);
      setNewGroupName('');
      router.refresh();
    } catch {
      setGroupError(NETWORK_ERROR);
    } finally {
      groupRef.current = false;
      setGroupBusy(false);
    }
  }

  return (
    <Stack gap="md">
      <Group>
        <Text c="dimmed" size="sm">Mazos /</Text>
        <Text fw={700} className="kana">{deck.name}</Text>
        <Group ml="auto" gap="xs">
          {!deck.isBuiltin && (
            <Button
              variant="default"
              size="compact-sm"
              onClick={() => setDictOpen(true)}
              disabled
              title="Disponible pronto"
            >
              Buscar en el diccionario
            </Button>
          )}
        </Group>
      </Group>

      <Group align="flex-start" wrap="wrap" gap="md">
        {showGroups && (
          <Stack gap={3} w={180}>
            <Text size="xs" tt="uppercase" c="dimmed">Grupos</Text>
            {deck.groups.map((g) => (
              <Button
                key={g.id}
                variant={g.id === groupId ? 'light' : 'subtle'}
                justify="space-between"
                rightSection={<Text size="xs" c="dimmed" className="tabular">{g.cardCount}</Text>}
                onClick={() => setSelectedGroupId(g.id)}
                fullWidth
              >
                {g.name}
              </Button>
            ))}
            <Button variant="subtle" c="dimmed" onClick={openGroupModal} fullWidth>
              + Nuevo grupo
            </Button>
          </Stack>
        )}

        <Stack gap="sm" style={{ flex: 1, minWidth: 280 }}>
          <Paper withBorder>
            {visible.map((c, i) => (
              <Box key={c.id}>
                {i > 0 && <Divider />}
                <Group px="sm" py="xs" wrap="nowrap">
                  <Text className="kana" w={90}>{c.prompt}</Text>
                  <Text className="romaji" size="sm" c="dimmed" w={80}>{c.primary}</Text>
                  <Text size="sm" c="dimmed" style={{ flex: 1 }}>{c.meaning ?? ''}</Text>
                  {!deck.isBuiltin && (
                    <Button
                      variant="subtle"
                      color="shu"
                      size="compact-xs"
                      onClick={() => removeCard(c.id)}
                      loading={deletingId === c.id}
                      disabled={deletingId !== null}
                    >
                      ✕
                    </Button>
                  )}
                </Group>
              </Box>
            ))}
            {visible.length === 0 && (
              <Text p="md" size="sm" c="dimmed">Todavía no hay cartas en este grupo.</Text>
            )}
          </Paper>
          {deleteError && <Text c="shu.6" size="sm">{deleteError}</Text>}

          {!deck.isBuiltin && (
            <Paper withBorder p="sm">
              <Stack gap="xs">
                <Text size="xs" fw={600}>Nueva palabra</Text>
                <Group gap="xs" align="flex-end" wrap="wrap">
                  <TextInput
                    id="nueva-kana" label="Kana" placeholder="えび" w={130}
                    value={prompt} onChange={(e) => onPrompt(e.currentTarget.value)}
                  />
                  <TextInput
                    id="nueva-romaji" label="Romaji" placeholder="ebi" w={120}
                    value={romaji}
                    onChange={(e) => { setRomajiTouched(true); setRomaji(e.currentTarget.value); }}
                  />
                  <TextInput
                    id="nueva-meaning" label="Significado" placeholder="camarón" w={160}
                    value={meaning} onChange={(e) => setMeaning(e.currentTarget.value)}
                  />
                  <Button
                    onClick={add}
                    disabled={!prompt.trim() || !romaji.trim() || addBusy}
                    loading={addBusy}
                  >
                    Agregar
                  </Button>
                </Group>
                {addError && <Text c="shu.6" size="sm">{addError}</Text>}
                <Text size="xs" c="dimmed">
                  El romaji se completa solo desde el kana. Editalo si hace falta:
                  la っ de がっこう o las vocales largas de スーパー no siempre salen solas.
                </Text>
              </Stack>
            </Paper>
          )}
        </Stack>
      </Group>

      <Modal opened={groupModalOpen} onClose={() => setGroupModalOpen(false)} title="Nuevo grupo">
        <Stack>
          <TextInput
            id="nuevo-grupo-nombre" label="Nombre" placeholder="Verdura"
            value={newGroupName} onChange={(e) => setNewGroupName(e.currentTarget.value)}
          />
          {groupError && <Text c="shu.6" size="sm">{groupError}</Text>}
          <Button
            onClick={createGroup}
            disabled={!newGroupName.trim() || groupBusy}
            loading={groupBusy}
          >
            Crear
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}
