'use client';

import { useRef, useState, type SubmitEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  Stack, Group, Text, Button, Paper, Divider, Modal, Anchor, Box, Radio,
  rem,
} from '@mantine/core';
import { Screen } from './Screen';
import { RenameButton } from './RenameButton';
import { SectionLabel } from './SectionLabel';
import { BuiltinDot } from './BuiltinDot';
import { Search, X } from 'react-bootstrap-icons';
import { Icon } from './Icon';
import { DictSearchPanel } from './dict/DictSearchPanel';
import { SwipeRow } from './SwipeRow';
import { ModalTitle } from './ModalTitle';
import { NameModal } from './NameModal';
import { ConfirmModal } from './ConfirmModal';
import { ModalActions } from './ModalActions';
import { PaperField } from './PaperField';
import { toRomaji } from '@/lib/kana/transliterate';
import { toKana } from '@/lib/kana/to-kana';
import { errorFrom } from '@/lib/client/errors';
import { useAction } from '@/lib/client/action';
import type { DeckSummary, GroupSummary } from '@/lib/services/decks';
import styles from './GroupCards.module.css';

export type EditorCard = {
  id: number; prompt: string; meaning: string | null; primary: string;
  /** Todas las romanizaciones aceptadas, la primaria incluida. */
  answers: string[];
  groupId: number;
};

/**
 * Edición de una carta existente. El formulario vive acá adentro y no en
 * `GroupCards` para que abrir otra carta lo reinicie solo, vía `key`.
 */
