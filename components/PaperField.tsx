import { rem } from '@mantine/core';
import type { InputHTMLAttributes, ReactNode, Ref } from 'react';
import styles from './PaperField.module.css';

/**
 * Un campo de texto con el rótulo ADENTRO, sobre papel.
 *
 * Dos decisiones del diseño en una. La primera es el material: escribir es
 * poner tinta sobre papel, así que el campo es una hojita crema y no un hueco
 * oscuro; el foco no trae ningún azul prestado, engorda el filete sumi y suma
 * el halo shu, que es la marca de corrección del 原稿用紙.
 *
 * La segunda es dónde va el rótulo. Mantine -y el resto del mundo- lo pone
 * ENCIMA del campo, en su propia línea. Acá va adentro, a la izquierda, en
 * versalitas de 9px: un modal de tres campos con el rótulo arriba mide seis
 * renglones en vez de tres, y en un teléfono eso es la diferencia entre ver el
 * botón de Guardar y tener que buscarlo. Además el rótulo así no se puede
 * separar de su campo, que es el error que el `<label for>` de arriba trata de
 * remediar con un atributo.
 *
 * El `<label>` envuelve al `<input>`, así que el clic en cualquier parte de la
 * hojita -incluido el rótulo- enfoca el campo, y el lector de pantalla lo
 * anuncia sin necesitar `for`. El `id` igual va en el `<input>` y no en la
 * etiqueta: es el `<input>` lo que buscan las pruebas y lo que tiene que
 * recibir el foco.
 */
export function PaperField({
  id, label, right, inputRef, height = 36, ...props
}: {
  /** Va en el `<input>`. */
  id?: string;
  /** El rótulo de adentro, en versalitas. */
  label: string;
  /** Lo que cuelga del extremo derecho -el contador de resultados del buscador-. */
  right?: ReactNode;
  inputRef?: Ref<HTMLInputElement>;
  /** 36px es el campo de un formulario; 40 el buscador del diccionario. */
  height?: 36 | 40;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'>) {
  return (
    <label
      className="knd-field"
      style={{ '--knd-field-height': rem(height) } as React.CSSProperties}
      data-ancho={height === 40 ? 'holgado' : undefined}
    >
      <span className={styles.fieldLabel}>{label}</span>
      {/* `autoComplete="off"` por default y no sólo cuando quien lo usa se
          acuerda: el tema se lo pone a todo `TextInput` de Mantine, y este
          campo es un `<input>` crudo que no hereda esos `defaultProps`. Sin
          esto, un campo llamado «Nombre» se come el autocompletado del
          navegador con direcciones y nombres propios. Se puede pisar desde
          afuera porque `props` viene después. */}
      <input
        id={id} ref={inputRef} className={styles.fieldInput}
        autoComplete="off" {...props}
      />
      {right && <span className={styles.fieldEnd}>{right}</span>}
    </label>
  );
}
