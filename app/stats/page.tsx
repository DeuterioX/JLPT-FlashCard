import { db } from '@/lib/db/client';
import { parseRange } from '@/lib/api/params';
import { statsFor } from '@/lib/services/stats';
import { StatsBoard } from '@/components/StatsBoard';

export default async function Page({
  searchParams,
}: { searchParams: Promise<{ window?: string }> }) {
  const { window: raw } = await searchParams;
  const range = parseRange(raw);

  // Una sola lectura de `attempt` para las dos mitades de la pantalla.
  const { overview, worst } = statsFor(db, range);

  return <StatsBoard overview={overview} worst={worst} range={range} />;
}
