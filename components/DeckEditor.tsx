'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Stack, Group, Text, Button, Paper, TextInput, Divider, Box, Modal, UnstyledButton, rem,
  useMantineTheme,
} from '@mantine/core';
import { SectionLabel } from './SectionLabel';
import { toRomaji } from '@/lib/kana/transliterate';
import { errorFrom, NETWORK_ERROR } from '@/lib/client/errors';
import { DictSearchPanel } from '@/components/dict/DictSearchPanel';
import type { DeckSummary } from '@/lib/services/decks';

export type EditorCard = {
  id: number; prompt: string; meaning: string | null; primary: string; groupId: number;
};

// Mantine centra el contenido de una `section`; el diseño lo quiere pegado
// al borde izquierdo, con el mismo padding de 11px que tiene la caja.
// Propiedades planas, sin selectores anidados: en Mantine 9 el `styles` de
// un componente no los compila a CSS real (ver la nota de globals.css).
const FIELD_STYLES = {
  section: { justifyContent: 'flex-start', paddingLeft: rem(11) },
} as const;

export function DeckEditor({
  deck, cards, dictionaryLoaded,
}: { deck: DeckSummary; cards: EditorCard[]; dictionaryLoaded: boolean }) {
  const router = useRouter();
  const { other } = useMantineTheme();

  const [dictOpen, setDictOpen] = useState(false);

  const [selectedGroupId, setSelectedGroupId] = useState(deck.groups[0]?.id ?? 0);
  // Si el grupo elegido ya no existe (se borró desde otro lado y llegó un
  // `router.refresh()`), se cae al primero. Se deriva en el render -no en un
  // efecto- para no sincronizar estado que ya se puede calcular al vuelo.
  const groupId = deck.groups.some((g) => g.id === selectedGroupId)
    ? selectedGroupId
    : (deck.groups[0]?.id ?? 0);
  // El panel de alta nombra el grupo al que va a parar la carta
  // ("Nueva palabra en «Pescado»"), como en el diseño.
  const groupName = deck.groups.find((g) => g.id === groupId)?.name ?? '';

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
      <Group id="editor-header">
        {/* `--a-dimmer` y 15px del diseño: el breadcrumb es lo más apagado
            de la línea y el nombre no llega a los 16px del `lg`. */}
        <Text id="editor-breadcrumb" c="dark.3" size="sm">Mazos /</Text>
        <Text id="editor-deck-name" fw={700} size={rem(15)} lh={1.4} className="kana">{deck.name}</Text>
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

      <Group id="editor-layout" align="flex-start" wrap="wrap" gap={14} className="knd-editor-layout">
        {showGroups && (
          <>
            {/* Columna vertical: escritorio. Tira horizontal: teléfono. Los
                dos se renderizan siempre y `app/globals.css` decide cuál se
                ve con el mismo `@media (max-width: 640px)` puro que ya usa
                la navegación (ver AppShell.tsx) -así no hace falta
                `useMediaQuery`, que devuelve un valor distinto en el
                servidor y podría desincronizar la hidratación. */}
            <Stack id="editor-groups" gap={3} w={180} className="knd-editor-groups-desktop">
              <SectionLabel id="editor-groups-title">Grupos</SectionLabel>
              {/* `.it` del diseño, con `UnstyledButton` y no `Button`: el
                  seleccionado va en un gris NEUTRO (`--a-surface-2`), y el
                  `variant="light"` de Mantine lo pintaba con un tinte jade
                  -medido: rgb(13,43,33)-, o sea el color de marca en el
                  único lugar de la pantalla donde no significa nada. Pelear
                  eso desde `Button` implica pisar sus vars de color, alto y
                  padding a la vez; acá el control es directo. */}
              {deck.groups.map((g) => (
                <UnstyledButton
                  key={g.id}
                  id={`group-item-${g.id}`}
                  className="knd-group-item"
                  data-active={g.id === groupId || undefined}
                  onClick={() => setSelectedGroupId(g.id)}
                >
                  <span>{g.name}</span>
                  <span className="knd-group-count tabular">{g.cardCount}</span>
                </UnstyledButton>
              ))}
              <UnstyledButton
                id="new-group-btn"
                className="knd-group-item"
                data-muted
                onClick={openGroupModal}
              >
                + Nuevo grupo
              </UnstyledButton>
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

        <Stack id="editor-cards" gap="sm" className="knd-editor-cards" style={{ flex: 1, minWidth: 280 }}>
          <Paper id="cards-list" withBorder style={{ overflow: 'hidden' }}>
            {visible.map((c, i) => (
              <Box key={c.id} id={`card-row-${c.id}`}>
                {i > 0 && <Divider color={other.borderSoft} />}
                <Group gap={12} wrap="nowrap" style={{ padding: '0.625rem 0.8125rem' }}>
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
                  <Text className="kana" c="dimmed" w={70} style={{ wordBreak: 'break-word' }}>{c.prompt}</Text>
                  <Text className="romaji" size="sm" c="dimmed" w={70} style={{ wordBreak: 'break-word' }}>{c.primary}</Text>
                  {/* El significado va en `--a-dim`, no en el color de texto:
                      en el diseño es información secundaria de la fila. */}
                  <Text size="sm" c="dimmed" style={{ flex: 1, minWidth: 0, wordBreak: 'break-word' }}>
                    {c.meaning ?? ''}
                  </Text>
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
                <Text id="new-word-title" size="0.71875rem" lh={1.4} fw={600}>
                  {groupName ? `Nueva palabra en «${groupName}»` : 'Nueva palabra'}
                </Text>
                {/* `.field` del diseño: el rótulo va ADENTRO de la caja, a la
                    izquierda del valor y en la misma línea, no encima. Se
                    arma con `leftSection` en vez de envolver el input en una
                    caja propia: así el borde, el foco y el estado de error
                    siguen siendo del `TextInput` -incluida la regla de
                    `.mantine-TextInput-input:focus` de globals.css- en vez de
                    tener que reescribirlos.

                    `leftSectionPointerEvents="none"` para que un click sobre
                    el rótulo caiga en el input y lo enfoque. El ancho va por
                    campo porque la sección se posiciona absoluta y cada
                    rótulo mide distinto, y en `rem` para que escale con el
                    resto de la app en 2K/4K (ver el `html { font-size }` de
                    globals.css). */}
                <Group gap="xs" align="center" wrap="wrap">
                  <TextInput
                    id="nueva-kana" placeholder="えび" w={150}
                    leftSection={<span className="knd-field-label">Kana</span>}
                    leftSectionWidth={rem(48)}
                    leftSectionPointerEvents="none"
                    styles={FIELD_STYLES}
                    value={prompt} onChange={(e) => onPrompt(e.currentTarget.value)}
                  />
                  <TextInput
                    id="nueva-romaji" placeholder="ebi" w={150}
                    leftSection={<span className="knd-field-label">Romaji</span>}
                    leftSectionWidth={rem(58)}
                    leftSectionPointerEvents="none"
                    styles={FIELD_STYLES}
                    value={romaji}
                    onChange={(e) => { setRomajiTouched(true); setRomaji(e.currentTarget.value); }}
                  />
                  <TextInput
                    id="nueva-meaning" placeholder="camarón" w={200}
                    leftSection={<span className="knd-field-label">Significado</span>}
                    leftSectionWidth={rem(84)}
                    leftSectionPointerEvents="none"
                    styles={FIELD_STYLES}
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
