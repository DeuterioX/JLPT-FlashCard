import { Group, Stack, Text, UnstyledButton } from '@mantine/core';
import Link from 'next/link';
import { ChevronRight } from 'react-bootstrap-icons';
import { Icon } from '../Icon';
import styles from './SettingRow.module.css';

/**
 * Una fila de Ajustes: el glifo, el nombre, una línea que dice qué hace, y a la
 * derecha el control o el valor de ahora.
 *
 * Tres formas, según qué lleve:
 *  - `control`: el control está en la fila y la fila no se toca (el segmento
 *    del tema en escritorio).
 *  - `onClick`: la fila entera es un botón que abre un modal, y a la derecha
 *    va el valor con un chevrón.
 *  - `href`: la fila entera es un enlace a otra pantalla, con el chevrón solo.
 *
 * La línea de explicación no es decorativa: «Idioma de la interfaz» solo no
 * dice que las cartas siguen en japonés, y es lo primero que alguien se
 * pregunta.
 */
export function SettingRow({
  id, glyph, title, description, control, value, onClick, href, className,
}: {
  id?: string;
  /** Un kanji en mincho, como los de los encabezados de sección. */
  glyph: string;
  title: string;
  description: string;
  control?: React.ReactNode;
  value?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
}) {
  const body = (
    <>
      <Text className={`mincho ${styles.glyph}`} aria-hidden>{glyph}</Text>
      <Stack className={`knd-fill ${styles.text}`}>
        <Text className={styles.title}>{title}</Text>
        <Text className={styles.description}>{description}</Text>
      </Stack>
      {control ?? (
        <Group className={styles.trailing} wrap="nowrap">
          {value !== undefined && <Text className={styles.value}>{value}</Text>}
          <Icon glyph={ChevronRight} className={styles.chevron} />
        </Group>
      )}
    </>
  );
  const rowClass = className ? `${styles.row} ${className}` : styles.row;

  if (href) {
    return <UnstyledButton id={id} component={Link} href={href} className={`${rowClass} ${styles.tap}`}>{body}</UnstyledButton>;
  }
  if (onClick) {
    return <UnstyledButton id={id} onClick={onClick} className={`${rowClass} ${styles.tap}`}>{body}</UnstyledButton>;
  }
  return <div id={id} className={rowClass}>{body}</div>;
}
