import { siteBranding } from '@/lib/branding';
import { BrandingPanel } from '@/components/BrandingPanel';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { registrationMode } from '@/lib/accounts';
import { db } from '@/lib/db';
import { AdminPanel } from '@/components/AdminPanel';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Administration' };
export default async function AdminPage() {
  const user = await currentUser();
  if (!user) redirect('/login?next=/admin');
  if (user.role !== 'ADMIN') redirect('/');
  const mode = await registrationMode();
  const branding = await siteBranding();
  const [users, invites] = await Promise.all([db.query('SELECT id,username,display_name,role,disabled,steam_id FROM app_users ORDER BY id'), db.query('SELECT token_hash,expires_at,used_at,revoked FROM app_invites ORDER BY created_at DESC LIMIT 100')]);
  return <section className="page-shell"><header className="page-title"><p className="eyebrow">Community verwalten</p><h1>Administration</h1><p>Benutzer, Einladungen und Registrierung an einem Ort.</p></header><div className="admin-stack"><BrandingPanel branding={branding} /><AdminPanel mode={mode} users={users.rows} invites={invites.rows.map(row => ({ ...row, expires_at: row.expires_at.toISOString(), used_at: row.used_at?.toISOString() || null }))} /></div></section>;
}
