import { Group, Stack, Text, Box, rem } from '@mantine/core';

export function ListRow({
  icon, title, subtitle, actions, actionsClassName, onClick,
}: {
  icon?: React.ReactNode; title: React.ReactNode;
  subtitle?: string; actions?: React.ReactNode;
  /**
   * Para esconder las acciones en teléfono cuando esa lista las ofrece por
   * gesto. El nombre de la clase lo pone quien usa la fila, no ésta: cada
   * lista tiene la suya y las reglas viven juntas en globals.css.
   */
  actionsClassName?: string;
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
      {icon && <Box w={34} className="kana" style={{ fontSize: rem(17) }}>{icon}</Box>}
      <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
        <Text size={rem(13)} lh={1.45} fw={500} className="kana">{title}</Text>
        {subtitle && <Text size={rem(11)} lh={1.45} c="dark.3">{subtitle}</Text>}
      </Stack>
      {/* 5px entre acciones (`.acts`), no el `xs` de 10. */}
      {actions && <Group className={actionsClassName} gap={5} wrap="nowrap">{actions}</Group>}
    </Group>
  );
}
