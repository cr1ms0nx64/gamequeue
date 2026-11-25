import { cache } from 'react';
import { db } from '@/lib/db';
export type SiteBranding = { siteName: string; iconUrl: string; customIcon: boolean };
export const siteBranding = cache(async (): Promise<SiteBranding> => {
  const row = (await db.query('SELECT site_name,site_icon_hash FROM app_settings WHERE id=TRUE')).rows[0];
  return { siteName: row.site_name, iconUrl: row.site_icon_hash ? `/api/site-icon?v=${row.site_icon_hash}` : '/icon.png', customIcon: Boolean(row.site_icon_hash) };
});
