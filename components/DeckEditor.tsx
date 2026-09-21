'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Stack, Group, Text, Button, Paper, TextInput, Divider, Box, Modal } from '@mantine/core';
import { toRomaji } from '@/lib/kana/transliterate';
import { errorFrom, NETWORK_ERROR } from '@/lib/client/errors';
import { DictSearchPanel } from '@/components/dict/DictSearchPanel';
import type { DeckSummary } from '@/lib/services/decks';

export type EditorCard = {
  id: number; prompt: string; meaning: string | null; primary: string; groupId: number;
};

export function DeckEditor({
  deck, cards, dictionaryLoaded,
}: { deck: DeckSummary; cards: EditorCard[]; dictionaryLoaded: boolean }) {
  const router = useRouter();

  const [dictOpen, setDictOpen] = useState(false);

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
            >
              Buscar en el diccionario
            </Button>
          )}
        </Group>
      </Group>

      <Group align="flex-start" wrap="wrap" gap="md" className="knd-editor-layout">
        {showGroups && (
          <>
            {/* Columna vertical: escritorio. Tira horizontal: teléfono. Los
                dos se renderizan siempre y `app/globals.css` decide cuál se
                ve con el mismo `@media (max-width: 640px)` puro que ya usa
                la navegación (ver AppShell.tsx) -así no hace falta
                `useMediaQuery`, que devuelve un valor distinto en el
                servidor y podría desincronizar la hidratación. */}
            <Stack gap={3} w={180} className="knd-editor-groups-desktop">
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

            <Group gap={6} wrap="nowrap" className="knd-editor-groups-mobile">
              {deck.groups.map((g) => (
                <Button
                  key={g.id}
                  variant={g.id === groupId ? 'light' : 'subtle'}
                  size="compact-sm"
                  onClick={() => setSelectedGroupId(g.id)}
                  style={{ flex: 'none', minHeight: 44 }}
                >
                  {g.name} ({g.cardCount})
                </Button>
              ))}
              <Button
                variant="subtle"
                c="dimmed"
                size="compact-sm"
                onClick={openGroupModal}
                style={{ flex: 'none', minHeight: 44 }}
              >
                + Nuevo grupo
              </Button>
            </Group>
          </>
        )}

        <Stack gap="sm" className="knd-editor-cards" style={{ flex: 1, minWidth: 280 }}>
          <Paper withBorder>
            {visible.map((c, i) => (
              <Box key={c.id}>
                {i > 0 && <Divider />}
                <Group px="sm" py="xs" wrap="nowrap">
                  {/* Una palabra sin espacios (el romaji siempre es una:
                      "arigatougozaimasu") no tiene dónde cortar para el
                      navegador -a diferencia del kana o una `meaning` con
                      varias palabras, que sí envuelven solos- y se
                      desbordaba encima de la columna siguiente en vez de
                      quedarse en su ancho. `wordBreak` fuerza el corte
                      igual. `minWidth: 0` es necesario en un hijo `flex`
                      -por default un flex item no se achica más allá del
                      ancho de su contenido, así que sin esto la fila
                      entera se desbordaba para hacerle lugar-. */}
                  <Text className="kana" c="dimmed" w={90} style={{ wordBreak: 'break-word' }}>{c.prompt}</Text>
                  <Text className="romaji" size="sm" c="dimmed" w={80} style={{ wordBreak: 'break-word' }}>{c.primary}</Text>
                  <Text size="sm" style={{ flex: 1, minWidth: 0, wordBreak: 'break-word' }}>{c.meaning ?? ''}</Text>
                  {!deck.isBuiltin && (
                    <Button
                      variant="subtle"
                      color="shu.6"
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

      {!deck.isBuiltin && (
        <DictSearchPanel
          opened={dictOpen}
          onClose={() => setDictOpen(false)}
          groupId={groupId}
          groupName={deck.groups.find((g) => g.id === groupId)?.name ?? ''}
          dictionaryLoaded={dictionaryLoaded}
        />
      )}
    </Stack>
  );
}
