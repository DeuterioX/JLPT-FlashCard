'use client';

import { useState } from 'react';
import { Card, Switch, Text, Tooltip } from '@mantine/core';
import type { GroupSummary } from '@/lib/services/decks';
import styles from './GroupCard.module.css';

/**
 * La regla de las seis cartas: la hoja muestra las primeras seis del grupo
 * (y か行 se ve como la columna de kana), y abajo va el total.
 * Es presentación pura, no hay ninguna condición en el modelo de datos.
 *
 * Todo lo visual está en `GroupCard.module.css`, también lo que Mantine deja
 * pasar como prop -`gap`, `justify`, `maw`-: acá sólo queda estructura. Por
 * eso el cuerpo y la cabecera son `div` y no `Stack`/`Group`: sin `gap`,
 * ésos escriben igual su default como estilo inline, y le gana a la clase.
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
  const [nameTip, setNameTip] = useState(false);

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
      <div className={styles.gcBody}>
        <div className={styles.gcHead}>
          {/* El nombre va en la letra del kana: el diseño decía ahí "あ行", y
              que ahora diga "Serie A" no la cambia. Tamaño, peso e
              interlineado están en `.gcName`. */}
          {/* El tooltip sólo aparece si el nombre está cortado por la
              elipsis: entero no tiene nada que agregar. Se mide al entrar el
              puntero y no al renderizar, porque el corte depende del ancho de
              la columna, que cambia con la ventana. */}
          <Tooltip
            label={group.name} opened={nameTip} withArrow multiline
            classNames={{ tooltip: styles.gcTip }}
          >
            <Text
              className={`kana ${styles.gcName}`}
              onMouseEnter={(e) => setNameTip(e.currentTarget.scrollWidth > e.currentTarget.clientWidth)}
              onMouseLeave={() => setNameTip(false)}
            >
              {group.name}
            </Text>
          </Tooltip>
          <Switch checked={checked} readOnly tabIndex={-1} aria-hidden className={styles.gcSwitch} />
        </div>

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
              <Text className={`kana ${styles.gcCut} ${styles.gcKana}`}>
                {p.prompt}
              </Text>
              <Text className={`romaji ${styles.gcCut} ${styles.gcRomaji}`}>
                {p.romaji}
              </Text>
            </div>
          ))}
        </div>
        {/* El total del grupo, en TODAS las tarjetas. Antes era «N palabras
            más» y sólo en las que no entraban enteras: le restaba alto al
            papel a ésas y no a las otras, y en una fila las hojas terminaban
            a distinta altura. */}
        <Text className={`tabular ${styles.gcCount}`}>
          {group.cardCount === 1 ? '1 palabra' : `${group.cardCount} palabras`}
        </Text>
      </div>
    </Card>
  );
}
