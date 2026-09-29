'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Anchor, Button, Divider, Group, Modal, Paper, Stack, Text,
} from '@mantine/core';
import { Navbar } from './Navbar';
import { ListRow } from './ListRow';
import { SwipeRow } from './SwipeRow';
import { ModalActions } from './ModalActions';
import { CampoPapel } from './CampoPapel';
import { ModalTitle } from './ModalTitle';
import { BuiltinDot } from './BuiltinDot';
import { SectionLabel } from './SectionLabel';
import { errorFrom, NETWORK_ERROR } from '@/lib/client/errors';
import type { DeckSummary } from '@/lib/services/decks';

// Comparar contra el nombre solo alcanza si además es un mazo incluido: si
// alguien crea un mazo propio llamado "Hiragana", o renombra el incluido,
// esto no debe confundirse ni mostrar el glifo equivocado.
// Tercer segmento del subtítulo (`.row .sub` del diseño): las SECCIONES del
// mazo cuando las tiene -"básicos, dakuten, contracciones"-, y si no, los
// nombres de sus grupos -"Pescado, Verdura, Frutas"-. Con esa única regla se
// reproducen los dos ejemplos del mockup, que a simple vista parecían
// inconsistentes: `card_group.section` es NULL justamente en los mazos
// propios (ver el esquema), que son los que ahí muestran nombres de grupo.
// Las secciones van en minúscula como en el diseño; los nombres de grupo se
// respetan tal cual porque son nombres propios.
const SUBTITLE_PARTS = 4;

function subtitleFor(d: DeckSummary): string {
  const sections = [...new Set(d.groups.map((g) => g.section).filter((x): x is string => !!x))];
  const parts = sections.length > 0
    ? sections.map((x) => x.toLocaleLowerCase('es'))
    : d.groups.map((g) => g.name);
  const shown = parts.slice(0, SUBTITLE_PARTS).join(', ');
  const detail = parts.length > SUBTITLE_PARTS ? `${shown}…` : shown;
  return [
    // "1 grupos" decía antes: el plural estaba fijo.
    `${d.groupCount} ${d.groupCount === 1 ? 'grupo' : 'grupos'}`,
    `${d.cardCount} cartas`,
    detail,
  ].filter(Boolean).join(' · ');
}

/**
 * Los dos mazos incluidos se muestran con SU kana, que es de qué son: あ para
 * Hiragana, ア para Katakana. Ahí el carácter no es un ícono, es el contenido.
 *
 * Cualquier otro mazo lleva 冊, el kanji de «volumen encuadernado», que es el
 * mismo de la pestaña Mazos y del encabezado de esta sección. Antes era el
 * pictograma de Bootstrap, y en una columna de 34px donde los otros dos son
 * caracteres japoneses un dibujo de otra procedencia se lee como de otra app.
 */
function iconFor(d: DeckSummary): React.ReactNode {
  if (d.isBuiltin && d.name === 'Hiragana') return 'あ';
  if (d.isBuiltin && d.name === 'Katakana') return 'ア';
  return '冊';
}

