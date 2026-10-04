'use client';

import { Stack, Box } from '@mantine/core';
import { SectionLabel } from '../SectionLabel';
import type { GroupSummary } from '@/lib/services/decks';
import { GroupCard } from './GroupCard';
import styles from './GroupGrid.module.css';

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

// El glifo que el diseño le pone a cada sección. Mismo criterio que el mapa
// de arriba: es presentación, no un valor del modelo. Son los términos reales
// -濁点 dakuten, 拗音 yōon, 外来 de 外来語 para los extendidos del katakana-,
// no glifos elegidos por cómo se ven.
const SECTION_JP: Record<string, string | undefined> = {
  'Básicos': '基本',
  'Dakuten': '濁点',
  'Contracciones': '拗音',
  'Extendidos': '外来',
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
            // El diseño rotula la sección con su glifo y su término japonés
            // -«基本 gojūon»- en vez de la palabra en castellano. Si de
            // alguna no hay término, queda la palabra, que es mejor que
            // nada.
            <SectionLabel jp={SECTION_JP[section.label]}>
              {SECTION_SUFFIX[section.label] ?? section.label}
            </SectionLabel>
          )}
          {/* 8 columnas en escritorio, 5 en tablet, 3 en teléfono (ver
              `.${styles.groupGrid}` en app/globals.css). No se usa `SimpleGrid`
              porque sus breakpoints de tema (`sm`/`md`) no coinciden con el
              breakpoint fijo de 640px del resto de la navegación. */}
          <Box className={styles.groupGrid}>
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
