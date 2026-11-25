import Link from 'next/link';
import { ArrowLeft, Gamepad2 } from 'lucide-react';

export default function NotFound() {
  return (
    <section className="auth-page">
      <div className="auth-panel empty-state">
        <Gamepad2 />
        <h1>Spiel nicht gefunden</h1>
        <p>Der Eintrag existiert nicht mehr oder die Adresse ist falsch.</p>
        <Link className="button button-primary" href="/"><ArrowLeft /> Zur Übersicht</Link>
      </div>
    </section>
  );
}

