import Link from 'next/link';
import { CalendarDays, Gamepad2, UsersRound } from 'lucide-react';
import { GameDeleteButton } from '@/components/GameDeleteButton';
import { formatDate, statusLabels } from '@/lib/format';
import type { GameSummary } from '@/lib/types';

export function GameCard({
  game,
  showStatus = false,
  canManage = false
}: {
  game: GameSummary;
  showStatus?: boolean;
  canManage?: boolean;
}) {
  const description = game.shortDescription || 'Noch keine Beschreibung verfügbar.';
  return (
    <article className="game-card">
      <div className="game-card-media">
        <Link className="game-card-image" href={`/game/${game.id}`}>
          <img src={game.headerImage} alt="" loading="lazy" />
          <span className={`score-badge ${game.score < 0 ? 'score-negative' : ''}`}>
            {game.score > 0 ? `+${game.score}` : game.score}
          </span>
          {showStatus && game.status !== 'submitted' ? (
            <span className={`status-badge status-${game.status}`}>{statusLabels[game.status]}</span>
          ) : null}
        </Link>
        {canManage ? <GameDeleteButton compact gameId={game.id} title={game.title} /> : null}
      </div>
      <div className="game-card-body">
        <div className="game-card-heading">
          <h2><Link href={`/game/${game.id}`}>{game.title}</Link></h2>
          {showStatus && game.ownerScore != null ? (
            <span className="owner-score" title="Admin Bewertung">{game.ownerScore}<small>/10</small></span>
          ) : null}
        </div>
        <p>{description}</p>
        <div className="game-tags">
          {game.modes.slice(0, 2).map((mode) => (
            <span key={mode}><Gamepad2 /> {mode}</span>
          ))}
        </div>
      </div>
      <footer className="game-card-footer">
        <span><UsersRound /> {game.submissionCount} {game.submissionCount === 1 ? 'Vorschlag' : 'Vorschläge'}</span>
        <span><CalendarDays /> {formatDate(game.createdAt)}</span>
      </footer>
    </article>
  );
}

