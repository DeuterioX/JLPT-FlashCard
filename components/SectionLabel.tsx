import { Group, Text, Divider, rem, useMantineTheme } from '@mantine/core';

/**
 * `.sect-label` del diseño: el encabezado de sección que se repite en toda
 * la app -los "Básicos/Dakuten/Contracciones" de Práctica, "Las que te
 * costaron" del fin de ronda, y el "N mazos · M cartas" de Mazos-. En el
 * mockup es una sola clase usada 8 veces; acá estaba copiado a mano en cada
 * pantalla y había divergido: dos de las tres instancias tenían IBM Plex
 * Sans 12px en `--a-dim` y sin línea, contra el mono de 9.5px en
 * `--a-dimmer` con una regla de 1px que el diseño pide.
 *
 * La línea va en `--a-border-soft`, no en `--a-border`: es el tono de las
 * separaciones internas.
 */
export function SectionLabel({
  id, children, suffix,
}: {
  id?: string;
  children: React.ReactNode;
  /**
   * Término japonés que el diseño agrega en escritorio ("Básicos · gojūon")
   * y omite en teléfono, donde no entra. Esa diferencia la resuelve
   * `.knd-sect-suffix` en globals.css, no un `useMediaQuery`: así el
   * servidor y el cliente renderizan lo mismo.
   */
  suffix?: string;
}) {
  const { other } = useMantineTheme();
  return (
    <Group id={id} gap={10} wrap="nowrap" style={{ flex: 1 }}>
      <Text
        className="romaji"
        size={rem(9.5)}
        lh={1.5}
        tt="uppercase"
        c="dark.3"
        style={{ letterSpacing: '0.11em', whiteSpace: 'nowrap' }}
      >
        {children}
        {/* Template literal y no texto suelto con un espacio al lado del
            tag: un espacio pegado al cierre de un tag puede colapsar a
            ancho cero (ver la regla en CLAUDE.md). */}
        {suffix && <span className="knd-sect-suffix">{` · ${suffix}`}</span>}
      </Text>
      <Divider style={{ flex: 1 }} color={other.borderSoft} />
    </Group>
  );
}
