'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Stack, Group, Text, Button, Paper, Divider, Modal, TextInput, Anchor, Box,
  rem, useMantineTheme,
} from '@mantine/core';
import { SectionLabel } from './SectionLabel';
import { BuiltinDot } from './BuiltinDot';
import { DictSearchPanel } from './dict/DictSearchPanel';
import { SwipeCardRow } from './SwipeCardRow';
import { toRomaji } from '@/lib/kana/transliterate';
import { toKana } from '@/lib/kana/to-kana';
import { errorFrom, NETWORK_ERROR } from '@/lib/client/errors';
import type { DeckSummary, GroupSummary } from '@/lib/services/decks';

export type EditorCard = {
  id: number; prompt: string; meaning: string | null; primary: string;
  /** Todas las romanizaciones aceptadas, la primaria incluida. */
  answers: string[];
  groupId: number;
};

const FIELD_STYLES = {
  section: { justifyContent: 'flex-start', paddingLeft: rem(11) },
} as const;

/**
 * Edición de una carta existente. El formulario vive acá adentro y no en
 * `GroupCards` para que abrir otra carta lo reinicie solo, vía `key`.
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
        <TextInput id="edit-kana" label="Kana" value={prompt} onChange={(e) => setPrompt(e.currentTarget.value)} />
        <TextInput id="edit-romaji" label="Romaji" value={romaji} onChange={(e) => setRomaji(e.currentTarget.value)} />
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
        <TextInput id="edit-meaning" label="Significado" value={meaning} onChange={(e) => setMeaning(e.currentTarget.value)} />
        {/* Al final, después de los campos, como en el formulario de alta:
            es una acción sobre el formulario, no un campo más. */}
        <Anchor component="button" type="button" size="xs" c="dimmed" onClick={() => setAlts([...alts, ''])}>
          + romanización alternativa
        </Anchor>
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

/**
 * Cartas de un grupo. El alta va ARRIBA de la lista: al pie obliga a
 * scrollear hasta el fondo para agregar una palabra, y cuanto más larga la
 * lista, peor.
 *
 * Las dos formas de dar de alta -el formulario y el diccionario- viven acá y
 * no en el listado de grupos, porque una palabra entra a UN grupo: esta es la
 * única pantalla donde no hay que preguntar a cuál.
 */
