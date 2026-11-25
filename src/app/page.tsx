import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isConfigured } from '@/lib/accounts';
import { ArrowRight, Gamepad2, LogIn, Sparkles, UsersRound } from 'lucide-react';
import { GameGrid } from '@/components/GameGrid';
import { ListingToolbar } from '@/components/ListingToolbar';
import { Pagination } from '@/components/Pagination';
import { currentUser } from '@/lib/auth';
import { listGames } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Params = Record<string, string | string[] | undefined>;

function value(params: Params, key: string, fallback: string): string {
  const raw = params[key];
  return (Array.isArray(raw) ? raw[0] : raw) || fallback;
}

export default async function Home({ searchParams }: { searchParams?: Promise<Params> }) {
  if (!await isConfigured()) redirect('/setup');
  const params = await searchParams || {};
  const release = value(params, 'filter', 'all') as 'all' | 'released' | 'upcoming';
  const sort = value(params, 'sort', 'newest') as 'newest' | 'oldest' | 'score' | 'submitted' | 'release' | 'title';
  const search = value(params, 'q', '');
  const requestedPage = Number(value(params, 'page', '1')) || 1;
  const [user, listing] = await Promise.all([
    currentUser(),
    listGames({ release, sort, search, page: requestedPage, pageSize: 16 })
  ]);

  return (
    <>
      <section className="hero-band">
        <div className="page-shell hero-inner">
          <div className="hero-copy">
            <p className="eyebrow"><Sparkles /> Community Game Queue</p>
            <h1>Was spielen wir als Nächstes?</h1>
            <p>
              Schlage Steam-Spiele vor, stimme gemeinsam ab und sieh auf einen Blick,
              was für die nächste Runde oben auf der Liste steht.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href={user ? '/submit' : '/login?next=/submit'}>
                {user ? <Gamepad2 /> : <LogIn />}
                {user ? 'Spiel vorschlagen' : 'Anmelden und mitspielen'}
              </Link>
              <Link className="button button-secondary" href="/choice">
                Zur Choice <ArrowRight />
              </Link>
            </div>
          </div>
          <div className="hero-stats" aria-label="Community Statistiken">
            <div>
              <span className="hero-stat-icon"><Gamepad2 /></span>
              <span className="hero-stat-copy"><small>Community Queue</small><strong>{listing.total} Spiele</strong></span>
            </div>
            <div>
              <span className="hero-stat-icon"><UsersRound /></span>
              <span className="hero-stat-copy"><small>Account</small><strong>Deine Community</strong></span>
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell listing-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Von der Community</p>
            <h2>{search ? `Ergebnisse für „${search}“` : 'Eingereichte Spiele'}</h2>
          </div>
        </div>
        <ListingToolbar
          activeTab={release}
          basePath="/"
          resultCount={listing.total}
          search={search}
          sort={sort}
          tabs={[
            { value: 'all', label: 'Alle Spiele' },
            { value: 'released', label: 'Neu released' },
            { value: 'upcoming', label: 'Bevorstehend' }
          ]}
          user={user}
        />
        <GameGrid canManage={user?.role === 'ADMIN'} games={listing.games} />
        <Pagination
          page={listing.page}
          pages={listing.pages}
          params={{ filter: release, sort, q: search }}
        />
      </section>
    </>
  );
}

