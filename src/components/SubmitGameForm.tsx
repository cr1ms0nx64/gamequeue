'use client';

import { FormEvent, useState } from 'react';
import { ArrowRight, CheckCircle2, ExternalLink, Gamepad2, LoaderCircle } from 'lucide-react';

type Result = {
  id: number;
  title: string;
  created: boolean;
  submitted: boolean;
};

export function SubmitGameForm() {
  const [steamUrl, setSteamUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ steamUrl })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'Das Spiel konnte nicht übernommen werden.');
      setResult(payload.game);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Das Spiel konnte nicht übernommen werden.');
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div className="submit-success">
        <CheckCircle2 />
        <p className="eyebrow">{result.created ? 'Neu eingereicht' : result.submitted ? 'Vorschlag gezählt' : 'Schon vorgeschlagen'}</p>
        <h2>{result.title}</h2>
        <p>
          {result.created
            ? 'Steam-Daten und Bilder wurden übernommen. Das Spiel ist jetzt in der Queue.'
            : result.submitted
              ? 'Dein zusätzlicher Vorschlag wurde beim Spiel hinterlegt.'
              : 'Dieses Spiel war bereits von dir eingereicht.'}
        </p>
        <a className="button button-primary" href={`/game/${result.id}`}>
          Spiel öffnen <ArrowRight />
        </a>
      </div>
    );
  }

  return (
    <form className="submit-form" onSubmit={submit}>
      <label>
        <span>Steam-Link oder App-ID</span>
        <span className="input-shell input-shell-large">
          <Gamepad2 />
          <input
            autoComplete="off"
            onChange={(event) => setSteamUrl(event.target.value)}
            placeholder="https://store.steampowered.com/app/730/..."
            required
            value={steamUrl}
          />
        </span>
      </label>
      <p className="field-help"><ExternalLink /> Titel, Beschreibung, Release, Genres und Screenshots kommen direkt von Steam.</p>
      {error ? <p className="notice notice-error" role="alert">{error}</p> : null}
      <button className="button button-primary submit-button" disabled={busy} type="submit">
        {busy ? <LoaderCircle className="spin" /> : <ArrowRight />}
        {busy ? 'Steam-Daten werden geladen' : 'Spiel einreichen'}
      </button>
    </form>
  );
}

