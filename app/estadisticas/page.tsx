import { db } from '@/lib/db/client';
import { overview, worstCards, type StatsRange } from '@/lib/services/stats';
import { StatsBoard } from '@/components/StatsBoard';

export default async function Page({
  searchParams,
}: { searchParams: Promise<{ window?: string }> }) {
  const { window: raw } = await searchParams;
  const range: StatsRange = raw === '7d' || raw === 'all' ? raw : '30d';

  return (
    <StatsBoard
      overview={overview(db, range)}
      worst={worstCards(db, range)}
      range={range}
    />
  );
}
