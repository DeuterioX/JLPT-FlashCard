import { Group, Text, rem } from '@mantine/core';
import styles from './SectionLabel.module.css';

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
  id, jp, children, suffix,
}: {
  id?: string;
  /** El glifo que identifica la sección: 冊 mazos, 組 grupos, 語 palabras. */
  jp?: string;
  children: React.ReactNode;
  /**
   * Término japonés que el diseño agrega en escritorio ("Básicos · gojūon")
   * y omite en teléfono, donde no entra. Esa diferencia la resuelve
   * `.${styles.sectSuffix}` en globals.css, no un `useMediaQuery`: así el
   * servidor y el cliente renderizan lo mismo.
   */
  suffix?: string;
}) {
  return (
    <Group id={id} gap={10} wrap="nowrap" className="knd-grow">
      {/* El glifo japonés que identifica la sección. Va en la mincho del
          diseño y es lo primero de la fila. */}
      {jp && (
        <Text className="mincho knd-nowrap" size={rem(19)} lh={1} c="dark.0">
          {jp}
        </Text>
      )}
      {/* 11px en caja normal. Era mono de 9,5px en versalitas con
          `letter-spacing`, que es el tratamiento del mockup viejo: el de
          «tinta y papel» deja el rótulo como texto común y le da el peso al
          glifo de al lado. */}
      <Text size={rem(11)} lh={1.5} c="dark.3" className="knd-nowrap">
        {children}
        {/* Template literal y no texto suelto con un espacio al lado del
            tag: un espacio pegado al cierre de un tag puede colapsar a
            ancho cero (ver la regla en CLAUDE.md). */}
        {suffix && <span className={styles.sectSuffix}>{` · ${suffix}`}</span>}
      </Text>
      {/* La línea lleva una marca de 18px en shu en su arranque: es el único
          lugar donde el acento aparece sin codificar un estado, y es lo que
          ata el encabezado al resto de la identidad. */}
      <span className={styles.sectRule} />
    </Group>
  );
}
