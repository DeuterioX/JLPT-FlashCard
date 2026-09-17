import { Group, Stack, Text, Box } from '@mantine/core';

export function ListRow({
  icon, title, subtitle, actions,
}: {
  icon?: React.ReactNode; title: React.ReactNode;
  subtitle?: string; actions?: React.ReactNode;
}) {
  return (
    <Group wrap="nowrap" gap="md" px="sm" py="xs">
      {icon && <Box w={34} className="kana">{icon}</Box>}
      <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
        <Text size="sm" fw={500} className="kana">{title}</Text>
        {subtitle && <Text size="xs" c="dimmed">{subtitle}</Text>}
      </Stack>
      {actions && <Group gap="xs" wrap="nowrap">{actions}</Group>}
    </Group>
  );
}
