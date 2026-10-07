'use client';

import { Card, Switch, Stack, Group, Text } from '@mantine/core';
import type { GroupSummary } from '@/lib/services/decks';
import styles from './GroupCard.module.css';

/**
 * La regla de las seis cartas: si el grupo trae preview, se muestran las cartas
 * (y か行 se ve como la columna de kana); si no, se muestra el conteo.
 * Es presentación pura, no hay ninguna condición en el modelo de datos.
 *
 * El control es la tarjeta entera (rol `switch`), y el `Switch` de abajo es
 * puramente visual. Si los dos fueran interactivos, un click dispararía DOS
 * veces: el `Switch` de Mantine 9 envuelve su input en un `<label>`, así que
 * el click burbujea al `Card` y además el label dispara un click sintético
 * sobre el input. Quedaba enmascarado porque los dos calculan el mismo valor,
 * pero eran dos efectos, y `stopPropagation` no lo evita: el camino que
 * importa es el del label.
 */
export function GroupCard({
  group, checked, onToggle,
}: { group: GroupSummary; checked: boolean; onToggle: (id: number, on: boolean) => void }) {
  const toggle = () => onToggle(group.id, !checked);
  // Cuántas quedan afuera de la previsualización. 0 = el grupo entra entero.
  const hidden = group.cardCount - group.preview.length;

  /**
   * El kana baja de 15 a 13px cuando el grupo tiene PALABRAS. Lo decide el
   * contenido porque nada en el modelo dice «este mazo es de vocabulario»: el
   * kana trae uno o dos caracteres -あ, きゃ- y una palabra arranca en tres.
   *
   * Esos 2px compran una letra por línea en la tarjeta de teléfono, que deja
   * 101px de contenido: de seis a siete. Medido con el mazo: alcanza para
   * けんきゅうしゃ y las tres ましょう, que son el grueso.
   */
  const isVocab = group.preview.some((p) => [...p.prompt].length > 2);

  return (
    <Card
      withBorder
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
      className={styles.groupCard}
      // Apagada se marca ACÁ y una sola vez: de este atributo cuelgan los tres
      // colores y el papel, que antes eran tres ternarios en el JSX.
      data-off={checked ? undefined : ''}
    >
      <Stack gap={6} className={styles.gcBody}>
        <Group gap={6} wrap="nowrap" justify="space-between" className={styles.gcHead}>
          {/* El nombre va en la letra del kana: el diseño decía ahí "あ行", y
              que ahora diga "Serie A" no la cambia. `lh` explícito porque con
              un `size` en string libre Mantine devuelve una caja de línea
              MENOR que la letra y los renglones se pisan. */}
          <Text size="11.5px" lh={1.4} fw={500} className={`kana ${styles.gcName}`} title={group.name}>
            {group.name}
          </Text>
          <Switch checked={checked} readOnly tabIndex={-1} aria-hidden className={styles.gcSwitch} />
        </Group>

        {/* Una línea por carta, recortada y nunca partida: con el kana
            envuelto, un yōon chico -el ゃ de けんきゅうしゃ- puede quedar solo
            arrancando renglón, y en composición japonesa eso está mal, no sólo
            feo. El papel es el que dice el estado del grupo -crema si entra en
            la ronda, gris si no-, que es lo que se ve de lejos en una grilla
            de doce tarjetas. */}
        <div
          className={`${styles.gcSheet} ${styles.gcWords}`}
          data-vocab={isVocab ? '' : undefined}
        >
          {group.preview.map((p) => (
            <div key={p.prompt} className={styles.gcRow}>
              <Text className={`kana ${styles.gcCut} ${styles.gcKana}`} lh={1.2}>
                {p.prompt}
              </Text>
              <Text className={`romaji ${styles.gcCut} ${styles.gcRomaji}`} lh={1.2}>
                {p.romaji}
              </Text>
            </div>
          ))}
        </div>
        {hidden > 0 && (
          // Centrado contra la hoja, que es un bloque centrado.
          <Text size="xs" className={`tabular ${styles.gcMore}`} ta="center">
            {hidden === 1 ? '1 palabra más' : `${hidden} palabras más`}
          </Text>
        )}
      </Stack>
    </Card>
  );
}
