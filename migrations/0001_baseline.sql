
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
  

    CREATE TABLE IF NOT EXISTS app_settings (id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id), registration TEXT NOT NULL DEFAULT 'invite' CHECK (registration IN ('open','invite','closed')));
    ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS site_name TEXT NOT NULL DEFAULT 'GameQueue';
    ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS site_icon BYTEA;
    ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS site_icon_hash TEXT;
    INSERT INTO app_settings(id) VALUES(TRUE) ON CONFLICT DO NOTHING;
    CREATE TABLE IF NOT EXISTS app_users (
      id SERIAL PRIMARY KEY, username TEXT NOT NULL, display_name TEXT NOT NULL,
      password_hash TEXT, steam_id TEXT UNIQUE, role TEXT NOT NULL DEFAULT 'USER' CHECK(role IN ('ADMIN','USER')),
      disabled BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS app_users_username ON app_users(lower(username));
    CREATE TABLE IF NOT EXISTS app_sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE, expires_at TIMESTAMPTZ NOT NULL);
    CREATE TABLE IF NOT EXISTS app_invites (token_hash TEXT PRIMARY KEY, created_by INTEGER NOT NULL REFERENCES app_users(id), expires_at TIMESTAMPTZ NOT NULL, used_at TIMESTAMPTZ, revoked BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS app_auth_limits (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires_at TIMESTAMPTZ NOT NULL);
    CREATE TABLE IF NOT EXISTS app_steam_states (token_hash TEXT PRIMARY KEY, invite TEXT NOT NULL DEFAULT '', expires_at TIMESTAMPTZ NOT NULL);
    CREATE TABLE IF NOT EXISTS app_steam_nonces (nonce TEXT PRIMARY KEY, expires_at TIMESTAMPTZ NOT NULL);
  
