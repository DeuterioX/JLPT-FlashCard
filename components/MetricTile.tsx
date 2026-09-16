import { Paper, Stack, Text } from '@mantine/core';

export function MetricTile({
  label, value, hint, tone = 'normal',
}: { label: string; value: string | number; hint?: string; tone?: 'normal' | 'bad' }) {
  return (
    <Paper withBorder p="sm">
      <Stack gap={2}>
        <Text size="xs" tt="uppercase" c="dimmed" style={{ letterSpacing: '0.06em' }}>
          {label}
        </Text>
        <Text size="xl" fw={600} className="tabular" c={tone === 'bad' ? 'shu.6' : undefined}>
          {value}
        </Text>
        {hint && <Text size="xs" c="dimmed">{hint}</Text>}
      </Stack>
    </Paper>
  );
}
