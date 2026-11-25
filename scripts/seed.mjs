import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const seeds = [
  { id: 2684630, title: 'Endacopia', status: 'submitted', ownerScore: null },
  { id: 4369620, title: 'Last Harbor', status: 'submitted', ownerScore: null },
  { id: 1386900, title: 'Observer: System Redux', status: 'played', ownerScore: 8 },
  { id: 2592160, title: "Earth's Edge", status: 'planned', ownerScore: null },
  { id: 3074980, title: 'Dispatch', status: 'planned', ownerScore: null },
  { id: 3401960, title: 'JOIN US', status: 'submitted', ownerScore: null },
  { id: 4244510, title: 'Pratfall', status: 'submitted', ownerScore: null },
  { id: 412220, title: 'Nova Roma', status: 'planned', ownerScore: null },
  { id: 2426530, title: 'DDNet', status: 'played', ownerScore: 7 },
  { id: 3905450, title: 'Killer Frequency', status: 'played', ownerScore: 8 },
  { id: 1903620, title: 'WheelMates', status: 'submitted', ownerScore: null },
  { id: 2273980, title: 'Orcs Must Die! Deathtrap', status: 'planned', ownerScore: null },
  { id: 2475490, title: 'Mouthwashing', status: 'played', ownerScore: 9 },
  { id: 508440, title: 'Totally Accurate Battle Simulator', status: 'played', ownerScore: 8 },
  { id: 1869290, title: 'Supraworld', status: 'planned', ownerScore: null },
  { id: 3079210, title: 'Hell Let Loose: Vietnam', status: 'planned', ownerScore: null }
];

function plainText(value = '') {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/(?:p|h[1-6]|li|ul|ol|div)>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function slugify(title, appId) {
  const slug = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70);
  return `${slug || 'steam-game'}-${appId}`;
}

function modes(categories = []) {
  const values = categories.map((item) => item.description || '');
  const result = [];
  if (values.some((value) => /single-player|einzelspieler/i.test(value))) result.push('Singleplayer');
  if (values.some((value) => /multi-player|mehrspieler|co-op|koop|pvp/i.test(value))) result.push('Multiplayer');
  return result.length ? result : ['Spiel'];
}

function releaseTimestamp(value) {
  if (!value) return null;
  const native = new Date(value);
  if (!Number.isNaN(native.getTime())) return native;
  const normalized = value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f.]/g, '');
  const match = normalized.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);
  if (!match) return null;
  const months = {
    jan: 0, januar: 0, feb: 1, februar: 1, mar: 2, marz: 2, apr: 3, april: 3,
    mai: 4, jun: 5, juni: 5, jul: 6, juli: 6, aug: 7, august: 7,
    sep: 8, sept: 8, september: 8, okt: 9, oktober: 9, nov: 10, november: 10,
    dez: 11, dezember: 11
  };
  const month = months[match[2]];
  return month == null ? null : new Date(Date.UTC(Number(match[3]), month, Number(match[1]), 12));
}

function safeWebsite(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

async function fetchGame(seed) {
  const url = new URL('https://store.steampowered.com/api/appdetails');
  url.searchParams.set('appids', String(seed.id));
  url.searchParams.set('l', 'german');
  url.searchParams.set('cc', 'de');
  const response = await fetch(url, {
    headers: { 'user-agent': 'cr1ms0n-games-seed/1.0' },
    signal: AbortSignal.timeout(15_000)
  });
  if (!response.ok) throw new Error(`Steam HTTP ${response.status}`);
  const entry = (await response.json())[String(seed.id)];
  if (!entry?.success || !entry.data?.name || !entry.data?.header_image) throw new Error('Kein Steam-Datensatz');
  return entry.data;
}

async function upsert(seed, data) {
  const title = data?.name || seed.title;
  const headerImage = data?.header_image || `https://cdn.akamai.steamstatic.com/steam/apps/${seed.id}/header.jpg`;
  const releaseDate = data?.release_date?.date || (data?.release_date?.coming_soon ? 'Demnächst' : 'Unbekannt');
  const parsedRelease = releaseTimestamp(releaseDate);

  const result = await pool.query(`
    INSERT INTO games (
      steam_app_id, slug, title, short_description, about, header_image, website,
      developers, publishers, genres, modes, screenshots, release_date,
      release_timestamp, price_text, status, owner_score, created_by_user_id
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb, $13,
      $14, $15, $16, $17, 'seed'
    )
    ON CONFLICT (steam_app_id) DO UPDATE SET
      slug = EXCLUDED.slug,
      title = EXCLUDED.title,
      short_description = EXCLUDED.short_description,
      about = EXCLUDED.about,
      header_image = EXCLUDED.header_image,
      website = EXCLUDED.website,
      developers = EXCLUDED.developers,
      publishers = EXCLUDED.publishers,
      genres = EXCLUDED.genres,
      modes = EXCLUDED.modes,
      screenshots = EXCLUDED.screenshots,
      release_date = EXCLUDED.release_date,
      release_timestamp = EXCLUDED.release_timestamp,
      price_text = EXCLUDED.price_text,
      status = CASE WHEN games.status = 'submitted' THEN EXCLUDED.status ELSE games.status END,
      owner_score = COALESCE(games.owner_score, EXCLUDED.owner_score),
      updated_at = NOW()
    RETURNING id
  `, [
    seed.id,
    slugify(title, seed.id),
    title,
    plainText(data?.short_description || 'Community-Vorschlag aus der Steam-Bibliothek.').slice(0, 520),
    plainText(data?.detailed_description || data?.short_description || '').slice(0, 6_000),
    headerImage,
    safeWebsite(data?.website),
    JSON.stringify((data?.developers || []).slice(0, 12)),
    JSON.stringify((data?.publishers || []).slice(0, 12)),
    JSON.stringify((data?.genres || []).map((item) => item.description).filter(Boolean).slice(0, 12)),
    JSON.stringify(modes(data?.categories)),
    JSON.stringify((data?.screenshots || []).map((item) => item.path_full).filter(Boolean).slice(0, 20)),
    releaseDate,
    parsedRelease,
    data?.is_free ? 'Kostenlos spielbar' : data?.price_overview?.final_formatted || 'Preis nicht verfügbar',
    seed.status,
    seed.ownerScore
  ]);

  await pool.query(`
    INSERT INTO submissions (game_id, user_id, username)
    VALUES ($1, 'seed', 'cr1ms0n')
    ON CONFLICT (game_id, user_id) DO NOTHING
  `, [result.rows[0].id]);
}

try {
  for (const seed of seeds) {
    let data = null;
    try {
      data = await fetchGame(seed);
      process.stdout.write(`Steam ${seed.id}: ${data.name}\n`);
    } catch (error) {
      process.stderr.write(`Steam ${seed.id}: ${error.message}; Fallback wird verwendet.\n`);
    }
    await upsert(seed, data);
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  process.stdout.write(`Seed abgeschlossen: ${seeds.length} Spiele.\n`);
} finally {
  await pool.end();
}

