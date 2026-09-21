'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Stack, Group, Text, Button, Paper, TextInput, Divider, Box, Modal, UnstyledButton, rem,
  useMantineTheme, Anchor,
} from '@mantine/core';
import { SectionLabel } from './SectionLabel';
import { toRomaji } from '@/lib/kana/transliterate';
import { errorFrom, NETWORK_ERROR } from '@/lib/client/errors';
import { DictSearchPanel } from '@/components/dict/DictSearchPanel';
import type { DeckSummary } from '@/lib/services/decks';

export type EditorCard = {
  id: number; prompt: string; meaning: string | null; primary: string;
  /** Todas las romanizaciones aceptadas, la primaria incluida. */
  answers: string[];
  groupId: number;
};

// Mantine centra el contenido de una `section`; el diseño lo quiere pegado
// al borde izquierdo, con el mismo padding de 11px que tiene la caja.
// Propiedades planas, sin selectores anidados: en Mantine 9 el `styles` de
// un componente no los compila a CSS real (ver la nota de globals.css).
const FIELD_STYLES = {
  section: { justifyContent: 'flex-start', paddingLeft: rem(11) },
} as const;

/**
 * Edición de una carta existente. El formulario vive acá adentro y no en
 * `DeckEditor` para que abrir otra carta lo reinicie solo, vía `key`.
 */
function EditCardModal({
  card, busy, error, onClose, onSave,
}: {
  card: EditorCard;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (v: { prompt: string; romaji: string; meaning: string; alts: string[] }) => void;
}) {
  const [prompt, setPrompt] = useState(card.prompt);
  // La primaria va en su campo y el resto como alternativas, para no
  // perderlas al guardar (el PATCH reemplaza la lista entera).
  const [romaji, setRomaji] = useState(card.answers[0] ?? card.primary);
  const [alts, setAlts] = useState<string[]>(card.answers.slice(1));
  const [meaning, setMeaning] = useState(card.meaning ?? '');

  return (
    <Modal id="edit-card-modal" opened onClose={onClose} title="Editar carta">
      <Stack>
        <TextInput
          id="edit-kana" label="Kana"
          value={prompt} onChange={(e) => setPrompt(e.currentTarget.value)}
        />
        <TextInput
          id="edit-romaji" label="Romaji"
          value={romaji} onChange={(e) => setRomaji(e.currentTarget.value)}
        />
        {alts.map((a, i) => (
          <Group key={i} gap="xs" wrap="nowrap" align="flex-end">
            <TextInput
              label={i === 0 ? 'Romanizaciones alternativas' : undefined}
              aria-label={`Romanización alternativa ${i + 1}`}
              style={{ flex: 1 }}
              value={a}
              onChange={(e) => setAlts(alts.map((x, j) => (j === i ? e.currentTarget.value : x)))}
            />
            <Button
              variant="subtle" color="shu.6" size="compact-sm"
              aria-label={`Quitar romanización alternativa ${i + 1}`}
              onClick={() => setAlts(alts.filter((_, j) => j !== i))}
            >
              ✕
            </Button>
          </Group>
        ))}
        <Anchor component="button" type="button" size="xs" c="dimmed" onClick={() => setAlts([...alts, ''])}>
          + romanización alternativa
        </Anchor>
        <TextInput
          id="edit-meaning" label="Significado"
          value={meaning} onChange={(e) => setMeaning(e.currentTarget.value)}
        />
        {error && <Text c="shu.6" size="sm">{error}</Text>}
        <Button
          id="edit-card-save"
          onClick={() => onSave({ prompt, romaji, meaning, alts })}
          disabled={!prompt.trim() || !romaji.trim() || busy}
          loading={busy}
        >
          Guardar
        </Button>
      </Stack>
    </Modal>
  );
}

