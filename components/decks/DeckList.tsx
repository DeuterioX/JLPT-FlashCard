'use client';

import { useState, type SubmitEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  Anchor, Button, Divider, Group, Modal, Paper, Stack, Text,
} from '@mantine/core';
import { Screen } from '../Screen';
import { ListRow } from '../ListRow';
import { SwipeRow } from '../SwipeRow';
import { ModalActions } from '../ModalActions';
import { PaperField } from '../PaperField';
import { ModalTitle } from '../ModalTitle';
import { ConfirmModal } from '../ConfirmModal';
import { BuiltinDot } from './BuiltinDot';
import { SectionLabel } from '../SectionLabel';
import { errorFrom } from '@/lib/client/errors';
import { useAction } from '@/lib/client/action';
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

function subtitleFor(d: DeckSummary, t: ReturnType<typeof useTranslations<'decks'>>, locale: string): string {
  const sections = [...new Set(d.groups.map((g) => g.section).filter((x): x is string => !!x))];
  const parts = sections.length > 0
    ? sections.map((x) => x.toLocaleLowerCase(locale))
    : d.groups.map((g) => g.name);
  const shown = parts.slice(0, SUBTITLE_PARTS).join(', ');
  const detail = parts.length > SUBTITLE_PARTS ? `${shown}…` : shown;
  return [
    t('groups', { count: d.groupCount }),
    t('cards', { count: d.cardCount }),
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
  const t = useTranslations('decks');
  const tErrors = useTranslations('errors');
  const locale = useLocale();
  const router = useRouter();

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [groups, setGroups] = useState('');
  // La guarda contra doble click, el `busy` y el error viven en `useAction`:
  // es la misma forma que repetían todos los botones de la app.
  const createAction = useAction();
  const [confirm, setConfirm] = useState<DeckSummary | null>(null);

  function openCreate() {
    setName('');
    setGroups('');
    createAction.setError(null);
    setCreating(true);
  }

  const create = () => createAction.run(async () => {
    const res = await fetch('/api/decks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name,
        groups: groups.split(',').map((g) => g.trim()).filter(Boolean),
      }),
    });
    if (!res.ok) return errorFrom(res, tErrors('generic'));
    setCreating(false);
    setName('');
    setGroups('');
    router.refresh();
  });

  const remove = async (d: DeckSummary) => {
    const res = await fetch(`/api/decks/${d.id}`, { method: 'DELETE' });
    if (!res.ok) return errorFrom(res, tErrors('generic'));
    setConfirm(null);
    router.refresh();
  };

  const totalCards = decks.reduce((n, d) => n + d.cardCount, 0);

  return (
    <Screen nav={{ id: 'decks-header-crumb', currentId: 'decks-title', levels: [{ label: t('title') }] }}>
      <Stack id="decks-screen" gap="md">
        <Group id="decks-header" gap={10} wrap="nowrap">
          <SectionLabel id="decks-count" jp="冊">
            {`${t('decks', { count: decks.length })} · ${t('cards', { count: totalCards })}`}
          </SectionLabel>
          <Button id="new-deck-btn" size="compact-sm" onClick={openCreate}>
            {t('new')}
          </Button>
        </Group>

        {/* `overflow: hidden` para que el fondo de la primera y la última
            fila siga el radio de la caja (`.rowlist` del diseño). */}
        <Paper id="decks-list" withBorder className="knd-list">
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
                leading={{ label: t('practice'), onAction: () => router.push('/') }}
                trailing={d.isBuiltin
                  ? undefined
                  : { label: t('delete'), onAction: () => setConfirm(d) }}
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
                      className="knd-strong"
                      inherit
                    >
                      {d.name}
                    </Anchor>
                    {d.isBuiltin && <BuiltinDot />}
                  </>
                }
                subtitle={subtitleFor(d, t, locale)}
                actions={
                  <>
                    {/* Los incluidos no muestran Borrar: eso ya dice que no se pueden borrar. */}
                    {!d.isBuiltin && (
                      <Button
                        id={`deck-delete-${d.id}`}
                        variant="subtle" color="shu.6" size="compact-xs" className="knd-row-delete" onClick={() => setConfirm(d)}
                      >
                        {t('delete')}
                      </Button>
                    )}
                    <Button
                      id={`deck-practice-${d.id}`}
                      variant="default" size="compact-xs" onClick={() => router.push('/')}
                    >
                      {t('practice')}
                    </Button>
                  </>
                }
              />
              </SwipeRow>
            </div>
          ))}
        </Paper>

        <Modal id="new-deck-modal" opened={creating} onClose={() => setCreating(false)} title={<ModalTitle jp="新">{t('newModal.title')}</ModalTitle>}>
          <Stack
            component="form"
            onSubmit={(e: SubmitEvent) => {
              e.preventDefault();
              if (!name.trim() || createAction.busy) return;
              void create();
            }}
          >
            <PaperField
              id="deck-name" label={t('newModal.name')} placeholder={t('newModal.namePlaceholder')}
              value={name} onChange={(e) => setName(e.currentTarget.value)}
            />
            {/* El rótulo de adentro tiene que ser corto -son versalitas de 9px
                en la misma línea que el texto-, así que la aclaración larga baja
                a la nota, que es donde el diseño pone lo que hay que explicar. */}
            <PaperField
              id="deck-groups" label={t('newModal.groups')}
              placeholder={t('newModal.groupsPlaceholder')}
              value={groups} onChange={(e) => setGroups(e.currentTarget.value)}
            />
            <Text className="knd-field-note">
              {t('newModal.groupsNote')}
            </Text>
            {createAction.error && <Text className="knd-error" size="sm">{createAction.error}</Text>}
            <ModalActions onCancel={() => setCreating(false)} busy={createAction.busy}>
              <Button id="create-deck-btn" type="submit" disabled={!name.trim() || createAction.busy} loading={createAction.busy}>
                {t('newModal.create')}
              </Button>
            </ModalActions>
          </Stack>
        </Modal>

        <ConfirmModal
          id="delete-deck-modal" opened={!!confirm} onClose={() => setConfirm(null)}
          jp="削" title={t('deleteModal.title')} confirm={t('deleteModal.confirm')}
          onConfirm={() => remove(confirm!)}
        >
          {/* Las cascadas son reales: hay que mostrarlas antes de ejecutarlas,
              con los dos niveles que se lleva un mazo. */}
          {t.rich('deleteModal.body', {
            name: confirm?.name ?? '',
            groups: confirm?.groupCount ?? 0,
            cards: confirm?.cardCount ?? 0,
            b: (chunks) => <b>{chunks}</b>,
          })}
        </ConfirmModal>
      </Stack>
    </Screen>
  );
}
