'use client';

import { Stack, SimpleGrid, Group, Text, Divider } from '@mantine/core';
import type { GroupSummary } from '@/lib/services/decks';
import { GroupCard } from './GroupCard';

/** Agrupa por `section` conservando el orden de aparición. NULL = un solo bloque sin título. */
function bySection(groups: GroupSummary[]): { label: string | null; items: GroupSummary[] }[] {
  const out: { label: string | null; items: GroupSummary[] }[] = [];
  for (const g of groups) {
    const last = out.at(-1);
    if (last && last.label === g.section) last.items.push(g);
    else out.push({ label: g.section, items: [g] });
  }
  return out;
}

export function GroupGrid({
  groups, selected, onToggle,
}: {
  groups: GroupSummary[];
  selected: Set<number>;
  onToggle: (id: number, on: boolean) => void;
}) {
  return (
    <Stack gap="lg">
      {bySection(groups).map((section, i) => (
        <Stack gap="xs" key={section.label ?? `sin-seccion-${i}`}>
          {section.label && (
            <Group gap="sm" wrap="nowrap">
              <Text size="xs" tt="uppercase" c="dimmed" style={{ letterSpacing: '0.11em' }}>
                {section.label}
              </Text>
              <Divider style={{ flex: 1 }} />
            </Group>
          )}
          {/* 8 columnas en escritorio, 3 en teléfono. */}
          <SimpleGrid cols={{ base: 3, sm: 5, md: 8 }} spacing="xs">
            {section.items.map((g) => (
              <GroupCard
                key={g.id}
                group={g}
                checked={selected.has(g.id)}
                onToggle={onToggle}
              />
            ))}
          </SimpleGrid>
        </Stack>
      ))}
    </Stack>
  );
}
