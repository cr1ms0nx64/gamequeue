import type { QueryResultRow } from 'pg';
import type { GameDetail,GameStatus,GameSummary,GamesUser,Submitter } from '@/lib/types';
import { db } from '@/lib/db/pool';
import { arrayValue,isoValue } from '@/lib/db/values';
import { notFound } from '@/lib/errors';
function summaryFromRow(row: QueryResultRow): GameSummary {
  return {
    id: Number(row.id),
    steamAppId: Number(row.steam_app_id),
    slug: String(row.slug),
    title: String(row.title),
    shortDescription: String(row.short_description || ''),
    headerImage: String(row.header_image),
    releaseDate: String(row.release_date || 'Unbekannt'),
    releaseTimestamp: row.release_timestamp ? isoValue(row.release_timestamp) : null,
    genres: arrayValue(row.genres),
    modes: arrayValue(row.modes),
    status: row.status as GameStatus,
    ownerScore: row.owner_score == null ? null : Number(row.owner_score),
    score: Number(row.score || 0),
    voteCount: Number(row.vote_count || 0),
    submissionCount: Number(row.submission_count || 0),
    createdAt: isoValue(row.created_at)
  };
}

export type GameQuery = {
  search?: string;
  release?: 'all' | 'released' | 'upcoming';
  status?: GameStatus | 'all';
  mode?: 'Singleplayer' | 'Multiplayer';
  sort?: 'newest' | 'oldest' | 'score' | 'owner' | 'submitted' | 'release' | 'title';
  page?: number;
  pageSize?: number;
};