export function DeckEditor({
  deck, cards, dictionaryLoaded,
}: { deck: DeckSummary; cards: EditorCard[]; dictionaryLoaded: boolean }) {
  const router = useRouter();
  const { other } = useMantineTheme();

  const [dictOpen, setDictOpen] = useState(false);

  // Renombrar el mazo. Solo en mazos propios, igual que Borrar y el
  // diccionario: `iconFor` en DeckList elige el glifo あ/ア por el nombre de
  // los incluidos, así que renombrarlos les cambiaría el ícono.
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(deck.name);
  const [renameBusy, setRenameBusy] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const renameRef = useRef(false);

  // Edición de una carta ya creada. Va en modal y no en la fila: editar en
  // línea metería tres inputs en columnas de 70px, y el archivo ya resuelve
  // "nuevo grupo" y "borrar" con modales.
  const [editing, setEditing] = useState<EditorCard | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const editRef = useRef(false);

  // Romanizaciones alternativas del alta: la API ya acepta `answers` como
  // lista (ver `createCardSchema`), solo faltaba poder cargar más de una.
  const [alts, setAlts] = useState<string[]>([]);
  const kanaRef = useRef<HTMLInputElement>(null);

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

  // Un solo grupo: se esconde la columna y se ve una lista plana (el nivel
  // de grupos existe siempre en la base, pero solo se muestra cuando
  // significa algo). Ojo con lo que eso arrastra: "+ Nuevo grupo" vivía
  // ADENTRO de esa columna, así que un mazo de un grupo se quedaba sin
  // ninguna forma de crear el segundo -un callejón sin salida, reportado-.
  // Por eso, cuando la columna no está, el botón aparece en el encabezado.
  const showGroups = deck.groups.length > 1;
  const visible = cards.filter((c) => c.groupId === groupId);

  function onPrompt(value: string) {
    setPrompt(value);
    if (!romajiTouched) setRomaji(toRomaji(value));
  }

  async function renameDeckNow() {
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

  async function saveCard(next: { prompt: string; romaji: string; meaning: string; alts: string[] }) {
    if (editRef.current || !editing) return;
    editRef.current = true;
    setEditBusy(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/cards/${editing.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          prompt: next.prompt,
          meaning: next.meaning || null,
          answers: [next.romaji, ...next.alts].map((a) => a.trim()).filter(Boolean),
        }),
      });
      if (!res.ok) {
        setEditError(await errorFrom(res));
        return;
      }
      setEditing(null);
      router.refresh();
    } catch {
      setEditError(NETWORK_ERROR);
    } finally {
      editRef.current = false;
      setEditBusy(false);
    }
  }

  function focusNewWord() {
    kanaRef.current?.focus();
    kanaRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
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
        body: JSON.stringify({
          prompt,
          meaning: meaning || null,
          answers: [romaji, ...alts].map((a) => a.trim()).filter(Boolean),
        }),
      });
      if (!res.ok) {
        setAddError(await errorFrom(res));
        return;
      }
      setPrompt('');
      setRomaji('');
      setMeaning('');
      setAlts([]);
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
        {!deck.isBuiltin && (
          <Button
            id="rename-deck-btn"
            variant="default" bg="transparent" size="compact-xs"
            onClick={() => { setRenameValue(deck.name); setRenameError(null); setRenameOpen(true); }}
          >
            Renombrar
          </Button>
        )}
        <Group ml="auto" gap="xs">
          {!deck.isBuiltin && (
            <Button
              id="dict-search-btn"
              variant="default"
              size="compact-sm"
              onClick={() => setDictOpen(true)}
            >
              Buscar en el diccionario
            </Button>
          )}
          {/* No abre otro formulario: lleva el foco al que ya está abajo.
              Duplicar el alta en un modal sería dos caminos para lo mismo. */}
          {!showGroups && (
            <Button
              id="add-group-btn"
              variant="default" size="compact-sm"
              onClick={openGroupModal}
            >
              + Grupo
            </Button>
          )}
          {!deck.isBuiltin && (
            <Button id="add-word-btn" size="compact-sm" onClick={focusNewWord}>
              + Palabra
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
                    <Group gap={5} wrap="nowrap">
                      <Button
                        id={`card-delete-${c.id}`}
                        variant="subtle"
                        color="shu.6"
                        size="compact-xs"
                        onClick={() => removeCard(c.id)}
                        loading={deletingId === c.id}
                        disabled={deletingId !== null}
                      >
                        ✕
                      </Button>
                      <Button
                        id={`card-edit-${c.id}`}
                        variant="default" bg="transparent" size="compact-xs"
                        onClick={() => { setEditError(null); setEditing(c); }}
                      >
                        Editar
                      </Button>
                    </Group>
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
                    id="nueva-kana" ref={kanaRef} placeholder="えび" w={150}
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
                {alts.length > 0 && (
                  <Group id="alt-romaji-list" gap="xs" wrap="wrap">
                    {alts.map((a, i) => (
                      <Group key={i} gap={5} wrap="nowrap">
                        <TextInput
                          aria-label={`Romanización alternativa ${i + 1}`}
                          placeholder="sūpā" w={150}
                          leftSection={<span className="knd-field-label">Alt</span>}
                          leftSectionWidth={rem(38)}
                          leftSectionPointerEvents="none"
                          styles={FIELD_STYLES}
                          value={a}
                          onChange={(e) => setAlts(alts.map((x, j) => (j === i ? e.currentTarget.value : x)))}
                        />
                        <Button
                          variant="subtle" color="shu.6" size="compact-xs"
                          aria-label={`Quitar romanización alternativa ${i + 1}`}
                          onClick={() => setAlts(alts.filter((_, j) => j !== i))}
                        >
                          ✕
                        </Button>
                      </Group>
                    ))}
                  </Group>
                )}
                {addError && <Text c="shu.6" size="sm">{addError}</Text>}
                {/* `Group`+`gap`, no un "·" con espacios a los lados: ver la
                    regla de separadores en CLAUDE.md. */}
                <Group gap="0.375rem" wrap="wrap">
                  <Text size="xs" c="dimmed">
                    El romaji se completa solo desde el kana. Editalo si hace falta:
                    la っ de がっこう o las vocales largas de スーパー no siempre salen solas.
                  </Text>
                  <Text size="xs" c="dimmed">·</Text>
                  {/* La API ya aceptaba varias (`answers` es una lista); esto
                      es lo que faltaba para poder cargarlas. スーパー tiene
                      que aceptar `suupaa` y `sūpā` por igual. */}
                  <Anchor
                    id="add-alt-romaji"
                    component="button"
                    type="button"
                    size="xs"
                    c="dimmed"
                    onClick={() => setAlts([...alts, ''])}
                  >
                    + romanización alternativa
                  </Anchor>
                </Group>
              </Stack>
            </Paper>
          )}
        </Stack>
      </Group>

      <Modal
        id="rename-deck-modal"
        opened={renameOpen}
        onClose={() => setRenameOpen(false)}
        title="Renombrar mazo"
      >
        <Stack>
          <TextInput
            id="rename-deck-input" label="Nombre"
            value={renameValue} onChange={(e) => setRenameValue(e.currentTarget.value)}
          />
          {renameError && <Text c="shu.6" size="sm">{renameError}</Text>}
          <Button
            onClick={renameDeckNow}
            disabled={!renameValue.trim() || renameBusy}
            loading={renameBusy}
          >
            Guardar
          </Button>
        </Stack>
      </Modal>

      {/* `key` con el id de la carta: monta un componente nuevo por carta, así
          los campos arrancan con SUS valores en vez de quedarse con los de la
          carta anterior -el estado del formulario vive adentro-. */}
      {editing && (
        <EditCardModal
          key={editing.id}
          card={editing}
          busy={editBusy}
          error={editError}
          onClose={() => setEditing(null)}
          onSave={saveCard}
        />
      )}

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
