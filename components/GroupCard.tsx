'use client';

import { Card, Switch, Stack, Text } from '@mantine/core';
import type { GroupSummary } from '@/lib/services/decks';

/**
 * La regla de las seis cartas: si el grupo trae preview, se muestran las cartas
 * (y か行 se ve como la columna de kana); si no, se muestra el conteo.
 * Es presentación pura, no hay ninguna condición en el modelo de datos.
 */
export function GroupCard({
  group, checked, onToggle,
}: { group: GroupSummary; checked: boolean; onToggle: (id: number, on: boolean) => void }) {
  return (
    <Card
      withBorder
      padding="xs"
      onClick={() => onToggle(group.id, !checked)}
      style={{
        cursor: 'pointer',
        minHeight: 44,
        borderColor: checked ? 'var(--mantine-color-jade-8)' : undefined,
      }}
    >
      <Stack gap={6} align="center">
        <Switch
          size="xs"
          checked={checked}
          onChange={(e) => onToggle(group.id, e.currentTarget.checked)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Practicar ${group.name}`}
        />
        <Text size="xs" c="dimmed" className="kana">{group.name}</Text>

        {group.preview.length > 0 ? (
          <Stack gap={0} align="center">
            {group.preview.map((p) => (
              <Text key={p} className="kana" size="md" lh={1.5}>{p}</Text>
            ))}
          </Stack>
        ) : (
          <Text size="xs" c="dimmed" className="tabular">{group.cardCount} palabras</Text>
        )}
      </Stack>
    </Card>
  );
}
