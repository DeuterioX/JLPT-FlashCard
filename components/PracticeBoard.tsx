'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Stack, Group, SegmentedControl, Button, Text } from '@mantine/core';
import { GroupGrid } from './GroupGrid';
import { ActionBar } from './ActionBar';
import { SELECTION_COOKIE, serializeSelection } from '@/lib/selection-cookie';
import type { DeckSummary } from '@/lib/services/decks';

export function PracticeBoard({
  decks, initialSelection,
}: { decks: DeckSummary[]; initialSelection: number[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [deckId, setDeckId] = useState(String(decks[0]?.id ?? ''));
  const [selected, setSelected] = useState(new Set(initialSelection));

  const deck = decks.find((d) => String(d.id) === deckId) ?? decks[0];

  function persist(next: Set<number>) {
    setSelected(next);
    // Un año. La lee el servidor en el próximo render: sin parpadeo.
    document.cookie =
      `${SELECTION_COOKIE}=${serializeSelection([...next])}; path=/; max-age=31536000; samesite=lax`;
  }

  const toggle = (id: number, on: boolean) => {
    const next = new Set(selected);
    if (on) next.add(id); else next.delete(id);
    persist(next);
  };

  const setAll = (on: boolean) => {
    if (!deck) return;
    const next = new Set(selected);
    for (const g of deck.groups) {
      if (on) next.add(g.id); else next.delete(g.id);
    }
    persist(next);
  };

  // Descarta ids de grupos que ya no existen (p. ej. un mazo borrado) y solo
  // cuenta los del mazo que se está mirando: cambiar de mazo cambia el conteo.
  const chosen = deck ? deck.groups.filter((g) => selected.has(g.id)) : [];
  const cardCount = chosen.reduce((n, g) => n + g.cardCount, 0);

  async function begin() {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ groupIds: chosen.map((g) => g.id) }),
    });
    if (!res.ok) return;
    const round = await res.json();
    sessionStorage.setItem('ronda', JSON.stringify(round));
    start(() => router.push('/practicar'));
  }

  if (!deck) {
    return (
      <Stack p="xl" gap="xs">
        <Text c="dimmed">Todavía no hay mazos para practicar.</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Group>
        <SegmentedControl
          value={deckId}
          onChange={setDeckId}
          data={decks.map((d) => ({ value: String(d.id), label: d.name }))}
        />
        <Button variant="subtle" size="compact-xs" ml="auto" onClick={() => setAll(true)}>
          Todos
        </Button>
        <Button variant="subtle" size="compact-xs" onClick={() => setAll(false)}>
          Ninguno
        </Button>
      </Group>

      <GroupGrid groups={deck.groups} selected={selected} onToggle={toggle} />

      <ActionBar>
        <Text size="sm" c="dimmed">
          <b>{chosen.length}</b> grupos · <b>{cardCount}</b> cartas
        </Text>
        <Button
          ml="auto"
          onClick={begin}
          loading={pending}
          disabled={chosen.length === 0}
        >
          Empezar ronda →
        </Button>
      </ActionBar>
    </Stack>
  );
}
