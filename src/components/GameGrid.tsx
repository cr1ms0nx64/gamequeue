import { GameCard } from '@/components/GameCard';
import type { GameSummary } from '@/lib/types';

export function GameGrid({
  games,
  showStatus = false,
  canManage = false
}: {
  games: GameSummary[];
  showStatus?: boolean;
  canManage?: boolean;
}) {
  if (!games.length) {
    return (
      <div className="empty-state">
        <span>Keine Treffer</span>
        <h2>Hier ist gerade noch nichts gelandet.</h2>
        <p>Ändere die Filter oder schlage ein neues Steam-Spiel vor.</p>
      </div>
    );
  }
  return (
    <div className="game-grid">
      {games.map((game) => (
        <GameCard canManage={canManage} game={game} key={game.id} showStatus={showStatus} />
      ))}
    </div>
  );
}

