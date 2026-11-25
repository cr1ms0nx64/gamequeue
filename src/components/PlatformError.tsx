'use client';
/* eslint-disable @next/next/no-img-element -- Fixed-size local UI icon, not a content image. */
import { useSyncExternalStore } from 'react';

function subscribeLanguage(changed: () => void) {
  const observer = new MutationObserver(changed);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  return () => observer.disconnect();
}

export default function RouteError({ reset, retry, unstable_retry }: { error?: Error & { digest?: string }; reset?: () => void; retry?: () => void; unstable_retry?: () => void }) {
  const locale = useSyncExternalStore(subscribeLanguage, () => document.documentElement.lang, () => 'de');
  const pl = locale === 'pl', en = locale === 'en';
  return <section className="platform-error" role="alert">
    <h1>{pl ? 'Nie udało się otworzyć widoku' : en ? 'This view could not be loaded' : 'Ansicht konnte nicht geladen werden'}</h1>
    <p>{pl ? 'Zapisane dane pozostają bez zmian. Spróbuj ponownie lub wróć do strony głównej.' : en ? 'Saved data remains unchanged. Try again or return to the home page.' : 'Gespeicherte Daten bleiben unverändert. Versuche es erneut oder kehre zur Startseite zurück.'}</p>
    <button type="button" onClick={() => { const run = retry || reset || unstable_retry; if (run) run(); else window.location.reload(); }}><img src="/platform-icons/retry.svg" width="18" height="18" alt="" />{pl ? 'Spróbuj ponownie' : en ? 'Try again' : 'Erneut versuchen'}</button>
    <button type="button" onClick={() => {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Error recovery must bypass potentially broken client routing.
      window.location.assign('/');
    }}>{pl ? 'Strona główna' : en ? 'Home' : 'Zur Startseite'}</button>
  </section>;
}