export function GroupCards({
  deck, group, cards, dictionaryLoaded,
}: {
  deck: DeckSummary;
  group: GroupSummary;
  cards: EditorCard[];
  dictionaryLoaded: boolean;
}) {
  const router = useRouter();
  const { other } = useMantineTheme();
  const readOnly = deck.isBuiltin;
  const manyGroups = deck.groups.length > 1;

  const [dictOpen, setDictOpen] = useState(false);

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(group.name);
  const [renameBusy, setRenameBusy] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const renameRef = useRef(false);

  const [prompt, setPrompt] = useState('');
  const [romaji, setRomaji] = useState('');
  const [meaning, setMeaning] = useState('');
  const [alts, setAlts] = useState<string[]>([]);
  const [romajiTouched, setRomajiTouched] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const addRef = useRef(false);

  // La carta que se está por borrar, no la que se está borrando: borrar es
  // irreversible y hasta ahora era el ÚNICO borrado de la app que no pedía
  // confirmación -el de mazo y el de grupo sí la piden-.
  const [deleting, setDeleting] = useState<EditorCard | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteRef = useRef(false);

  const [editing, setEditing] = useState<EditorCard | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const editRef = useRef(false);

  const [moving, setMoving] = useState<EditorCard | null>(null);
  const [moveBusy, setMoveBusy] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const moveRef = useRef(false);

  function onPrompt(v: string) {
    setPrompt(v);
    if (!romajiTouched) setRomaji(toRomaji(v));
  }

  async function renameGroup() {
    if (renameRef.current) return;
    renameRef.current = true;
    setRenameBusy(true);
    setRenameError(null);
    try {
      const res = await fetch(`/api/groups/${group.id}`, {
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

  async function add() {
    if (addRef.current) return;
    addRef.current = true;
    setAddBusy(true);
    setAddError(null);
    try {
      const res = await fetch(`/api/groups/${group.id}/cards`, {
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

  async function removeCard() {
    if (deleteRef.current || !deleting) return;
    deleteRef.current = true;
    setDeletingId(deleting.id);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/cards/${deleting.id}`, { method: 'DELETE' });
      if (!res.ok) {
        setDeleteError(await errorFrom(res));
        return;
      }
      setDeleting(null);
      router.refresh();
    } catch {
      setDeleteError(NETWORK_ERROR);
    } finally {
      deleteRef.current = false;
      setDeletingId(null);
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

  async function moveCard(targetGroupId: number) {
    if (moveRef.current || !moving) return;
    moveRef.current = true;
    setMoveBusy(true);
    setMoveError(null);
    try {
      // `updateCard` ya acepta `groupId`: mover es el mismo viaje que editar.
      const res = await fetch(`/api/cards/${moving.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ groupId: targetGroupId }),
      });
      if (!res.ok) {
        setMoveError(await errorFrom(res));
        return;
      }
      setMoving(null);
      router.refresh();
    } catch {
      setMoveError(NETWORK_ERROR);
    } finally {
      moveRef.current = false;
      setMoveBusy(false);
    }
  }

  return (
    <Stack id="group-cards-screen" gap="md">
      <Group id="group-header" gap="0.5rem">
        <Anchor className="knd-crumb" component={Link} href="/decks" size="sm" underline="hover">
          Mazos
        </Anchor>
        <Text c="dark.3" size="sm">/</Text>
        <Anchor
          className="knd-crumb"
          component={Link}
          href={`/decks/${deck.id}`}
          size="sm" underline="hover"
        >
          {deck.name}
        </Anchor>
        <Text c="dark.3" size="sm">/</Text>
        <Text id="group-name" fw={700} size={rem(15)} lh={1.4} className="kana">{group.name}</Text>
        {readOnly ? <BuiltinDot /> : (
          <Button
            id="rename-group-btn"
            variant="default" bg="transparent" size="compact-xs"
            onClick={() => { setRenameValue(group.name); setRenameError(null); setRenameOpen(true); }}
          >
            Renombrar
          </Button>
        )}
        {!readOnly && (
          <Button id="dict-search-btn" ml="auto" variant="default" size="compact-sm" onClick={() => setDictOpen(true)}>
            Buscar en el diccionario
          </Button>
        )}
      </Group>

      {!readOnly && (
        <Paper id="new-word-panel" withBorder radius={9} style={{ padding: '0.8125rem', borderColor: other.borderSoft }}>
          {/* Un `form` de verdad y no un `div` con botón: así Enter agrega
              desde cualquiera de los campos -incluidas las romanizaciones
              alternativas, que están acá adentro- y en teléfono el teclado
              muestra la tecla de ir en vez de un salto de línea inútil. La
              condición es la misma que deshabilita el botón, así que Enter
              nunca hace algo que el botón no haría. */}
          <Stack
            gap="xs"
            component="form"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              if (!prompt.trim() || !romaji.trim() || addBusy) return;
              void add();
            }}
          >
            <Text id="new-word-title" size="0.71875rem" lh={1.4} fw={600}>
              {`Nueva palabra en «${group.name}»`}
            </Text>
            {/* `.field` del diseño: el rótulo va ADENTRO de la caja, con
                `leftSection`, así el borde y el foco siguen siendo del
                `TextInput`. El rótulo puede ir en 9px sin riesgo; el que no
                puede bajar de 16px es el `<input>`, que es lo que dispara el
                zoom de iOS. */}
            {/* Grilla y no un `Group wrap`: envolver reparte los campos en
                pares desparejos -Kana+Romaji, Significado+Agregar- en cuanto
                la pantalla se angosta. El diseño pide cuatro columnas en
                escritorio y UNA en teléfono, y eso lo decide `.knd-addform`
                en globals.css. Los anchos salen de los `w={}` porque Mantine
                los escribe inline y un ancho inline le gana a la grilla. */}
            <div className="knd-addform">
              <div className="knd-addform-kana">
                <TextInput
                  id="nueva-kana" placeholder="えび"
                  leftSection={<span className="knd-field-label">Kana</span>}
                  leftSectionWidth={rem(48)} leftSectionPointerEvents="none" styles={FIELD_STYLES}
                  value={prompt} onChange={(e) => onPrompt(e.currentTarget.value)}
                />
                {/* El camino inverso al que ya existía: el kana completa el
                    romaji solo, y esto completa el kana desde el romaji, para
                    quien no tiene cómo escribir japonés.

                    Son DOS botones y no uno porque el romaji no dice el
                    silabario: "neko" es ねこ o ネコ según si la palabra es
                    japonesa o prestada, y eso lo sabe quien la escribe.

                    Sólo por botón, nunca solo: si el romaji escribiera kana
                    al tipear, los dos campos se realimentarían. Así cada uno
                    tiene un dueño y el cruce lo decide el usuario. Y usa
                    `setPrompt` y no `onPrompt` justamente por eso -`onPrompt`
                    reescribiría el romaji recién tipeado con su propia
                    transcripción, cambiando "si" por "shi" a mitad de camino-. */}
                <div className="knd-kana-conv">
                  <Button
                    id="nueva-kana-hiragana"
                    variant="default" size="compact-sm"
                    leftSection={<span className="kana">あ</span>}
                    disabled={!romaji.trim()}
                    onClick={() => setPrompt(toKana(romaji, 'hiragana'))}
                  >
                    Hiragana
                  </Button>
                  <Button
                    id="nueva-kana-katakana"
                    variant="default" size="compact-sm"
                    leftSection={<span className="kana">ア</span>}
                    disabled={!romaji.trim()}
                    onClick={() => setPrompt(toKana(romaji, 'katakana'))}
                  >
                    Katakana
                  </Button>
                </div>
              </div>
              <TextInput
                id="nueva-romaji" placeholder="ebi"
                leftSection={<span className="knd-field-label">Romaji</span>}
                leftSectionWidth={rem(58)} leftSectionPointerEvents="none" styles={FIELD_STYLES}
                value={romaji}
                onChange={(e) => { setRomajiTouched(true); setRomaji(e.currentTarget.value); }}
              />
              <TextInput
                id="nueva-meaning" placeholder="camarón"
                leftSection={<span className="knd-field-label">Significado</span>}
                leftSectionWidth={rem(84)} leftSectionPointerEvents="none" styles={FIELD_STYLES}
                value={meaning} onChange={(e) => setMeaning(e.currentTarget.value)}
              />
              <Button type="submit" disabled={!prompt.trim() || !romaji.trim() || addBusy} loading={addBusy}>
                Agregar
              </Button>
            </div>
            {alts.length > 0 && (
              <Group id="alt-romaji-list" gap="xs" wrap="wrap">
                {alts.map((a, i) => (
                  <Group key={i} gap={5} wrap="nowrap">
                    <TextInput
                      aria-label={`Romanización alternativa ${i + 1}`}
                      placeholder="sūpā" w={150}
                      leftSection={<span className="knd-field-label">Alt</span>}
                      leftSectionWidth={rem(38)} leftSectionPointerEvents="none" styles={FIELD_STYLES}
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
            {/* Sin el `·` que separaba la frase del link: con el formulario
                en una columna la ayuda ocupa dos líneas, y el punto quedaba
                abriendo la segunda como si fuera una viñeta. El link se
                distingue solo -color y subrayado-, así que el separador no
                estaba aportando nada que se pierda. */}
            <Group gap="0.375rem" wrap="wrap">
              <Text size="xs" c="dimmed">El romaji se completa solo desde el kana. Editalo si hace falta.</Text>
              <Anchor
                id="add-alt-romaji" component="button" type="button" size="xs" c="dimmed"
                onClick={() => setAlts([...alts, ''])}
              >
                + romanización alternativa
              </Anchor>
            </Group>
          </Stack>
        </Paper>
      )}

      <Group className="knd-sect-row" gap={10} wrap="nowrap">
        <SectionLabel id="cards-count">
          {cards.length === 1 ? '1 carta' : `${cards.length} cartas`}
        </SectionLabel>
        {/* Siempre, no sólo con varios grupos: el listado existe aunque haya
            uno -es donde se crean los demás- así que desde acá siempre se
            puede subir. */}
        <Button
          id="deck-groups-btn" component={Link} href={`/decks/${deck.id}`}
          variant="default" bg="transparent" size="compact-sm"
        >
          Grupos del mazo
        </Button>
        {readOnly && !manyGroups && (
          <Text className="romaji" size={rem(9)} tt="uppercase" c="dark.3" style={{ letterSpacing: '0.08em' }}>
            sólo lectura
          </Text>
        )}
      </Group>

      {deleteError && <Text c="shu.6" size="sm">{deleteError}</Text>}

      <Paper id="cards-list" withBorder style={{ overflow: 'hidden' }}>
        {cards.map((c, i) => (
          <Box key={c.id} id={`card-row-${c.id}`}>
            {i > 0 && <Divider color={other.borderSoft} />}
            <SwipeCardRow
              label={c.prompt}
              canMove={!readOnly && manyGroups}
              tappable={!readOnly}
              onTap={() => { setEditError(null); setEditing(c); }}
              onMove={() => { setMoveError(null); setMoving(c); }}
              onDelete={() => { setDeleteError(null); setDeleting(c); }}
            >
              {/* Los anchos viven en globals.css y no acá porque tienen que
                  cambiar entre escritorio y teléfono, y un `style` inline no
                  puede llevar una media query. */}
              <Group gap={12} wrap="nowrap" style={{ padding: '0.625rem 0.8125rem' }}>
                <Text className="kana knd-card-kana" c="dimmed">{c.prompt}</Text>
                <Text className="romaji knd-card-romaji" size="sm" c="dimmed">{c.primary}</Text>
                <Text className="knd-card-meaning" size="sm" c="dimmed">{c.meaning ?? ''}</Text>
                {/* Un mazo incluido no trae acciones por carta: la pantalla es
                    un visor. En teléfono estos botones se ocultan por CSS y
                    las acciones llegan por gesto. */}
                {!readOnly && (
                  <Group className="knd-card-actions" gap={5} wrap="nowrap">
                    <Button
                      id={`card-delete-${c.id}`}
                      variant="subtle" color="shu.6" size="compact-xs"
                      onClick={() => { setDeleteError(null); setDeleting(c); }}
                      loading={deletingId === c.id}
                      disabled={deletingId !== null}
                    >
                      Borrar
                    </Button>
                    {manyGroups && (
                      <Button
                        id={`card-move-${c.id}`}
                        variant="default" bg="transparent" size="compact-xs"
                        onClick={() => { setMoveError(null); setMoving(c); }}
                      >
                        Mover
                      </Button>
                    )}
                    <Button
                      id={`card-edit-${c.id}`}
                      variant="default" size="compact-xs"
                      onClick={() => { setEditError(null); setEditing(c); }}
                    >
                      Editar
                    </Button>
                  </Group>
                )}
              </Group>
            </SwipeCardRow>
          </Box>
        ))}
        {cards.length === 0 && <Text p="md" size="sm" c="dimmed">Todavía no hay cartas en este grupo.</Text>}
      </Paper>

      <Modal id="rename-group-modal" opened={renameOpen} onClose={() => setRenameOpen(false)} title="Renombrar grupo">
        <Stack>
          <TextInput
            id="rename-group-input" label="Nombre"
            value={renameValue} onChange={(e) => setRenameValue(e.currentTarget.value)}
          />
          {renameError && <Text c="shu.6" size="sm">{renameError}</Text>}
          <Button onClick={renameGroup} disabled={!renameValue.trim() || renameBusy} loading={renameBusy}>
            Guardar
          </Button>
        </Stack>
      </Modal>

      {/* El grupo actual aparece deshabilitado en vez de ausente: dice dónde
          estás parado sin necesidad de otra etiqueta. */}
      <Modal
        id="delete-card-modal"
        opened={!!deleting}
        onClose={() => setDeleting(null)}
        title="¿Borrar la palabra?"
      >
        <Stack>
          {/* El diálogo nombra la carta y lo que se lleva puesto: los intentos
              de esa carta se borran con ella, así que la estadística cambia. */}
          <Text size="sm">
            {deleting && `Se va «${deleting.prompt}»${
              deleting.meaning ? ` (${deleting.meaning})` : ''
            } y sus intentos registrados. No se puede deshacer.`}
          </Text>
          {deleteError && <Text c="shu.6" size="sm">{deleteError}</Text>}
          <Group>
            <Button variant="default" onClick={() => setDeleting(null)} disabled={deletingId !== null}>
              Cancelar
            </Button>
            <Button id="confirm-delete-card" color="shu.6" onClick={removeCard} loading={deletingId !== null}>
              Borrar palabra
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        id="move-card-modal"
        opened={!!moving}
        onClose={() => setMoving(null)}
        title={moving ? `Mover «${moving.prompt}» a…` : 'Mover'}
      >
        <Stack gap={4}>
          {deck.groups.map((g) => (
            <Button
              key={g.id}
              id={`move-to-${g.id}`}
              variant="subtle"
              justify="space-between"
              disabled={g.id === group.id || moveBusy}
              rightSection={<Text size="xs" c="dark.3" className="tabular">{g.cardCount}</Text>}
              onClick={() => moveCard(g.id)}
              fullWidth
            >
              {g.id === group.id ? `${g.name} · acá está` : g.name}
            </Button>
          ))}
          {moveError && <Text c="shu.6" size="sm">{moveError}</Text>}
        </Stack>
      </Modal>

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

      {!readOnly && (
        <DictSearchPanel
          opened={dictOpen}
          onClose={() => setDictOpen(false)}
          groupId={group.id}
          groupName={group.name}
          dictionaryLoaded={dictionaryLoaded}
        />
      )}
    </Stack>
  );
}
