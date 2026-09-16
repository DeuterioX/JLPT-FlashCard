import { Title, Text, Stack } from '@mantine/core';

export default function Home() {
  return (
    <Stack p="xl" gap="xs">
      <Title order={1}>Kana Drill</Title>
      <Text c="dimmed">あ い う え お</Text>
    </Stack>
  );
}