function EditCardModal({
  card, opened, busy, error, onClose, onSave,
}: {
  /** Nulo mientras no se editó nada todavía: el modal vive montado igual. */
  card: EditorCard | null;
  opened: boolean;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (v: { prompt: string; romaji: string; meaning: string; alts: string[] }) => void;
}) {
  const [prompt, setPrompt] = useState('');
  // La primaria va en su campo y el resto como alternativas, para no
  // perderlas al guardar (el PATCH reemplaza la lista entera).
  const [romaji, setRomaji] = useState('');
  const [alts, setAlts] = useState<string[]>([]);
  const [meaning, setMeaning] = useState('');

  // El formulario se carga al ABRIRSE, no al montarse. Antes el modal se
  // montaba recién al abrirlo y se reiniciaba solo por su `key`; ahora vive
  // montado siempre -es lo que le da a Mantine un estado cerrado del que
  // salir, y sin eso no hay animación de entrada-, así que el reinicio tiene
  // que colgar de la apertura.
  //
  // Va en el RENDER y no en un efecto: es el patrón que React documenta para
  // ajustar estado cuando cambian las props, y evita el repintado de más que
  // deja un `setState` dentro de un efecto -React descarta este render y
  // rehace el componente antes de tocar el DOM-. Compararlo contra el estado
  // ANTERIOR de `opened` es lo que hace que reabrir la misma carta descarte
  // lo que se haya tipeado y cancelado.
  const [wasOpen, setWasOpen] = useState(false);
  if (opened !== wasOpen) {
    setWasOpen(opened);
    if (opened && card) {
      setPrompt(card.prompt);
      setRomaji(card.answers[0] ?? card.primary);
      setAlts(card.answers.slice(1));
      setMeaning(card.meaning ?? '');
    }
  }

  return (
    /* `keepMounted`: sin esto, la PRIMERA apertura sigue sin animar aunque el
       estado cambie. Mantine sólo crea su `Transition` cuando el modal se
       abre, y un `Transition` que nace ya abierto no tiene de dónde salir.
       Manteniéndolo en el DOM -oculto- existe desde antes del cambio y la
       transición corre también la primera vez. */
    <Modal
      id="edit-card-modal"
      opened={opened}
      keepMounted
      onClose={onClose}
      title={<ModalTitle jp="編">Editar palabra</ModalTitle>}
    >
      <Stack
        component="form"
        onSubmit={(e: SubmitEvent) => {
          e.preventDefault();
          if (!prompt.trim() || !romaji.trim() || busy) return;
          onSave({ prompt, romaji, meaning, alts });
        }}
      >
        <PaperField id="edit-kana" label="Kana" value={prompt} onChange={(e) => setPrompt(e.currentTarget.value)} />
        <PaperField id="edit-romaji" label="Romaji" value={romaji} onChange={(e) => setRomaji(e.currentTarget.value)} />
        {/* Los mismos dos botones del alta, y por lo mismo: acá también se
            puede querer escribir el kana sin teclado japonés. Debajo del
            romaji y después de él en el DOM, así el tabulador va romaji →
            hiragana → katakana → resto. */}
        <div className={styles.kanaConv}>
          <Button
            id="edit-kana-hiragana"
            variant="default" size="compact-sm"
            leftSection={<span className="kana">あ</span>}
            disabled={!romaji.trim()}
            onClick={() => setPrompt(toKana(romaji, 'hiragana'))}
          >
            Hiragana
          </Button>
          <Button
            id="edit-kana-katakana"
            variant="default" size="compact-sm"
            leftSection={<span className="kana">ア</span>}
            disabled={!romaji.trim()}
            onClick={() => setPrompt(toKana(romaji, 'katakana'))}
          >
            Katakana
          </Button>
        </div>
        {alts.map((a, i) => (
          <Group key={i} gap="xs" wrap="nowrap">
            <div style={{ flex: 1 }}>
              <PaperField
                label="Alt"
                aria-label={`Romanización alternativa ${i + 1}`}
                value={a}
                onChange={(e) => setAlts(alts.map((x, j) => (j === i ? e.currentTarget.value : x)))}
              />
            </div>
            <Button
              variant="subtle" className="knd-error" size="compact-sm"
              aria-label={`Quitar romanización alternativa ${i + 1}`}
              onClick={() => setAlts(alts.filter((_, j) => j !== i))}
            >
              <Icon glyph={X} rem={0.875} />
            </Button>
          </Group>
        ))}
        <PaperField id="edit-meaning" label="Significado" value={meaning} onChange={(e) => setMeaning(e.currentTarget.value)} />
        {/* La nota del diseño, debajo del último campo: dice qué hace el
            formulario solo, así los dos botones de arriba no necesitan
            explicarse. */}
        <Text className="knd-field-note">
          El romaji se completa solo desde el kana. Editalo si hace falta.
        </Text>
        {/* Al final, después de los campos, como en el formulario de alta:
            es una acción sobre el formulario, no un campo más. */}
        <Anchor
          className={styles.inlineLink} component="button" type="button"
          size="xs" underline="always" onClick={() => setAlts([...alts, ''])}
        >
          + romanización alternativa
        </Anchor>
        {error && <Text className="knd-error" size="sm">{error}</Text>}
        {/* `type="submit"` y no un `onClick`: sin un botón de submit, un form
            con más de un campo no se manda con Enter -esa es la regla de
            "envío implícito" del HTML-, y el Enter del modal no hacía nada. */}
        <ModalActions onCancel={onClose} busy={busy}>
          <Button
            id="edit-card-save"
            type="submit"
            disabled={!prompt.trim() || !romaji.trim() || busy}
            loading={busy}
          >
            Guardar
          </Button>
        </ModalActions>
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
  const readOnly = deck.isBuiltin;
  const manyGroups = deck.groups.length > 1;

  const [dictOpen, setDictOpen] = useState(false);

  const [renameOpen, setRenameOpen] = useState(false);

  const [prompt, setPrompt] = useState('');
  const [romaji, setRomaji] = useState('');
  const [meaning, setMeaning] = useState('');
  const [alts, setAlts] = useState<string[]>([]);
  const [romajiTouched, setRomajiTouched] = useState(false);
  const kanaRef = useRef<HTMLInputElement>(null);
  const addAction = useAction();

  // La carta que se está por borrar, no la que se está borrando: borrar es
  // irreversible y hasta ahora era el ÚNICO borrado de la app que no pedía
  // confirmación -el de mazo y el de grupo sí la piden-.
  const [deleting, setDeleting] = useState<EditorCard | null>(null);

  // La carta que se edita y si el modal está abierto van SEPARADOS. Antes el
  // modal se montaba recién al abrirlo, con `opened` fijo en true: Mantine
  // nunca veía el cambio de cerrado a abierto, así que no había transición
  // que correr y aparecía de golpe -a diferencia de mover y borrar, que están
  // siempre montados-. Y al cerrar, la carta se conserva para que el
  // contenido no desaparezca a mitad de la animación de salida.
  const [editCard, setEditCard] = useState<EditorCard | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const editAction = useAction();

  const [moving, setMoving] = useState<EditorCard | null>(null);
  const moveAction = useAction();
  // El grupo elegido en el modal de mover. `null` hasta que se elige uno, que
  // es lo que mantiene apagado el botón que ejecuta.
  const [target, setDestino] = useState<number | null>(null);

  function onPrompt(v: string) {
    setPrompt(v);
    if (!romajiTouched) setRomaji(toRomaji(v));
  }

  /**
   * El autocompletado se apaga cuando hay algo escrito a mano en el romaji y
   * se vuelve a encender cuando el campo queda vacío.
   *
   * Antes la marca era de una sola vía: tocar el romaji una vez la dejaba
   * encendida hasta agregar la carta, así que el kana no volvía a completar
   * nada en toda la sesión de ese formulario -y parecía roto-. Con la regla
   * atada al CONTENIDO y no al hecho de haber tipeado, vaciar el campo
   * alcanza para recuperarlo.
   */
  function onRomaji(v: string) {
    setRomaji(v);
    setRomajiTouched(v.trim() !== '');
  }

  const renameGroup = async (name: string) => {
    const res = await fetch(`/api/groups/${group.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return errorFrom(res);
    setRenameOpen(false);
    router.refresh();
  };

  const add = () => addAction.run(async () => {
    const res = await fetch(`/api/groups/${group.id}/cards`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        prompt,
        meaning: meaning || null,
        answers: [romaji, ...alts].map((a) => a.trim()).filter(Boolean),
      }),
    });
    if (!res.ok) return errorFrom(res);
    setPrompt('');
    setRomaji('');
    setMeaning('');
    setAlts([]);
    setRomajiTouched(false);
    // El foco vuelve al principio del formulario: agregar una palabra casi
    // siempre viene seguido de agregar la siguiente.
    kanaRef.current?.focus();
    router.refresh();
  });

  const removeCard = async () => {
    if (!deleting) return;
    const res = await fetch(`/api/cards/${deleting.id}`, { method: 'DELETE' });
    if (!res.ok) return errorFrom(res);
    setDeleting(null);
    router.refresh();
  };

  const saveCard = (next: { prompt: string; romaji: string; meaning: string; alts: string[] }) =>
    editAction.run(async () => {
      if (!editCard) return;
      const res = await fetch(`/api/cards/${editCard.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          prompt: next.prompt,
          meaning: next.meaning || null,
          answers: [next.romaji, ...next.alts].map((a) => a.trim()).filter(Boolean),
        }),
      });
      if (!res.ok) return errorFrom(res);
      setEditOpen(false);
      router.refresh();
    });

  const moveCard = (targetGroupId: number) => moveAction.run(async () => {
    if (!moving) return;
    // `updateCard` ya acepta `groupId`: mover es el mismo viaje que editar.
    const res = await fetch(`/api/cards/${moving.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ groupId: targetGroupId }),
    });
    if (!res.ok) return errorFrom(res);
    setMoving(null);
    router.refresh();
  });

  return (
    <Screen nav={{
      id: 'group-header',
      levels: [
        { label: 'Mazos', href: '/decks' },
        { label: deck.name, href: `/decks/${deck.id}` },
        { label: group.name },
      ],
      currentId: 'group-name',
      action: readOnly ? <BuiltinDot /> : (
        <RenameButton id="rename-group-btn" onClick={() => setRenameOpen(true)} />
      ),
    }}>
      <Stack id="group-cards-screen" gap="md">
        {!readOnly && (
          <Paper id="new-word-panel" withBorder radius={9} style={{ padding: '0.8125rem', borderColor: 'var(--knd-border-soft)' }}>
            {/* Un `form` de verdad y no un `div` con botón: así Enter agrega
                desde cualquiera de los campos -incluidas las romanizaciones
                alternativas, que están acá adentro- y en teléfono el teclado
                muestra la tecla de ir en vez de un salto de línea inútil. La
                condición es la misma que deshabilita el botón, así que Enter
                nunca hace algo que el botón no haría. */}
            <Stack
              gap="xs"
              component="form"
              onSubmit={(e: SubmitEvent) => {
                e.preventDefault();
                if (!prompt.trim() || !romaji.trim() || addAction.busy) return;
                void add();
              }}
            >
              {/* El buscador vive en el encabezado de ESTE panel porque lo que
                  hace es llenar este formulario. Colgaba de la fila de «N
                  cartas», que es el encabezado de la LISTA, y ahí se leía como
                  «buscar entre estas N» -lo contrario de lo que hace, que es
                  agregar una que no está-. Acá además no gasta alto: la fila
                  del título estaba entera libre. */}
              <Group gap={10} wrap="nowrap">
                <Text id="new-word-title" className={styles.addformTitle} size="0.71875rem" lh={1.4} fw={600}>
                  {`Nueva palabra en «${group.name}»`}
                </Text>
                <Button
                  id="dict-search-btn"
                  className={styles.dictBtn}
                  variant="default"
                  size="compact-sm"
                  type="button"
                  aria-label="Buscar en el diccionario"
                  onClick={() => setDictOpen(true)}
                  leftSection={(
                    /* 18px y no 14: a 14 la lupa quedaba más chica que la
                       altura de las mayúsculas de la label, que va en 14px
                       negrita. Un círculo con cola tiene menos masa visual que
                       una letra del mismo cuerpo, así que para leerse a la par
                       tiene que ser más grande. El trazo baja a 1.7 para que
                       al agrandarse no pese más que el texto. */
                    <Icon glyph={Search} rem={0.875} />
                  )}
                >
                  {/* Dos etiquetas y el CSS elige cuál se ve, como en
                      `RenameButton`: en 390px «Buscar en el diccionario» se
                      come el ancho que necesita el nombre del grupo. */}
                  <span className={styles.dictLabelFull}>Buscar en el diccionario</span>
                  <span className={styles.dictLabelShort}>Diccionario</span>
                </Button>
              </Group>
              {/* `.field` del diseño: el rótulo va ADENTRO de la caja. Es el
                  mismo `PaperField` que usan los modales; hasta hace poco acá
                  estaba resuelto con `TextInput` + `leftSection`, o sea el mismo
                  campo escrito de dos maneras, con su estilo de rótulo
                  duplicado. El rótulo puede ir en 9px sin riesgo; el que no
                  puede bajar de 16px es el `<input>`, que es lo que dispara el
                  zoom de iOS. */}
              {/* Grilla y no un `Group wrap`: envolver reparte los campos en
                  pares desparejos -Kana+Romaji, Significado+Agregar- en cuanto
                  la pantalla se angosta. El diseño pide cuatro columnas en
                  escritorio y UNA en teléfono, y eso lo decide `.${styles.addform}`
                  en globals.css. Los anchos salen de los `w={}` porque Mantine
                  los escribe inline y un ancho inline le gana a la grilla. */}
              <div className={styles.addform}>
                <PaperField
                  inputRef={kanaRef}
                  id="nueva-kana" label="Kana" placeholder="えび"
                  value={prompt} onChange={(e) => onPrompt(e.currentTarget.value)}
                />
                {/* Los botones van debajo del ROMAJI, que es el campo del que
                    leen, y después de él en el DOM. Eso deja el tabulador en el
                    orden en que se usa -romaji, hiragana, katakana,
                    significado- sin un solo `tabIndex`: el orden del documento
                    ya es el correcto. */}
                <div className={styles.addformRomaji}>
                  <PaperField
                    id="nueva-romaji" label="Romaji" placeholder="ebi"
                    value={romaji}
                    onChange={(e) => onRomaji(e.currentTarget.value)}
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
                  <div className={styles.kanaConv}>
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
                <PaperField
                  id="nueva-meaning" label="Significado" placeholder="camarón"
                  value={meaning} onChange={(e) => setMeaning(e.currentTarget.value)}
                />
                {/* `default` y no el primario: en el canvas el alta de palabra
                    cierra con `boton("Agregar", h=36)`, o sea el botón neutro. El
                    verde del formulario se lo lleva «Agregar» del DICCIONARIO,
                    que ahí sí es `primario`. Tiene sentido: éste es el paso
                    final de un formulario que ya estás completando, no la acción
                    que te invita a empezar algo. */}
                <Button variant="default" type="submit" disabled={!prompt.trim() || !romaji.trim() || addAction.busy} loading={addAction.busy}>
                  Agregar
                </Button>
              </div>
              {alts.length > 0 && (
                <Group id="alt-romaji-list" gap="xs" wrap="wrap">
                  {alts.map((a, i) => (
                    <Group key={i} gap={5} wrap="nowrap">
                      <div style={{ width: 150 }}>
                        <PaperField
                          label="Alt"
                          aria-label={`Romanización alternativa ${i + 1}`}
                          placeholder="sūpā"
                          value={a}
                          onChange={(e) => setAlts(alts.map((x, j) => (j === i ? e.currentTarget.value : x)))}
                        />
                      </div>
                      <Button
                        variant="subtle" className="knd-error" size="compact-xs"
                        aria-label={`Quitar romanización alternativa ${i + 1}`}
                        onClick={() => setAlts(alts.filter((_, j) => j !== i))}
                      >
                        <Icon glyph={X} rem={0.875} />
                      </Button>
                    </Group>
                  ))}
                </Group>
              )}
              {addAction.error && <Text className="knd-error" size="sm">{addAction.error}</Text>}
              {/* Sin el `·` que separaba la frase del link: con el formulario
                  en una columna la ayuda ocupa dos líneas, y el punto quedaba
                  abriendo la segunda como si fuera una viñeta. El link se
                  distingue solo -color y subrayado-, así que el separador no
                  estaba aportando nada que se pierda. */}
              <Group gap="0.375rem" wrap="wrap">
                <Text size="xs" c="dimmed">El romaji se completa solo desde el kana. Editalo si hace falta.</Text>
                <Anchor
                  id="add-alt-romaji" className={styles.inlineLink} component="button" type="button"
                  size="xs" underline="always"
                  onClick={() => setAlts([...alts, ''])}
                >
                  + romanización alternativa
                </Anchor>
              </Group>
            </Stack>
          </Paper>
        )}

        <Group className="knd-sect-row" gap={10} wrap="nowrap">
          <SectionLabel id="cards-count" jp="語">
            {cards.length === 1 ? '1 carta' : `${cards.length} cartas`}
          </SectionLabel>
          {readOnly && !manyGroups && (
            <Text className="romaji" size={rem(9)} tt="uppercase" c="dark.3" style={{ letterSpacing: '0.08em' }}>
              sólo lectura
            </Text>
          )}
        </Group>

        <Paper id="cards-list" withBorder style={{ overflow: 'hidden' }}>
          {cards.map((c, i) => (
            <Box key={c.id} id={`card-row-${c.id}`}>
              {i > 0 && <Divider color={'var(--knd-border-soft)'} />}
              <SwipeRow
                label={c.prompt}
                tappable={!readOnly}
                onTap={() => { editAction.setError(null); setEditCard(c); setEditOpen(true); }}
                leading={!readOnly && manyGroups
                  ? { label: 'Mover', onAction: () => { moveAction.setError(null); setDestino(null); setMoving(c); } }
                  : undefined}
                trailing={!readOnly
                  ? { label: 'Borrar', onAction: () => setDeleting(c) }
                  : undefined}
              >
                {/* Los anchos viven en globals.css y no acá porque tienen que
                    cambiar entre escritorio y teléfono, y un `style` inline no
                    puede llevar una media query. */}
                <Group className={styles.cardRow} gap={12} style={{ padding: '0.625rem 0.8125rem' }}>
                  {/* El kana NO va atenuado: es el dato principal de la fila, y
                      el mockup lo deja en el color de texto normal -son el
                      romaji y el significado los que van en `--a-dim`-. */}
                  {/* Y en un mazo propio el kana ES el botón de editar, por lo
                      mismo que el nombre es el enlace en el listado de mazos y
                      en el de grupos: sacado el botón «Editar» -la fila ya abre
                      el editor al tocarla, con dedo y con mouse-, hacía falta
                      algo enfocable para llegar con el teclado. La fila que lo
                      contiene es un `div` con `onClick`, sin `tabIndex` ni
                      `onKeyDown`, así que sin esto editar quedaba en manos del
                      mouse solamente.
                      Conserva el id del botón que reemplaza. */}
                  {readOnly ? (
                    <Text className={`kana ${styles.cardKana} knd-swipe-pin`}>{c.prompt}</Text>
                  ) : (
                    <Text
                      component="button"
                      type="button"
                      id={`card-edit-${c.id}`}
                      className={`kana ${styles.cardKana} ${styles.cardEdit} knd-swipe-pin`}
                      onClick={() => { editAction.setError(null); setEditCard(c); setEditOpen(true); }}
                    >
                      {c.prompt}
                    </Text>
                  )}
                  <Text className={`romaji ${styles.cardRomaji}`} size="sm" c="dimmed">{c.primary}</Text>
                  <Text className={styles.cardMeaning} size="sm" c="dimmed">{c.meaning ?? ''}</Text>
                  {/* Un mazo incluido no trae acciones por carta: la pantalla es
                      un visor. En teléfono estos botones se ocultan por CSS y
                      las acciones llegan por gesto. */}
                  {!readOnly && (
                    <Group className={styles.cardActions} gap={5} wrap="nowrap">
                      <Button
                        id={`card-delete-${c.id}`}
                        variant="subtle" color="shu.6" size="compact-xs" className="knd-row-delete"
                        onClick={() => setDeleting(c)}
                        // Sin ruedita: este botón sólo ABRE el modal, el borrado
                        // lo ejecuta el de adentro y la ruedita va ahí. Antes
                        // giraba esta fila porque el estado guardaba qué carta
                        // se estaba borrando; con la acción compartida eso sería
                        // hacer girar todas las filas a la vez.
                      >
                        Borrar
                      </Button>
                      {manyGroups && (
                        <Button
                          id={`card-move-${c.id}`}
                          variant="default" bg="transparent" size="compact-xs"
                          onClick={() => { moveAction.setError(null); setDestino(null); setMoving(c); }}
                        >
                          Mover
                        </Button>
                      )}
                    </Group>
                  )}
                </Group>
              </SwipeRow>
            </Box>
          ))}
          {cards.length === 0 && <Text p="md" size="sm" c="dimmed">Todavía no hay cartas en este grupo.</Text>}
        </Paper>

        <NameModal
          id="rename-group" opened={renameOpen} onClose={() => setRenameOpen(false)}
          jp="改" title="Renombrar grupo" label="Nombre"
          initial={group.name} submit="Guardar" onSubmit={renameGroup}
        />

        {/* El grupo actual aparece deshabilitado en vez de ausente: dice dónde
            estás parado sin necesidad de otra label. */}
        <ConfirmModal
          id="delete-card-modal" opened={!!deleting} onClose={() => setDeleting(null)}
          jp="削" title="¿Borrar la palabra?" confirm="Borrar la palabra"
          confirmId="confirm-delete-card" onConfirm={removeCard}
        >
          {/* Los intentos de esa carta se borran con ella, así que la
              estadística cambia y el diálogo lo dice. */}
          {'Se va a borrar '}
          <b>{`«${deleting?.prompt ?? ''}»`}</b>
          {deleting?.meaning ? ` (${deleting.meaning})` : ''}
          {' y sus '}
          <b>intentos registrados</b>
          {'. No se puede deshacer.'}
        </ConfirmModal>

        <Modal
          id="move-card-modal"
          opened={!!moving}
          onClose={() => { setMoving(null); setDestino(null); }}
          title={<ModalTitle jp="移">Mover palabra</ModalTitle>}
        >
          {/* Una lista de opciones con su confirmación, no un botón por grupo
              que mueve al tocarlo. Mover es una acción con target: elegir el
              target y ejecutarla son dos pasos, y sin el segundo un toque mal
              dado movía la carta sin decir nada. Además así hay Cancelar, que
              antes no existía -salías por la ✕ o por Esc-. */}
          <Stack gap={10}>
            <Text size="sm" c="dimmed">
              {'Mover '}
              <Text component="b" className="kana knd-strong" inherit>
                {moving?.prompt}
              </Text>
              {' a:'}
            </Text>
            {/* El grupo actual NO aparece. Estaba listado y deshabilitado, con un
                «· acá está» al lado, para decir dónde estabas parado; pero una
                lista de destinos posibles no es el lugar para eso -el target
                que no se puede elegir no es un target-, y el nombre del grupo
                ya está en la miga de arriba de la pantalla. */}
            <Radio.Group value={target === null ? '' : String(target)} onChange={(v) => setDestino(Number(v))}>
              <Stack gap={2}>
                {deck.groups.filter((g) => g.id !== group.id).map((g) => (
                  <Radio
                    key={g.id}
                    id={`move-to-${g.id}`}
                    value={String(g.id)}
                    disabled={moveAction.busy}
                    className={styles.moveOpt}
                    /* 16px, el preset más chico: el círculo del diseño mide 14 y
                       los 20 del default de Mantine, al lado de un nombre de
                       13px, pesan más que el nombre. */
                    size="xs"
                    /* El punto de adentro va en jade, no en el negro que Mantine
                       mete por default. Y va como PROP y no por CSS: Mantine
                       escribe `--radio-icon-color` como estilo INLINE en la raíz
                       del control -medido: `--radio-icon-color:
                       var(--mantine-color-black)`-, así que una regla de clase
                       nunca le iba a ganar. La marca queda de un solo color:
                       anillo y punto en jade. */
                    iconColor="jade.6"
                    label={
                      <Group gap={10} wrap="nowrap" justify="space-between" style={{ flex: 1 }}>
                        <Text size={rem(13)}>{g.name}</Text>
                        <Text size={rem(11)} c="dark.3" className="tabular">{g.cardCount}</Text>
                      </Group>
                    }
                  />
                ))}
              </Stack>
            </Radio.Group>
            {moveAction.error && <Text className="knd-error" size="sm">{moveAction.error}</Text>}
            <ModalActions onCancel={() => setMoving(null)} busy={moveAction.busy}>
              <Button
                id="confirm-move-card"
                onClick={() => target !== null && moveCard(target)}
                disabled={target === null || moveAction.busy}
                loading={moveAction.busy}
              >
                Mover
              </Button>
            </ModalActions>
          </Stack>
        </Modal>

        {/* Montado SIEMPRE, no sólo cuando hay algo que editar: un modal que
            nace abierto no tiene estado previo del que salir, y Mantine no
            anima la entrada. Los de mover y borrar ya estaban así, y por eso
            ellos sí animaban. */}
        <EditCardModal
          card={editCard}
          opened={editOpen}
          busy={editAction.busy}
          error={editAction.error}
          onClose={() => setEditOpen(false)}
          onSave={saveCard}
        />

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
    </Screen>
  );
}
