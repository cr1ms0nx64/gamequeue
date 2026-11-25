import { AccountDataControls } from '@/components/AccountDataControls';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { AccountForm } from '@/components/AccountForm';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mein Konto' };
export default async function AccountPage() {
  const user = await currentUser();
  if (!user) redirect('/login?next=/account');
  const local = Boolean((await db.query('SELECT password_hash IS NOT NULL AS local FROM app_users WHERE id=$1', [user.id])).rows[0]?.local);
  return <section className="auth-page"><div className="auth-panel"><h1>Mein Konto</h1><p>@{user.username} · {user.role === 'ADMIN' ? 'Administrator' : 'Mitglied'}</p><AccountForm name={user.displayName} local={local} /><AccountDataControls username={user.username} local={local}/></div></section>;
}
