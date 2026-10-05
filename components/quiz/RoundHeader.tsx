import { Button, Group, Kbd, Text, UnstyledButton } from '@mantine/core';
import { Brand } from '../Brand';
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
  id, brandId, nameId, context, onExit,
}: {
  id: string;
  brandId?: string;
  nameId?: string;
  /** «Hiragana · 1 grupo». Vacío si no hay nada que decir. */
  context?: string;
  /** Abandonar la ronda. Es lo mismo que hace `Esc`. */
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
    >
      <Brand id={brandId} nameId={nameId} />
      {/* `Group` con `gap`, no texto suelto con espacios intercalados a mano:
          un espacio de texto JSX pegado al cierre de un tag puede colapsar a
          ancho CERO -pasó de verdad, confirmado midiendo en vivo-, y ajustar
          «cuánto» espacio con más espacios o `nbsp` no es un valor real, es
          adivinar. El `gap` va en rem y no en un número pelado, que Mantine
          interpreta en px y no escala en 2K/4K con el resto de la app. */}
      <Group gap="0.5rem" wrap="nowrap">
        {context && <Text size="xs" c="dimmed">{context}</Text>}
        {/* El punto separa el contexto de la tecla, así que se va con ella: en
            teléfono quedaba colgado justo antes del botón. */}
        {context && <Text size="xs" c="dimmed" className="knd-desktop-only">·</Text>}
        {/* La tecla, sólo en escritorio. El quiz la mostraba también en
            teléfono con el argumento de que ahí el teclado está abierto igual,
            pero un teclado de teléfono no tiene `Esc`: anunciarla era pedir
            algo que no se puede apretar. */}
        <Kbd className="knd-desktop-only">Esc</Kbd>
        <UnstyledButton
          id={`${id}-exit`}
          className={`${styles.exitText} knd-desktop-only`}
          onClick={onExit}
        >
          salir
        </UnstyledButton>
        {/* En teléfono salir tiene que ser algo que se toca. Antes acá había
            texto suelto al lado de una tecla que no existe, así que la única
            forma de abandonar una ronda era el botón de atrás del navegador.
            Mismo botón que «Renombrar» en Grupos y Cartas: es la misma clase
            de cosa, una acción al ras de la derecha de la barra. */}
        <Button
          id={`${id}-exit-phone`}
          className={styles.exitButton}
          variant="default"
          size="compact-sm"
          onClick={onExit}
        >
          Salir
        </Button>
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
