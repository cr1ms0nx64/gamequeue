import { redirect } from 'next/navigation';
import Link from 'next/link';
import { isConfigured, registrationMode } from '@/lib/accounts';
import { currentUser } from '@/lib/auth';
import { AuthForm } from '@/components/AuthForm';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Registrieren' };
export default async function RegisterPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  if (!await isConfigured()) redirect('/setup');
  if (await currentUser()) redirect('/account');
  const params = await searchParams || {};
  const invite = typeof params.invite === 'string' ? params.invite : '';
  const mode = await registrationMode();
  return <section className="auth-page"><div className="auth-panel"><header><p className="eyebrow">Community</p><h1>Spiel mit.</h1><p>Ein Konto für Vorschläge, Stimmen und Gespräche.</p></header>
    {mode === 'closed' ? <p>Die Registrierung ist geschlossen. <Link href="/login">Zur Anmeldung</Link></p> : mode === 'invite' && !invite ? <p>Für diese Community benötigst du einen Einladungslink. Bitte frage einen Administrator. <Link href="/login">Zur Anmeldung</Link></p> : <AuthForm mode="register" invite={invite} steam={process.env.STEAM_AUTH_ENABLED === 'true'} />}
    </div></section>;
}