export async function listGames(input: GameQuery = {}): Promise<{ games: GameSummary[]; total: number; pages: number; page: number }> {

  const pageSize = Math.min(48, Math.max(1, input.pageSize || 16));
  const page = Math.max(1, input.page || 1);
  const values: unknown[] = [];
  const where: string[] = [];

  if (input.search?.trim()) {
    values.push(`%${input.search.trim().replace(/[\\%_]/g, '\\$&')}%`);
    where.push(`(g.title ILIKE $${values.length} ESCAPE E'\\\\' OR g.short_description ILIKE $${values.length} ESCAPE E'\\\\' OR g.genres::text ILIKE $${values.length} ESCAPE E'\\\\')`);
  }
  if (input.release === 'released') {
    where.push(`(NOT g.coming_soon AND (g.release_timestamp <= NOW() OR g.release_timestamp IS NULL))`);
  }
  if (input.release === 'upcoming') {
    where.push(`(g.coming_soon OR g.release_timestamp > NOW())`);
  }
  if (input.status && input.status !== 'all') {
    values.push(input.status);
    where.push(`g.status = $${values.length}`);
  }
  if (input.mode) {
    values.push(input.mode);
    where.push(`g.modes ? $${values.length}`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const sortMap = {
    newest: 'g.created_at DESC',
    oldest: 'g.created_at ASC',
    score: 'score DESC, vote_count DESC, g.created_at DESC',
    owner: 'g.owner_score DESC NULLS LAST, g.created_at DESC',
    submitted: 'submission_count DESC, g.created_at DESC',
    release: 'g.release_timestamp DESC NULLS LAST, g.created_at DESC',
    title: 'g.title ASC'
  };
  const sortSql = sortMap[input.sort || 'newest'] || sortMap.newest;

  const countResult = await db.query(`SELECT COUNT(*)::int AS total FROM games g ${whereSql}`, values);
  const total = Number(countResult.rows[0]?.total || 0);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const normalizedPage = Math.min(page, pages);
  values.push(pageSize, (normalizedPage - 1) * pageSize);

  const result = await db.query(`
    SELECT
      g.*,
      COALESCE(v.score, 0)::int AS score,
      COALESCE(v.vote_count, 0)::int AS vote_count,
      COALESCE(s.submission_count, 0)::int AS submission_count
    FROM games g
    LEFT JOIN (
      SELECT game_id, SUM(value)::int AS score, COUNT(*)::int AS vote_count
      FROM votes v JOIN app_users u ON v.user_ref=u.id WHERE NOT u.disabled GROUP BY game_id
    ) v ON v.game_id = g.id
    LEFT JOIN (
      SELECT game_id, COUNT(*)::int AS submission_count
      FROM submissions GROUP BY game_id
    ) s ON s.game_id = g.id
    ${whereSql}
    ORDER BY ${sortSql}
    LIMIT $${values.length - 1} OFFSET $${values.length}
  `, values);

  return {
    games: result.rows.map(summaryFromRow),
    total,
    pages,
    page: normalizedPage
  };
}

export async function getGame(id: number, userId?: number): Promise<GameDetail | null> {

  const result = await db.query(`
    SELECT
      g.*,
      COALESCE(v.score, 0)::int AS score,
      COALESCE(v.vote_count, 0)::int AS vote_count,
      COALESCE(s.submission_count, 0)::int AS submission_count,
      COALESCE(uv.value, 0)::int AS user_vote
    FROM games g
    LEFT JOIN (
      SELECT game_id, SUM(value)::int AS score, COUNT(*)::int AS vote_count
      FROM votes v JOIN app_users u ON v.user_ref=u.id WHERE NOT u.disabled GROUP BY game_id
    ) v ON v.game_id = g.id
    LEFT JOIN (
      SELECT game_id, COUNT(*)::int AS submission_count
      FROM submissions GROUP BY game_id
    ) s ON s.game_id = g.id
    LEFT JOIN votes uv ON uv.game_id = g.id AND uv.user_ref = $2
    WHERE g.id = $1
  `, [id, userId ?? null]);

  const row = result.rows[0];
  if (!row) return null;

  const submittersResult = await db.query(
    'SELECT s.user_ref,u.display_name AS username,s.created_at FROM submissions s JOIN app_users u ON u.id=s.user_ref WHERE game_id=$1 ORDER BY s.created_at ASC',
    [id]
  );
  const submitters: Submitter[] = submittersResult.rows.map((item) => ({
    userId: String(item.user_ref),
    username: String(item.username),
    createdAt: isoValue(item.created_at)
  }));

  return {
    ...summaryFromRow(row),
    about: String(row.about || ''),
    website: row.website ? String(row.website) : null,
    developers: arrayValue(row.developers),
    publishers: arrayValue(row.publishers),
    screenshots: arrayValue(row.screenshots),
    priceText: String(row.price_text || 'Preis nicht verfügbar'),
    submitters,
    userVote: Number(row.user_vote || 0)
  };
}

export async function getNeighborGames(id: number): Promise<{ previous: number | null; next: number | null }> {

  const result = await db.query(`
    SELECT
      (SELECT id FROM games WHERE id < $1 ORDER BY id DESC LIMIT 1) AS previous,
      (SELECT id FROM games WHERE id > $1 ORDER BY id ASC LIMIT 1) AS next
  `, [id]);
  return {
    previous: result.rows[0]?.previous ? Number(result.rows[0].previous) : null,
    next: result.rows[0]?.next ? Number(result.rows[0].next) : null
  };
}

export type ImportedGame = {
  steamAppId: number;
  slug: string;
  title: string;
  shortDescription: string;
  about: string;
  headerImage: string;
  website: string | null;
  developers: string[];
  publishers: string[];
  genres: string[];
  modes: string[];
  screenshots: string[];
  releaseDate: string;
  releaseTimestamp: Date | null;
  priceText: string;
  comingSoon: boolean;
};

export async function submitGame(game: ImportedGame, user: GamesUser): Promise<{ id: number; created: boolean; submitted: boolean }> {

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT id FROM games WHERE steam_app_id = $1 FOR UPDATE', [game.steamAppId]);
    let id: number;
    let created = false;

    if (existing.rows[0]) {
      id = Number(existing.rows[0].id);
      await client.query(`
        UPDATE games SET
          slug = $2, title = $3, short_description = $4, about = $5, header_image = $6,
          website = $7, developers = $8::jsonb, publishers = $9::jsonb, genres = $10::jsonb,
          modes = $11::jsonb, screenshots = $12::jsonb, release_date = $13,
          release_timestamp = $14, price_text = $15, coming_soon=$16, updated_at = NOW()
        WHERE id = $1
      `, [
        id, game.slug, game.title, game.shortDescription, game.about, game.headerImage, game.website,
        JSON.stringify(game.developers), JSON.stringify(game.publishers), JSON.stringify(game.genres),
        JSON.stringify(game.modes), JSON.stringify(game.screenshots), game.releaseDate,
        game.releaseTimestamp, game.priceText, game.comingSoon
      ]);
    } else {
      const inserted = await client.query(`
        INSERT INTO games (
          steam_app_id, slug, title, short_description, about, header_image, website,
          developers, publishers, genres, modes, screenshots, release_date,
          release_timestamp, price_text, created_by, coming_soon
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb, $13,
          $14, $15, $16, $17
        ) RETURNING id
      `, [
        game.steamAppId, game.slug, game.title, game.shortDescription, game.about, game.headerImage,
        game.website, JSON.stringify(game.developers), JSON.stringify(game.publishers),
        JSON.stringify(game.genres), JSON.stringify(game.modes), JSON.stringify(game.screenshots),
        game.releaseDate, game.releaseTimestamp, game.priceText, user.id, game.comingSoon
      ]);
      id = Number(inserted.rows[0].id);
      created = true;
    }

    const submission = await client.query(`
      INSERT INTO submissions (game_id, user_ref)
      VALUES ($1, $2)
      ON CONFLICT (game_id, user_ref) DO NOTHING
      RETURNING id
    `, [id, user.id]);

    await client.query('COMMIT');
    return { id, created, submitted: submission.rowCount === 1 };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateGame(gameId: number, status: GameStatus, ownerScore: number | null): Promise<void> {

  const result = await db.query(
    'UPDATE games SET status = $2, owner_score = $3, updated_at = NOW() WHERE id = $1',
    [gameId, status, ownerScore]
  );
  if (!result.rowCount) throw notFound();
}

export async function deleteGame(gameId: number): Promise<void> {

  const result = await db.query('DELETE FROM games WHERE id = $1', [gameId]);
  if (!result.rowCount) throw notFound();
}

export async function refreshGame(gameId:number,game:ImportedGame):Promise<void> {
  const result=await db.query(`UPDATE games SET slug=$2,title=$3,short_description=$4,about=$5,header_image=$6,website=$7,developers=$8::jsonb,publishers=$9::jsonb,genres=$10::jsonb,modes=$11::jsonb,screenshots=$12::jsonb,release_date=$13,release_timestamp=$14,price_text=$15,coming_soon=$16,updated_at=NOW() WHERE id=$1`,[gameId,game.slug,game.title,game.shortDescription,game.about,game.headerImage,game.website,JSON.stringify(game.developers),JSON.stringify(game.publishers),JSON.stringify(game.genres),JSON.stringify(game.modes),JSON.stringify(game.screenshots),game.releaseDate,game.releaseTimestamp,game.priceText,game.comingSoon]);
  if(!result.rowCount)throw notFound();
}
