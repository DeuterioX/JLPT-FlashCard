import { Anchor, Group, Kbd, Text, UnstyledButton } from '@mantine/core';
import Link from 'next/link';
import { ChevronLeft } from 'react-bootstrap-icons';
import { Brand } from '../Brand';
import { Icon } from '../Icon';
import styles from './RoundHeader.module.css';

/**
 * La barra de arriba de una ronda, compartida por el quiz y el repaso de
 * significados.
 *
 * Estaba copiada en las dos pantallas, y la copia ya había divergido: el borde
 * de abajo era `dark-4` en una y `dark-5` en la otra. Esa es la clase de
 * diferencia que nadie introduce a propósito y que aparece sola cuando el
 * mismo marcado vive en dos archivos.
 *
 * El `py` es más chico que en el resto de la app a propósito: con el zorro de
 * 34px, el padding de `xs` dejaría esta barra 12px más alta, y esos 12px salen
 * del escenario, que es lo único que cede alto cuando se abre el teclado. Por
 * lo mismo va `flexShrink: 0`: con el teclado abierto el alto útil se vuelve
 * escasísimo y el reparto del faltante no puede tocar ni a esta barra ni al
 * pie, sólo al escenario.
 */
export function RoundHeader({
  id, brandId, nameId, title, context, onExit,
}: {
  id: string;
  brandId?: string;
  nameId?: string;
  /**
   * Cómo se llama esta ronda: «Repasar escritura», «Repasar significado».
   * Sólo se ve en teléfono, donde ocupa el lugar que deja el nombre de la app
   * -igual que el título de `MobileNavbar`-. En escritorio el nombre de la app
   * se queda y el modo ya se sabe por el botón que apretaste.
   */
  title?: string;
  /** «Hiragana · 1 grupo». Vacío si no hay nada que decir. */
  context?: string;
  /** Abandonar la ronda desde el «salir» de escritorio. Lo mismo que `Esc`. */
  onExit: () => void;
}) {
  return (
    <Group
      id={id}
      px="md"
      py={4}
      justify="space-between"
      bg="dark.6"
      className={styles.header}
      /* `nowrap`: con el título puesto, el `wrap` de fábrica partía la barra en
         dos renglones y la dejaba de 76px en vez de 43 -medido-. Esa altura
         sale del escenario, que es lo único que cede cuando se abre el
         teclado, así que la barra tiene que medir siempre lo mismo. Lo que
         falte lo cede el contexto, que corta con puntos suspensivos. */
      wrap="nowrap"
    >
      <Group gap="0.5rem" wrap="nowrap" className={styles.lead}>
        {/* Salir de la ronda en teléfono es la MISMA flecha que sube un nivel
            en el resto de la app -`MobileNavbar`-, y no un botón propio a la
            derecha: era inventar un segundo gesto para la misma cosa.

            `replace` por el mismo motivo que el `Esc`: con `push`, el Back del
            sistema te devuelve a una ronda que ya abandonaste.

            Se prende por `[data-phone]` y no por un `@media` de ancho, igual
            que la barra de pantalla: las dos son NAVEGACIÓN y tienen que
            contestar lo mismo, o aparece el hueco que ya pasó una vez -una
            ventana angosta de laptop quedándose sin ninguna salida-. */}
        <Anchor
          id={`${id}-back`}
          className={styles.back}
          component={Link}
          href="/"
          replace
          aria-label="Salir de la ronda"
          underline="never"
        >
          <Icon glyph={ChevronLeft} />
        </Anchor>
        <Brand id={brandId} nameId={nameId} />
        {title && <Text id={`${id}-title`} className={styles.title}>{title}</Text>}
      </Group>
      {/* `Group` con `gap`, no texto suelto con espacios intercalados a mano:
          un espacio de texto JSX pegado al cierre de un tag puede colapsar a
          ancho CERO -pasó de verdad, confirmado midiendo en vivo-, y ajustar
          «cuánto» espacio con más espacios o `nbsp` no es un valor real, es
          adivinar. El `gap` va en rem y no en un número pelado, que Mantine
          interpreta en px y no escala en 2K/4K con el resto de la app. */}
      <Group gap="0.5rem" wrap="nowrap" className={styles.aside}>
        {context && <Text size="xs" c="dimmed" className={styles.context}>{context}</Text>}
        {/* El punto separa el contexto de la tecla, así que se va con ella. */}
        {context && <Text size="xs" c="dimmed" className={styles.exitAside}>·</Text>}
        {/* La tecla y el «salir» de escritorio no existen en teléfono: ahí no
            hay `Esc` que apretar -ni con el teclado abierto en el quiz- y
            salir es la flecha de la izquierda. */}
        <Kbd className={styles.exitAside}>Esc</Kbd>
        <UnstyledButton
          id={`${id}-exit`}
          className={`${styles.exitText} ${styles.exitAside}`}
          onClick={onExit}
        >
          salir
        </UnstyledButton>
      </Group>
    </Group>
  );
}

/**
 * «Minna no Nihongo I · 3 grupos», el rótulo de contexto de una ronda.
 *
 * Lo arman las dos pantallas y lo armaban igual, cada una por su cuenta.
 */
export function roundContext(deckName: string | undefined, groups: number) {
  return [deckName, `${groups} ${groups === 1 ? 'grupo' : 'grupos'}`].filter(Boolean).join(' · ');
}
