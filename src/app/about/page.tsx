import { Check, Gamepad2, ShieldCheck, UsersRound } from 'lucide-react';

export const metadata = { title: 'Über die Plattform' };

export default function AboutPage() {
  return (
    <section className="page-shell prose-page">
      <header className="page-title">
        <p className="eyebrow"><Gamepad2 /> Community Queue</p>
        <h1>Ein Ort für unsere nächsten Spiele</h1>
        <p>Die Plattform bündelt Vorschläge, Bewertungen und den aktuellen Spielplan.</p>
      </header>
      <div className="prose-grid">
        <article>
          <UsersRound />
          <h2>Gemeinsam entscheiden</h2>
          <p>Jeder angemeldete Nutzer kann Steam-Spiele vorschlagen, abstimmen und kommentieren.</p>
        </article>
        <article>
          <ShieldCheck />
          <h2>Dein Community Konto</h2>
          <p>Melde dich mit einem lokalen Konto oder über Steam an. Administratoren verwalten den Zugang und Einladungen direkt in Games.</p>
        </article>
        <article>
          <Check />
          <h2>Klare Choice</h2>
          <p>Geplant, aktuell gespielt, abgeschlossen oder abgelehnt: Der Status bleibt nachvollziehbar.</p>
        </article>
      </div>
    </section>
  );
}

