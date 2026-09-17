import { db } from '@/lib/db/client';
import { parseRange } from '@/lib/api/params';
import { overview, worstCards } from '@/lib/services/stats';
import { StatsBoard } from '@/components/StatsBoard';

export default async function Page({
  searchParams,
}: { searchParams: Promise<{ window?: string }> }) {
  const { window: raw } = await searchParams;
  const range = parseRange(raw);

  return (
    <StatsBoard
      overview={overview(db, range)}
      worst={worstCards(db, range)}
      range={range}
    />
  );
}
