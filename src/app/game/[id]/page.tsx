import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft, Building2, CalendarDays, ChevronLeft, ChevronRight, ExternalLink,
  Gamepad2, Layers3, Tag, UsersRound
} from 'lucide-react';
import { AdminGameControls } from '@/components/AdminGameControls';
import { CommentsPanel, VotePanel } from '@/components/GameCommunity';
import { GameDescription } from '@/components/GameDescription';
import { GameGallery } from '@/components/GameGallery';
import { currentUser } from '@/lib/auth';
import { getGame, getNeighborGames, listComments } from '@/lib/db';
import { initials, statusLabels } from '@/lib/format';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const game = Number.isInteger(id) ? await getGame(id) : null;
  return { title: game?.title || 'Spiel nicht gefunden', description: game?.shortDescription || undefined };
}

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) notFound();

  const user = await currentUser();
  const [game, comments, neighbors] = await Promise.all([
    getGame(id, user?.id),
    listComments(id),
    getNeighborGames(id)
  ]);
  if (!game) notFound();

  const images = game.screenshots.length ? game.screenshots : [game.headerImage];

  return (
    <section className="page-shell game-detail-page">
      <nav className="detail-navigation" aria-label="Spiele Navigation">
        <Link href="/"><ArrowLeft /> Zurück zur Übersicht</Link>
        <div>
          {neighbors.previous ? <Link href={`/game/${neighbors.previous}`} aria-label="Vorheriges Spiel"><ChevronLeft /></Link> : null}
          {neighbors.next ? <Link href={`/game/${neighbors.next}`} aria-label="Nächstes Spiel"><ChevronRight /></Link> : null}
        </div>
      </nav>

      <div className="game-detail-grid">
        <aside className="game-info-panel">
          <Image unoptimized width={920} height={430} className="game-header-image" src={game.headerImage} alt={`${game.title} Titelbild`} />
          <VotePanel
            gameId={game.id}
            initialScore={game.score}
            initialUserVote={game.userVote}
            initialVoteCount={game.voteCount}
            user={user}
          />
          <div className="game-title-block">
            <span className={`status-badge status-${game.status}`}>{statusLabels[game.status]}</span>
            <h1>{game.title}</h1>
            <p>{game.priceText}</p>
          </div>
          <div className="game-tags detail-tags">
            {game.modes.map((mode) => <span key={mode}><Gamepad2 /> {mode}</span>)}
          </div>
          <p className="game-description">{game.shortDescription}</p>

          <dl className="game-facts">
            <div><dt><Building2 /> Entwickler</dt><dd>{game.developers.join(', ') || 'Unbekannt'}</dd></div>
            <div><dt><Layers3 /> Publisher</dt><dd>{game.publishers.join(', ') || 'Unbekannt'}</dd></div>
            <div><dt><CalendarDays /> Release</dt><dd>{game.releaseDate}</dd></div>
            <div><dt><Tag /> Genres</dt><dd>{game.genres.join(', ') || 'Unbekannt'}</dd></div>
          </dl>

          <div className="submitters">
            <p className="eyebrow"><UsersRound /> Vorgeschlagen von</p>
            <div>
              {game.submitters.map((submitter) => (
                <span className="submitter" key={submitter.userId} title={submitter.username}>
                  <span className="user-avatar">{initials(submitter.username)}</span>
                  <strong>{submitter.username}</strong>
                </span>
              ))}
            </div>
          </div>

          <a className="button button-steam" href={`https://store.steampowered.com/app/${game.steamAppId}`} target="_blank" rel="noreferrer">
            Auf Steam ansehen <ExternalLink />
          </a>
          {user?.role === 'ADMIN' ? (
            <AdminGameControls
              gameId={game.id}
              initialOwnerScore={game.ownerScore}
              initialStatus={game.status}
              title={game.title}
            />
          ) : null}
        </aside>

        <div className="game-main-content">
          <GameGallery images={images} title={game.title} />
          <article className="about-game">
            <p className="eyebrow">Über das Spiel</p>
            <h2>{game.title}</h2>
            <GameDescription text={game.about || game.shortDescription} />
            {game.website ? <a href={game.website} target="_blank" rel="noreferrer">Offizielle Website <ExternalLink /></a> : null}
          </article>
        </div>
      </div>

      <CommentsPanel gameId={game.id} initialComments={comments} user={user} />
    </section>
  );
}

