import { Group, Kbd, Text } from '@mantine/core';
import { Brand } from '../Brand';

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
  id, brandId, nameId, contexto, teclaSoloEscritorio = false,
}: {
  id: string;
  brandId?: string;
  nameId?: string;
  /** «Hiragana · 1 grupo». Vacío si no hay nada que decir. */
  contexto?: string;
  /**
   * Esconde la tecla `Esc` en teléfono, donde no hay teclado físico que
   * apretar. El repaso de significados lo hace -ahí no hay ningún campo que
   * abra el teclado- y el quiz no, porque ahí el teclado está abierto igual.
   */
  teclaSoloEscritorio?: boolean;
}) {
  return (
    <Group
      id={id}
      px="md"
      py={4}
      justify="space-between"
      bg="dark.6"
      style={{ borderBottom: '1px solid var(--mantine-color-dark-5)', flexShrink: 0 }}
    >
      <Brand id={brandId} nameId={nameId} />
      {/* `Group` con `gap`, no texto suelto con espacios intercalados a mano:
          un espacio de texto JSX pegado al cierre de un tag puede colapsar a
          ancho CERO -pasó de verdad, confirmado midiendo en vivo-, y ajustar
          «cuánto» espacio con más espacios o `nbsp` no es un valor real, es
          adivinar. El `gap` va en rem y no en un número pelado, que Mantine
          interpreta en px y no escala en 2K/4K con el resto de la app. */}
      <Group gap="0.5rem" wrap="nowrap">
        {contexto && <Text size="xs" c="dimmed">{`${contexto} ·`}</Text>}
        <Kbd className={teclaSoloEscritorio ? 'knd-solo-escritorio' : undefined}>Esc</Kbd>
        <Text size="xs" c="dimmed">salir</Text>
      </Group>
    </Group>
  );
}

/**
 * «Minna no Nihongo I · 3 grupos», el rótulo de contexto de una ronda.
 *
 * Lo arman las dos pantallas y lo armaban igual, cada una por su cuenta.
 */
export function contextoDeRonda(deckName: string | undefined, grupos: number) {
  return [deckName, `${grupos} ${grupos === 1 ? 'grupo' : 'grupos'}`].filter(Boolean).join(' · ');
}
