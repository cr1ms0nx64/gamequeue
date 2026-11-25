import { Crown } from 'lucide-react';
import { GameGrid } from '@/components/GameGrid';
import { ListingToolbar } from '@/components/ListingToolbar';
import { Pagination } from '@/components/Pagination';
import { currentUser } from '@/lib/auth';
import { listGames } from '@/lib/db';
import type { GameStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Params = Record<string, string | string[] | undefined>;

function value(params: Params, key: string, fallback: string): string {
  const raw = params[key];
  return (Array.isArray(raw) ? raw[0] : raw) || fallback;
}

export default async function ChoicePage({ searchParams }: { searchParams?: Promise<Params> }) {
  const params = await searchParams || {};
  const filter = value(params, 'filter', 'hot');
  const statusMap: Record<string, GameStatus | 'all'> = {
    hot: 'planned',
    singleplayer: 'all',
    multiplayer: 'all',
    playing: 'playing',
    played: 'played',
    rejected: 'rejected'
  };
  const status = statusMap[filter] || 'planned';
  const mode = filter === 'singleplayer' ? 'Singleplayer' : filter === 'multiplayer' ? 'Multiplayer' : undefined;
  const sort = value(params, 'sort', 'newest') as 'newest' | 'oldest' | 'score' | 'owner' | 'submitted' | 'release' | 'title';
  const requestedPage = Number(value(params, 'page', '1')) || 1;
  const [user, listing] = await Promise.all([
    currentUser(),
    listGames({ status, mode, sort, page: requestedPage, pageSize: 16 })
  ]);

  return (
    <section className="page-shell choice-page">
      <header className="page-title">
        <p className="eyebrow"><Crown /> Kuratiert</p>
        <h1>Community Choice</h1>
        <p>Geplante, aktuelle und bereits gespielte Titel mit persönlicher Wertung.</p>
      </header>
      <ListingToolbar
        activeTab={filter}
        basePath="/choice"
        resultCount={listing.total}
        sort={sort}
        tabKey="filter"
        tabs={[
          { value: 'hot', label: 'Heißer Scheiß' },
          { value: 'singleplayer', label: 'Singleplayer' },
          { value: 'multiplayer', label: 'Multiplayer' },
          { value: 'playing', label: 'Aktuell gespielt' },
          { value: 'played', label: 'Bereits gespielt' },
          { value: 'rejected', label: 'Abgelehnt' }
        ]}
        user={user}
      />
      <GameGrid canManage={user?.role === 'ADMIN'} games={listing.games} showStatus />
      <Pagination page={listing.page} pages={listing.pages} params={{ filter, sort }} />
    </section>
  );
}

