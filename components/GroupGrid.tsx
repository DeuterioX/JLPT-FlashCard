'use client';

import { Stack, Box } from '@mantine/core';
import { SectionLabel } from './SectionLabel';
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

// El diseño rotula estas secciones con su término japonés al lado
// ("Básicos · gojūon"). El dato guardado en `card_group.section` es solo la
// categoría -una palabra-, así que el término va acá: es presentación, no
// un valor nuevo del modelo, y ponerlo en la base obligaría a migrar los
// mazos ya sembrados para nada. "Extendidos" (katakana) no lleva: el
// mockup tampoco le pone uno.
const SECTION_SUFFIX: Record<string, string | undefined> = {
  'Básicos': 'gojūon',
  'Dakuten': 'handakuten',
  'Contracciones': 'yōon',
};

export function GroupGrid({
  groups, selected, onToggle,
}: {
  groups: GroupSummary[];
  selected: Set<number>;
  onToggle: (id: number, on: boolean) => void;
}) {
  return (
    // El diseño (`.stage { gap: 16px }`) usa el mismo espacio para TODO lo
    // que se apila en la columna -entre secciones y entre el label de una
    // sección y su propia grilla-, no uno más grande arriba que abajo.
    // `md` es justo 16px en la escala default de Mantine.
    <Stack gap="md">
      {bySection(groups).map((section, i) => (
        <Stack gap="md" key={section.label ?? `sin-seccion-${i}`}>
          {section.label && (
            <SectionLabel suffix={SECTION_SUFFIX[section.label]}>{section.label}</SectionLabel>
          )}
          {/* 8 columnas en escritorio, 5 en tablet, 3 en teléfono (ver
              `.knd-group-grid` en app/globals.css). No se usa `SimpleGrid`
              porque sus breakpoints de tema (`sm`/`md`) no coinciden con el
              breakpoint fijo de 640px del resto de la navegación. */}
          <Box className="knd-group-grid">
            {section.items.map((g) => (
              <GroupCard
                key={g.id}
                group={g}
                checked={selected.has(g.id)}
                onToggle={onToggle}
              />
            ))}
          </Box>
        </Stack>
      ))}
    </Stack>
  );
}
