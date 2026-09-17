'use client';

import { Card, Switch, Stack, Text } from '@mantine/core';
import type { GroupSummary } from '@/lib/services/decks';

/**
 * La regla de las seis cartas: si el grupo trae preview, se muestran las cartas
 * (y か行 se ve como la columna de kana); si no, se muestra el conteo.
 * Es presentación pura, no hay ninguna condición en el modelo de datos.
 *
 * La tarjeta entera es el control (rol `switch`), no el `Switch` visual: en
 * Mantine 9 el track pintado del `Switch` cubre al input nativo, así que un
 * click de mouse llega primero al track y burbujea al `onClick` del `Card`
 * (toggle 1) y después, por el `<label htmlFor>` interno del propio `Switch`,
 * dispara un click sintético sobre el input que llama a `onChange`
 * (toggle 2) -`stopPropagation` en el input nunca llega a tiempo para
 * evitarlo, porque el camino que importa es el del `label`, no el del input-.
 * El resultado quedaba enmascarado porque ambos toggles calculan el mismo
 * valor, pero eran dos side effects. Por eso el `Switch` de acá abajo es
 * puramente visual (sin puntero, sin foco, oculto para lectores de pantalla)
 * y toda la interacción -mouse y teclado- vive en el `Card`.
 */
export function GroupCard({
  group, checked, onToggle,
}: { group: GroupSummary; checked: boolean; onToggle: (id: number, on: boolean) => void }) {
  const toggle = () => onToggle(group.id, !checked);

  return (
    <Card
      withBorder
      padding="xs"
      role="switch"
      aria-checked={checked}
      aria-label={`Practicar ${group.name}`}
      tabIndex={0}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          // Espacio scrollea la página por default; acá el espacio es el toggle.
          e.preventDefault();
          toggle();
        }
      }}
      className="knd-group-card"
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
          readOnly
          tabIndex={-1}
          aria-hidden
          style={{ pointerEvents: 'none' }}
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
