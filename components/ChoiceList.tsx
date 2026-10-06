import { Group, Radio, Stack, Text } from '@mantine/core';
import styles from './ChoiceList.module.css';

export type Choice = {
  value: string;
  label: React.ReactNode;
  /** Lo que va a la derecha, apagado: un conteo, una aclaración, «pronto». */
  hint?: React.ReactNode;
  disabled?: boolean;
};

/**
 * Una lista de opciones de la que se elige una, para el cuerpo de un modal.
 *
 * Es la forma que estrenó «Mover palabra» y la que usan los modales de
 * Ajustes: la app tenía resuelto «elegir una cosa de una lista» una vez, y
 * dibujar una segunda gramática para la misma pregunta -una lista con un tilde
 * a la derecha- se probó en el canvas y se descartó.
 *
 * Cada opción es una FILA entera clickeable, no una bolita con un texto al
 * lado: el blanco de un radio de 14px en un teléfono es más chico que la punta
 * de un dedo.
 */
export function ChoiceList({
  value, onChange, options, disabled, idPrefix,
}: {
  value: string | null;
  onChange: (value: string) => void;
  options: Choice[];
  /** Toda la lista, mientras corre la acción que confirma. */
  disabled?: boolean;
  /** Arma el `id` de cada opción: `${idPrefix}-${value}`. */
  idPrefix: string;
}) {
  return (
    <Radio.Group value={value ?? ''} onChange={onChange}>
      <Stack className={styles.list}>
        {options.map((o) => (
          <Radio
            key={o.value}
            id={`${idPrefix}-${o.value}`}
            value={o.value}
            disabled={disabled || o.disabled}
            className={styles.option}
            /* 16px, el preset más chico: el círculo del diseño mide 14 y los 20
               del default de Mantine, al lado de un texto de 13px, pesan más
               que el texto. */
            size="xs"
            /* El punto de adentro va en jade, no en el negro que Mantine mete
               por default. Y va como PROP y no por CSS: Mantine escribe
               `--radio-icon-color` como estilo INLINE en la raíz del control,
               así que una regla de clase nunca le iba a ganar. */
            iconColor="jade.6"
            label={
              <Group className={`knd-grow ${styles.row}`} wrap="nowrap" justify="space-between">
                <Text className={styles.label}>{o.label}</Text>
                {o.hint !== undefined && <Text className={`tabular ${styles.hint}`}>{o.hint}</Text>}
              </Group>
            }
          />
        ))}
      </Stack>
    </Radio.Group>
  );
}
