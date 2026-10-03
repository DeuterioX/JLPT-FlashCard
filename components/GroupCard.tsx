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
  // Tres niveles de brillo -kana, nombre, romaji- que se mantienen con la
  // tarjeta apagada. El kana y el romaji van sobre PAPEL, así que su color es
  // tinta y no la escala de la interfaz: `dark.2` sobre crema daba 2,2:1.
  const kanaColor = checked ? 'var(--knd-sumi)' : 'var(--knd-papel-ink)';
  const romajiColor = checked ? 'var(--knd-sumi-dim)' : 'var(--knd-papel-ink-dim)';
  const nameColor = checked ? 'dark.0' : 'dark.3';

  // Cuántas quedan afuera de la previsualización. 0 = el grupo entra entero.
  const resto = group.cardCount - group.preview.length;

  /**
   * El kana baja de 15 a 13px cuando el grupo tiene PALABRAS. Lo decide el
   * contenido porque nada en el modelo dice «este mazo es de vocabulario»: el
   * kana trae uno o dos caracteres -あ, きゃ- y una palabra arranca en tres.
   *
   * Esos 2px compran una letra por línea en la tarjeta de teléfono, que deja
   * 101px de contenido: de seis a siete. Medido con el mazo: alcanza para
   * けんきゅうしゃ y las tres ましょう, que son el grueso.
   */
  const palabras = group.preview.some((p) => [...p.prompt].length > 2);

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
    >
      <Stack gap={6} className={styles.gcBody}>
        <Group gap={6} wrap="nowrap" justify="space-between" className={styles.gcHead}>
          {/* El nombre va en la letra del kana: el diseño decía ahí "あ行", y
              que ahora diga "Serie A" no la cambia. `lh` explícito porque con
              un `size` en string libre Mantine devuelve una caja de línea
              MENOR que la letra y los renglones se pisan. */}
          <Text size="11.5px" lh={1.4} fw={500} c={nameColor} className={`kana ${styles.gcName}`}>
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
          className={`${styles.gcPapel} ${styles.gcWords}`}
          data-off={checked ? undefined : ''}
          data-palabras={palabras ? '' : undefined}
        >
          {group.preview.map((p) => (
            <div key={p.prompt} className={styles.gcFila}>
              <Text className={`kana ${styles.gcCut} ${styles.gcKana}`} lh={1.2} c={kanaColor}>
                {p.prompt}
              </Text>
              <Text className={`romaji ${styles.gcCut} ${styles.gcRomaji}`} c={romajiColor} lh={1.2}>
                {p.romaji}
              </Text>
            </div>
          ))}
        </div>
        {resto > 0 && (
          // Centrado contra la hoja, que es un bloque centrado.
          <Text size="xs" c={nameColor} className="tabular" ta="center">
            {resto === 1 ? '1 palabra más' : `${resto} palabras más`}
          </Text>
        )}
      </Stack>
    </Card>
  );
}
