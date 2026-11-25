import { redirect } from 'next/navigation';
import { Gamepad2, Link2, WandSparkles } from 'lucide-react';
import { SubmitGameForm } from '@/components/SubmitGameForm';
import { currentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Spiel vorschlagen' };

export default async function SubmitPage() {
  const user = await currentUser();
  if (!user) redirect('/login?next=/submit');

  return (
    <section className="page-shell submit-page">
      <header className="page-title">
        <p className="eyebrow"><Gamepad2 /> Community Vorschlag</p>
        <h1>Welches Spiel fehlt noch?</h1>
        <p>Ein Steam-Link genügt. Alle verfügbaren Metadaten werden automatisch übernommen.</p>
      </header>
      <div className="submit-layout">
        <div className="submit-panel">
          <SubmitGameForm />
        </div>
        <aside className="submit-aside">
          <div><Link2 /><span><strong>Link einfügen</strong><small>Steam Store URL oder numerische App-ID</small></span></div>
          <div><WandSparkles /><span><strong>Automatischer Import</strong><small>Kein manuelles Ausfüllen von Bildern oder Details</small></span></div>
          <div><Gamepad2 /><span><strong>Gemeinsam abstimmen</strong><small>Der Vorschlag erscheint sofort in der Queue</small></span></div>
        </aside>
      </div>
    </section>
  );
}

