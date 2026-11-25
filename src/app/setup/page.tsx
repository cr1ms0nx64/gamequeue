import { redirect } from 'next/navigation';
import { isConfigured } from '@/lib/accounts';
import { AuthForm } from '@/components/AuthForm';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ersteinrichtung' };
export default async function SetupPage() {
  if (await isConfigured()) redirect('/login');
  return <section className="auth-page"><div className="auth-panel"><header><p className="eyebrow">Ersteinrichtung</p><h1>Deine nächste Runde beginnt hier.</h1><p>Erstelle den ersten Administrator für deine Community.</p></header><div className="setup-note"><span>Verwende das beim Installieren erzeugte Setup Token. Nach der Einrichtung wird dieses Formular automatisch gesperrt.</span></div><AuthForm mode="setup" /></div></section>;
}
