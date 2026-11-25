import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/AuthForm';
import { currentUser } from '@/lib/auth';
import { isConfigured } from '@/lib/accounts';
import { safeNext } from '@/lib/navigation';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Anmelden' };
export default async function LoginPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  if (!await isConfigured()) redirect('/setup');
  const params = await searchParams || {};
  const next = safeNext(typeof params.next === 'string' ? params.next : '/');
  if (await currentUser()) redirect(next);
  return <section className="auth-page"><div className="auth-panel"><header><p className="eyebrow">Deine Community</p><h1>Willkommen zurück</h1><p>Melde dich mit deinem Games Konto an.</p></header>
    {params.error && <p role="alert">Steam Anmeldung fehlgeschlagen oder Registrierung nicht erlaubt. Prüfe deine Einladung und versuche es erneut.</p>}
    <AuthForm mode="login" next={next} steam={process.env.STEAM_AUTH_ENABLED === 'true'} /></div></section>;
}
