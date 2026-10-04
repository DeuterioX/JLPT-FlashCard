import { Group, Stack, Text, Box } from '@mantine/core';
import styles from './ListRow.module.css';

/**
 * Una fila de lista: ícono, título, subtítulo y acciones.
 *
 * Las medidas viven en `ListRow.module.css` y no en props de Mantine. No es
 * sólo prolijidad: `gap`, `w`, `size`, `lh` y `c` los escribe Mantine como
 * estilo INLINE, y un inline le gana a cualquier regla, así que después no hay
 * media query que pueda corregir ninguno.
 */
export function ListRow({
  icon, title, subtitle, actions, onClick,
}: {
  icon?: React.ReactNode; title: React.ReactNode;
  subtitle?: string; actions?: React.ReactNode;
  /** Acción principal de la fila: se dispara al tocarla en cualquier parte. */
  onClick?: () => void;
}) {
  return (
    <Group
      wrap="nowrap"
      className={onClick ? 'knd-row knd-row-tap' : 'knd-row'}
      onClick={onClick && ((e) => {
        // Un click sobre un control real es de ese control, no de la fila.
        if ((e.target as HTMLElement).closest('button, a, input')) return;
        onClick();
      })}
    >
      {/* `knd-swipe-pin`: lo que identifica a la fila no se va de pantalla
          cuando el gesto la corre para descubrir Borrar. Ver globals.css. */}
      {icon && <Box className={`kana knd-swipe-pin ${styles.rowIcon}`}>{icon}</Box>}
      <Stack className={`knd-swipe-pin knd-fill ${styles.rowText}`}>
        <Text className={`kana ${styles.rowTitle}`}>{title}</Text>
        {subtitle && <Text className={styles.rowSubtitle}>{subtitle}</Text>}
      </Stack>
      {actions && <Group className="knd-row-actions" wrap="nowrap">{actions}</Group>}
    </Group>
  );
}
