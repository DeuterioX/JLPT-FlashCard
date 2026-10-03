import { Group, Text, rem } from '@mantine/core';

/**
 * El título de un modal: su glifo y después el texto en castellano.
 *
 * Mismo criterio que los encabezados de sección (`基本 gojūon`): el glifo
 * identifica y el texto explica. Poner el título entero en la mincho hacía
 * que los modales parecieran de otra familia que el resto de la app.
 *
 * El glifo va en shu -es el único calor del encabezado- y el TEXTO siempre en
 * tinta, también en los de borrar. Ahí se probó el título entero en shu para
 * que se distinguiera y estaba mal por dos motivos: el modal ya se distingue
 * por su botón rojo, que es donde está la acción, y gritar en dos lugares le
 * quita peso al botón. Además se leía peor: medido, el título en shu da
 * 3,21:1 contra el fondo del modal y en tinta 13,75:1.
 *
 * El shu del glifo es `shu.6` -el `#C4402E` del canvas- y no `--knd-shu-txt`,
 * que es la variante aclarada para texto. Acá no hace falta: el glifo no se
 * lee, se reconoce -el que dice qué hace el modal es el texto de al lado-, y
 * es la misma marca que la del filete de los encabezados de sección, así que
 * tiene que ser el mismo rojo. Con el aclarado quedaba salmón y no coincidía
 * con ningún otro shu de la pantalla.
 */
export function ModalTitle({ jp, children }: { jp: string; children: React.ReactNode }) {
  return (
    // `baseline` y no `center`: el glifo tiene otra caja de línea que el
    // latino, y centrados por caja quedan a distinta altura visual.
    <Group gap={rem(9)} wrap="nowrap" align="baseline">
      <Text className="mincho knd-modal-glyph" size={rem(18)} lh={1}>{jp}</Text>
      <Text size={rem(14)} fw={700}>{children}</Text>
    </Group>
  );
}
