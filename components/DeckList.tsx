'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Stack, Group, Text, Button, Paper, Divider, Modal, TextInput, useMantineTheme,
} from '@mantine/core';
import { ListRow } from './ListRow';
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

function iconFor(d: DeckSummary): string {
  if (d.isBuiltin && d.name === 'Hiragana') return 'あ';
  if (d.isBuiltin && d.name === 'Katakana') return 'ア';
  return '▤';
}

export function DeckList({ decks }: { decks: DeckSummary[] }) {
  const router = useRouter();
  const { other } = useMantineTheme();

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
      <Group id="decks-header" gap={10} wrap="nowrap">
        <SectionLabel id="decks-count">
          {`${decks.length} mazos · ${totalCards} cartas`}
        </SectionLabel>
        <Button id="new-deck-btn" size="compact-sm" onClick={openCreate}>
          + Nuevo mazo
        </Button>
      </Group>

      {/* `overflow: hidden` para que el fondo de la primera y la última
          fila siga el radio de la caja (`.rowlist` del diseño). */}
      <Paper id="decks-list" withBorder style={{ overflow: 'hidden' }}>
        {decks.map((d, i) => (
          <div key={d.id} id={`deck-row-${d.id}`}>
            {/* Las líneas INTERNAS van en `--a-border-soft`; el `--a-border`
                más marcado queda para el borde exterior de la lista. */}
            {i > 0 && <Divider color={other.borderSoft} />}
            <ListRow
              icon={iconFor(d)}
              title={<>{d.name}{d.isBuiltin && <BuiltinDot />}</>}
              subtitle={subtitleFor(d)}
              actions={
                <>
                  {/* Los incluidos no muestran Borrar: eso ya dice que no se pueden borrar. */}
                  {!d.isBuiltin && (
                    <Button
                      id={`deck-delete-${d.id}`}
                      variant="subtle" color="shu.6" size="compact-xs" onClick={() => openConfirm(d)}
                    >
                      Borrar
                    </Button>
                  )}
                  {/* `.btn.ghost` del diseño: saca el FONDO pero conserva el
                      borde. El `subtle` de Mantine saca los dos y dejaba
                      "Ver cartas"/"Editar" como texto suelto. */}
                  <Button
                    id={`deck-edit-${d.id}`}
                    variant="default" bg="transparent" size="compact-xs"
                    onClick={() => router.push(`/decks/${d.id}`)}
                  >
                    {d.isBuiltin ? 'Ver cartas' : 'Editar'}
                  </Button>
                  <Button
                    id={`deck-practice-${d.id}`}
                    variant="default" size="compact-xs" onClick={() => router.push('/')}
                  >
                    Practicar
                  </Button>
                </>
              }
            />
          </div>
        ))}
      </Paper>

      <Modal id="new-deck-modal" opened={creating} onClose={() => setCreating(false)} title="Nuevo mazo">
        <Stack>
          <TextInput
            id="deck-name" label="Nombre" placeholder="Comidas"
            value={name} onChange={(e) => setName(e.currentTarget.value)}
          />
          <TextInput
            id="deck-groups" label="Grupos (opcional, separados por coma)"
            placeholder="Pescado, Verdura, Frutas"
            description="Si lo dejás vacío se crea un solo grupo y la app esconde ese nivel."
            value={groups} onChange={(e) => setGroups(e.currentTarget.value)}
          />
          {createError && <Text c="shu.6" size="sm">{createError}</Text>}
          <Button id="create-deck-btn" onClick={create} disabled={!name.trim() || createBusy} loading={createBusy}>
            Crear
          </Button>
        </Stack>
      </Modal>

      <Modal id="delete-deck-modal" opened={!!confirm} onClose={() => setConfirm(null)} title="¿Borrar el mazo?">
        <Stack>
          {/* Las cascadas son reales: hay que mostrarlas antes de ejecutarlas. */}
          <Text size="sm">
            Se va <b>{confirm?.name}</b>, sus {confirm?.groupCount} grupos,
            sus {confirm?.cardCount} cartas y todos los intentos registrados.
          </Text>
          {deleteError && <Text c="shu.6" size="sm">{deleteError}</Text>}
          <Group>
            <Button variant="default" onClick={() => setConfirm(null)} disabled={deleteBusy}>
              Cancelar
            </Button>
            <Button
              color="shu"
              onClick={() => confirm && remove(confirm)}
              loading={deleteBusy}
              disabled={deleteBusy}
            >
              Borrar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
