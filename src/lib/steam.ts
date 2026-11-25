import { AppError, upstream } from '@/lib/errors';
import type { ImportedGame } from '@/lib/db';

type SteamCategory = { id?: number; description?: string };
type SteamGenre = { id?: string; description?: string };
type SteamScreenshot = { id?: number; path_full?: string };
type SteamAppData = {
  type?: string;
  name?: string;
  steam_appid?: number;
  required_age?: number | string;
  is_free?: boolean;
  detailed_description?: string;
  short_description?: string;
  header_image?: string;
  website?: string | null;
  developers?: string[];
  publishers?: string[];
  categories?: SteamCategory[];
  genres?: SteamGenre[];
  screenshots?: SteamScreenshot[];
  release_date?: { coming_soon?: boolean; date?: string };
  price_overview?: { final_formatted?: string };
};

type SteamPayload = Record<string, { success?: boolean; data?: SteamAppData }>;

export function parseSteamAppId(input: string): number | null {
  const bounded = (raw: string) => { const id = Number(raw); return Number.isInteger(id) && id >= 1 && id <= 2147483647 ? id : null; };
  const value = input.trim();
  if (/^\d{1,10}$/.test(value)) return bounded(value);
  try {
    const url = new URL(value);
    if (!/(^|\.)steampowered\.com$/i.test(url.hostname)) return null;
    const match = url.pathname.match(/^\/app\/(\d+)(?:\/|$)/i);
    return match ? bounded(match[1]) : null;
  } catch { return null; }
}

function plainText(value = ''): string {
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

function slugify(title: string, appId: number): string {
  const slug = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70);
  return `${slug || 'steam-game'}-${appId}`;
}

function releaseTimestamp(dateValue: string | undefined): Date | null {
  if (!dateValue) return null;
  const native = new Date(dateValue);
  if (!Number.isNaN(native.getTime())) return native;

  const normalized = dateValue.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f.]/g, '');
  const match = normalized.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);
  if (!match) return null;
  const months: Record<string, number> = {
    jan: 0, januar: 0, feb: 1, februar: 1, mar: 2, marz: 2, apr: 3, april: 3,
    mai: 4, jun: 5, juni: 5, jul: 6, juli: 6, aug: 7, august: 7,
    sep: 8, sept: 8, september: 8, okt: 9, oktober: 9, nov: 10, november: 10,
    dez: 11, dezember: 11
  };
  const month = months[match[2]];
  return month == null ? null : new Date(Date.UTC(Number(match[3]), month, Number(match[1]), 12));
}

function safeWebsite(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function gameModes(categories: SteamCategory[] = []): string[] {
  const descriptions = categories.map((category) => category.description || '');
  const modes: string[] = [];
  if (descriptions.some((value) => /single-player|einzelspieler/i.test(value))) modes.push('Singleplayer');
  if (descriptions.some((value) => /multi-player|mehrspieler|co-op|koop|pvp/i.test(value))) modes.push('Multiplayer');
  return modes.length ? modes : ['Spiel'];
}

export async function fetchSteamGame(appId: number): Promise<ImportedGame> {
  const url = new URL('https://store.steampowered.com/api/appdetails');
  url.searchParams.set('appids', String(appId));
  url.searchParams.set('l', 'german');
  url.searchParams.set('cc', 'de');

  try {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      'user-agent': 'gamequeue/1.2'
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(12_000)
  });
  if (!response.ok) throw upstream('Steam ist vorübergehend nicht erreichbar.');

  const payload = await response.json() as SteamPayload;
  const entry = payload[String(appId)];
  const data = entry?.data;
  if (!entry?.success || !data?.name || !data.header_image || data.type !== 'game') {
    throw upstream('Diese Steam-ID gehört zu keinem verfügbaren Spiel.');
  }

  return {
    steamAppId: appId,
    slug: slugify(data.name, appId),
    title: data.name,
    shortDescription: plainText(data.short_description || '').slice(0, 520),
    about: plainText(data.detailed_description || data.short_description || '').slice(0, 6_000),
    headerImage: data.header_image,
    website: safeWebsite(data.website),
    developers: (data.developers || []).slice(0, 12),
    publishers: (data.publishers || []).slice(0, 12),
    genres: (data.genres || []).map((genre) => genre.description || '').filter(Boolean).slice(0, 12),
    modes: gameModes(data.categories),
    screenshots: (data.screenshots || []).map((item) => item.path_full || '').filter(Boolean).slice(0, 20),
    releaseDate: data.release_date?.date || (data.release_date?.coming_soon ? 'Demnächst' : 'Unbekannt'),
    releaseTimestamp: releaseTimestamp(data.release_date?.date),
    priceText: data.is_free ? 'Kostenlos spielbar' : data.price_overview?.final_formatted || 'Preis nicht verfügbar'
  };
  } catch (error) { if (error instanceof AppError) throw error; throw upstream('Der Steam-Import ist vorübergehend nicht verfügbar.'); }
}

