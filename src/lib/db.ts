import { notFound } from '@/lib/errors';
import { Pool, type QueryResultRow } from 'pg';
import type { GameComment, GameDetail, GameStatus, GameSummary, GamesUser, Submitter } from '@/lib/types';

const globalForDb = globalThis as unknown as {
  gamesPool?: Pool;
  gamesSchemaReady?: Promise<void>;
};

export const db = globalForDb.gamesPool || new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000
});

if (process.env.NODE_ENV !== 'production') globalForDb.gamesPool = db;

async function initializeSchema(): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS games (
      id SERIAL PRIMARY KEY,
      steam_app_id INTEGER NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      short_description TEXT NOT NULL DEFAULT '',
      about TEXT NOT NULL DEFAULT '',
      header_image TEXT NOT NULL,
      website TEXT,
      developers JSONB NOT NULL DEFAULT '[]'::jsonb,
      publishers JSONB NOT NULL DEFAULT '[]'::jsonb,
      genres JSONB NOT NULL DEFAULT '[]'::jsonb,
      modes JSONB NOT NULL DEFAULT '[]'::jsonb,
      screenshots JSONB NOT NULL DEFAULT '[]'::jsonb,
      release_date TEXT NOT NULL DEFAULT 'Unbekannt',
      release_timestamp TIMESTAMPTZ,
      price_text TEXT NOT NULL DEFAULT 'Preis nicht verfügbar',
      status TEXT NOT NULL DEFAULT 'submitted'
        CHECK (status IN ('submitted', 'planned', 'playing', 'played', 'rejected')),
      owner_score SMALLINT CHECK (owner_score BETWEEN 0 AND 10),
      created_by_user_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id BIGSERIAL PRIMARY KEY,
      game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (game_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS votes (
      game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      value SMALLINT NOT NULL CHECK (value IN (-1, 1)),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (game_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id BIGSERIAL PRIMARY KEY,
      game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
    CREATE INDEX IF NOT EXISTS idx_games_release ON games(release_timestamp);
    CREATE INDEX IF NOT EXISTS idx_games_created ON games(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_comments_game ON comments(game_id, created_at DESC);
  `);
}

export function ensureSchema(): Promise<void> {
  if (!globalForDb.gamesSchemaReady) {
    globalForDb.gamesSchemaReady = initializeSchema().catch((error) => {
      globalForDb.gamesSchemaReady = undefined;
      throw error;
    });
  }
  return globalForDb.gamesSchemaReady;
}

function arrayValue(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function isoValue(value: unknown): string {
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}

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
  await ensureSchema();
  const pageSize = Math.min(48, Math.max(1, input.pageSize || 16));
  const page = Math.max(1, input.page || 1);
  const values: unknown[] = [];
  const where: string[] = [];

  if (input.search?.trim()) {
    values.push(`%${input.search.trim()}%`);
    where.push(`(g.title ILIKE $${values.length} OR g.short_description ILIKE $${values.length} OR g.genres::text ILIKE $${values.length})`);
  }
  if (input.release === 'released') {
    where.push(`(g.release_timestamp <= NOW() OR (g.release_timestamp IS NULL AND g.release_date NOT ILIKE 'Demn%'))`);
  }
  if (input.release === 'upcoming') {
    where.push(`(g.release_timestamp > NOW() OR (g.release_timestamp IS NULL AND g.release_date ILIKE 'Demn%'))`);
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
      FROM votes GROUP BY game_id
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
  await ensureSchema();
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
      FROM votes GROUP BY game_id
    ) v ON v.game_id = g.id
    LEFT JOIN (
      SELECT game_id, COUNT(*)::int AS submission_count
      FROM submissions GROUP BY game_id
    ) s ON s.game_id = g.id
    LEFT JOIN votes uv ON uv.game_id = g.id AND uv.user_id = $2
    WHERE g.id = $1
  `, [id, userId ? `local:${userId}` : '']);

  const row = result.rows[0];
  if (!row) return null;

  const submittersResult = await db.query(
    'SELECT user_id, username, created_at FROM submissions WHERE game_id = $1 ORDER BY created_at ASC',
    [id]
  );
  const submitters: Submitter[] = submittersResult.rows.map((item) => ({
    userId: String(item.user_id),
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
  await ensureSchema();
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
};

export async function submitGame(game: ImportedGame, user: GamesUser): Promise<{ id: number; created: boolean; submitted: boolean }> {
  await ensureSchema();
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
          release_timestamp = $14, price_text = $15, updated_at = NOW()
        WHERE id = $1
      `, [
        id, game.slug, game.title, game.shortDescription, game.about, game.headerImage, game.website,
        JSON.stringify(game.developers), JSON.stringify(game.publishers), JSON.stringify(game.genres),
        JSON.stringify(game.modes), JSON.stringify(game.screenshots), game.releaseDate,
        game.releaseTimestamp, game.priceText
      ]);
    } else {
      const inserted = await client.query(`
        INSERT INTO games (
          steam_app_id, slug, title, short_description, about, header_image, website,
          developers, publishers, genres, modes, screenshots, release_date,
          release_timestamp, price_text, created_by_user_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb, $13,
          $14, $15, $16
        ) RETURNING id
      `, [
        game.steamAppId, game.slug, game.title, game.shortDescription, game.about, game.headerImage,
        game.website, JSON.stringify(game.developers), JSON.stringify(game.publishers),
        JSON.stringify(game.genres), JSON.stringify(game.modes), JSON.stringify(game.screenshots),
        game.releaseDate, game.releaseTimestamp, game.priceText, `local:${user.id}`
      ]);
      id = Number(inserted.rows[0].id);
      created = true;
    }

    const submission = await client.query(`
      INSERT INTO submissions (game_id, user_id, username)
      VALUES ($1, $2, $3)
      ON CONFLICT (game_id, user_id) DO NOTHING
      RETURNING id
    `, [id, `local:${user.id}`, user.displayName || user.username]);

    await client.query('COMMIT');
    return { id, created, submitted: submission.rowCount === 1 };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function setVote(gameId: number, user: GamesUser, value: -1 | 1): Promise<{ score: number; voteCount: number; userVote: number }> {
  await ensureSchema();
  const existing = await db.query('SELECT value FROM votes WHERE game_id = $1 AND user_id = $2', [gameId, `local:${user.id}`]);
  let userVote: number = value;
  if (Number(existing.rows[0]?.value) === value) {
    await db.query('DELETE FROM votes WHERE game_id = $1 AND user_id = $2', [gameId, `local:${user.id}`]);
    userVote = 0;
  } else {
    await db.query(`
      INSERT INTO votes (game_id, user_id, username, value)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (game_id, user_id)
      DO UPDATE SET value = EXCLUDED.value, username = EXCLUDED.username, updated_at = NOW()
    `, [gameId, `local:${user.id}`, user.displayName || user.username, value]);
  }

  const aggregate = await db.query(
    'SELECT COALESCE(SUM(value), 0)::int AS score, COUNT(*)::int AS vote_count FROM votes WHERE game_id = $1',
    [gameId]
  );
  return {
    score: Number(aggregate.rows[0].score),
    voteCount: Number(aggregate.rows[0].vote_count),
    userVote
  };
}

export async function listComments(gameId: number): Promise<GameComment[]> {
  await ensureSchema();
  const result = await db.query(
    'SELECT id, username, body, created_at FROM comments WHERE game_id = $1 ORDER BY created_at DESC LIMIT 100',
    [gameId]
  );
  return result.rows.map((row) => ({
    id: Number(row.id),
    username: String(row.username),
    body: String(row.body),
    createdAt: isoValue(row.created_at)
  }));
}

export async function addComment(gameId: number, user: GamesUser, body: string): Promise<GameComment> {
  await ensureSchema();
  const result = await db.query(`
    INSERT INTO comments (game_id, user_id, username, body)
    VALUES ($1, $2, $3, $4)
    RETURNING id, username, body, created_at
  `, [gameId, `local:${user.id}`, user.displayName || user.username, body.trim()]);
  const row = result.rows[0];
  return {
    id: Number(row.id),
    username: String(row.username),
    body: String(row.body),
    createdAt: isoValue(row.created_at)
  };
}

export async function updateGame(gameId: number, status: GameStatus, ownerScore: number | null): Promise<void> {
  await ensureSchema();
  const result = await db.query(
    'UPDATE games SET status = $2, owner_score = $3, updated_at = NOW() WHERE id = $1',
    [gameId, status, ownerScore]
  );
  if (!result.rowCount) throw notFound();
}

export async function deleteGame(gameId: number): Promise<void> {
  await ensureSchema();
  const result = await db.query('DELETE FROM games WHERE id = $1', [gameId]);
  if (!result.rowCount) throw notFound();
}