export function DeckList({ decks }: { decks: DeckSummary[] }) {
  const router = useRouter();

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [groups, setGroups] = useState('');
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  // Guarda contra doble click con una ref, no con estado: dos clicks del
  // mismo evento discreto pueden procesarse antes de que `disabled` se
  // refleje en el DOM si la guarda fuera un `useState`.
  const creatingRef = useRef(false);

  const [confirm, setConfirm] = useState<DeckSummary | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deletingRef = useRef(false);

  function openCreate() {
    setName('');
    setGroups('');
    setCreateError(null);
    setCreating(true);
  }

  function openConfirm(d: DeckSummary) {
    setDeleteError(null);
    setConfirm(d);
  }

  async function create() {
    if (creatingRef.current) return;
    creatingRef.current = true;
    setCreateBusy(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/decks', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name,
          groups: groups.split(',').map((g) => g.trim()).filter(Boolean),
        }),
      });
      if (!res.ok) {
        setCreateError(await errorFrom(res));
        return;
      }
      setCreating(false);
      setName('');
      setGroups('');
      router.refresh();
    } catch {
      // fetch tiró (sin red, DNS, CORS, etc.): no hubo respuesta que leer.
      setCreateError(NETWORK_ERROR);
    } finally {
      creatingRef.current = false;
      setCreateBusy(false);
    }
  }

  async function remove(d: DeckSummary) {
    if (deletingRef.current) return;
    deletingRef.current = true;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/decks/${d.id}`, { method: 'DELETE' });
      if (!res.ok) {
        setDeleteError(await errorFrom(res));
        return;
      }
      setConfirm(null);
      router.refresh();
    } catch {
      setDeleteError(NETWORK_ERROR);
    } finally {
      deletingRef.current = false;
      setDeleteBusy(false);
    }
  }

  const totalCards = decks.reduce((n, d) => n + d.cardCount, 0);

  return (
    <Stack id="decks-screen" gap="md">
      <Navbar id="decks-header-crumb" currentId="decks-title" levels={[{ label: 'Mazos' }]} />

      <Group id="decks-header" gap={10} wrap="nowrap">
        <SectionLabel id="decks-count" jp="冊">
          {`${decks.length} mazos · ${totalCards} cartas`}
        </SectionLabel>
        <Button id="new-deck-btn" size="compact-sm" onClick={openCreate}>
          + Nuevo mazo
        </Button>
      </Group>

      {/* `overflow: hidden` para que el fondo de la primera y la última
          fila siga el radio de la caja (`.rowlist` del diseño). */}
      <Paper id="decks-list" className="knd-lista" withBorder style={{ overflow: 'hidden' }}>
        {decks.map((d, i) => (
          <div key={d.id} id={`deck-row-${d.id}`}>
            {/* Las líneas INTERNAS van en `--a-border-soft`; el `--a-border`
                más marcado queda para el borde exterior de la lista. */}
            {i > 0 && <Divider color={'var(--knd-border-soft)'} />}
            {/* En teléfono las acciones llegan por gesto y los botones se
                esconden: medido en 390px, la fila del único mazo propio le
                dejaba al nombre y al subtítulo 150 de 390px, el subtítulo se
                partía en cuatro líneas con «Borrar» flotando en el medio y la
                fila pasaba de 71 a 88px de alto. */}
            <SwipeRow
              label={d.name}
              tappable
              onTap={() => router.push(`/decks/${d.id}`)}
              leading={{ etiqueta: 'Practicar', onAction: () => router.push('/') }}
              trailing={d.isBuiltin
                ? undefined
                : { etiqueta: 'Borrar', onAction: () => openConfirm(d) }}
            >
            <ListRow
              icon={iconFor(d)}
              /* El nombre ES el enlace, por lo mismo que en el listado de
                 grupos: sacado el botón que navegaba -la fila ya lo hace al
                 tocarla-, hacía falta algo enfocable para llegar con el
                 teclado. */
              title={
                <>
                  <Anchor
                    component={Link}
                    href={`/decks/${d.id}`}
                    underline="never"
                    c="var(--mantine-color-text)"
                    inherit
                  >
                    {d.name}
                  </Anchor>
                  {d.isBuiltin && <BuiltinDot />}
                </>
              }
              subtitle={subtitleFor(d)}
              actionsClassName="knd-deck-actions"
              actions={
                <>
                  {/* Los incluidos no muestran Borrar: eso ya dice que no se pueden borrar. */}
                  {!d.isBuiltin && (
                    <Button
                      id={`deck-delete-${d.id}`}
                      variant="subtle" color="shu.6" size="compact-xs" className="knd-borrar-fila" onClick={() => openConfirm(d)}
                    >
                      Borrar
                    </Button>
                  )}
                  <Button
                    id={`deck-practice-${d.id}`}
                    variant="default" size="compact-xs" onClick={() => router.push('/')}
                  >
                    Practicar
                  </Button>
                </>
              }
            />
            </SwipeRow>
          </div>
        ))}
      </Paper>

      <Modal id="new-deck-modal" opened={creating} onClose={() => setCreating(false)} title={<ModalTitle jp="新">Nuevo mazo</ModalTitle>}>
        <Stack
          component="form"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (!name.trim() || createBusy) return;
            void create();
          }}
        >
          <CampoPapel
            id="deck-name" label="Nombre" placeholder="Comidas"
            value={name} onChange={(e) => setName(e.currentTarget.value)}
          />
          {/* El rótulo de adentro tiene que ser corto -son versalitas de 9px
              en la misma línea que el texto-, así que la aclaración larga baja
              a la nota, que es donde el diseño pone lo que hay que explicar. */}
          <CampoPapel
            id="deck-groups" label="Grupos"
            placeholder="Pescado, Verdura, Frutas"
            value={groups} onChange={(e) => setGroups(e.currentTarget.value)}
          />
          <Text className="knd-campo-nota">
            Separados por coma, y opcional: si lo dejás vacío se crea un grupo
            solo, llamado «General».
          </Text>
          {createError && <Text c="var(--knd-shu-txt)" size="sm">{createError}</Text>}
          <ModalActions onCancel={() => setCreating(false)} busy={createBusy}>
            <Button id="create-deck-btn" type="submit" disabled={!name.trim() || createBusy} loading={createBusy}>
              Crear
            </Button>
          </ModalActions>
        </Stack>
      </Modal>

      <Modal id="delete-deck-modal" opened={!!confirm} onClose={() => setConfirm(null)} title={<ModalTitle jp="削">¿Borrar el mazo?</ModalTitle>}>
        <Stack gap={14}>
          {/* Las cascadas son reales: hay que mostrarlas antes de ejecutarlas.
              La frase es la del diseño -el verbo adelante, en negrita sólo lo
              que desaparece-, con los dos niveles que se lleva un mazo. */}
          <Text className="knd-borrar-nota">
            {'Se va a borrar '}
            <b>{`«${confirm?.name ?? ''}»`}</b>
            {', sus '}
            <b>{confirm?.groupCount === 1 ? '1 grupo' : `${confirm?.groupCount ?? 0} grupos`}</b>
            {' y sus '}
            <b>{confirm?.cardCount === 1 ? '1 carta' : `${confirm?.cardCount ?? 0} cartas`}</b>
            {'. No se puede deshacer.'}
          </Text>
          {deleteError && <Text c="var(--knd-shu-txt)" size="sm">{deleteError}</Text>}
          <ModalActions onCancel={() => setConfirm(null)} busy={deleteBusy}>
            <Button
              color="shu.6"
              onClick={() => confirm && remove(confirm)}
              loading={deleteBusy}
              disabled={deleteBusy}
            >
              Borrar el mazo
            </Button>
          </ModalActions>
        </Stack>
      </Modal>
    </Stack>
  );
}
