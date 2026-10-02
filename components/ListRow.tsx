import { Group, Stack, Text, Box, rem } from '@mantine/core';

export function ListRow({
  icon, title, subtitle, actions, onClick,
}: {
  icon?: React.ReactNode; title: React.ReactNode;
  subtitle?: string; actions?: React.ReactNode;
  /** Acción principal de la fila: se dispara al tocarla en cualquier parte. */
  onClick?: () => void;
}) {
  return (
    // Medidas de `.row` del diseño, que no caen en ninguna escala de
    // Mantine: gap 12 (no el `md` de 16), padding 10/13 (no `xs`/`sm`),
    // título 13px (no el `sm` de 14) y subtítulo 11px en `--a-dimmer` (no
    // 12px en `--a-dim`). Los `size` en string libre necesitan `lh`
    // explícito: Mantine no encuentra contra qué entrada de
    // `theme.lineHeights` resolverlos y devuelve uno más chico que la letra.
    <Group
      wrap="nowrap"
      gap={12}
      style={{ padding: '0.625rem 0.8125rem' }}
      className={onClick ? 'knd-row-tap' : undefined}
      onClick={onClick && ((e) => {
        // Un click sobre un control real es de ese control, no de la fila.
        if ((e.target as HTMLElement).closest('button, a, input')) return;
        onClick();
      })}
    >
      {/* `knd-swipe-pin`: lo que identifica a la fila no se va de pantalla
          cuando el gesto la corre para descubrir Borrar. Ver globals.css. */}
      {icon && <Box w={34} className="kana knd-swipe-pin" style={{ fontSize: rem(17) }}>{icon}</Box>}
      <Stack gap={0} className="knd-swipe-pin" style={{ flex: 1, minWidth: 0 }}>
        <Text size={rem(13)} lh={1.45} fw={500} className="kana">{title}</Text>
        {subtitle && <Text size={rem(11)} lh={1.45} c="dark.3">{subtitle}</Text>}
      </Stack>
      {/* 5px entre acciones (`.acts`), no el `xs` de 10. */}
      {actions && <Group className="knd-row-actions" gap={5} wrap="nowrap">{actions}</Group>}
    </Group>
  );
}
