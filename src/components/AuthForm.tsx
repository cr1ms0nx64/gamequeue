'use client';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { safeNext } from '@/lib/navigation';
export function AuthForm({ mode, invite = '', next = '/', steam = false }: { mode: 'login' | 'register' | 'setup'; invite?: string; next?: string; steam?: boolean }) {
  const router=useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/auth/${mode}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...data, invite }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Anfrage fehlgeschlagen.');
      router.replace(mode === 'setup' ? '/admin' : safeNext(next));router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : 'Anfrage fehlgeschlagen.'); setBusy(false); }
  }
  return <form className="login-form" onSubmit={submit}>
    {mode === 'setup' && <label><span>Setup Token</span><input name="setupToken" type="password" required minLength={32} maxLength={256} autoComplete="off" /></label>}
    <label><span>Benutzername</span><input name="username" required minLength={mode === 'login' ? 1 : 3} maxLength={32} pattern={mode === 'login' ? undefined : '[a-zA-Z0-9_]{3,32}'} autoComplete="username" /></label>
    <label><span>Passwort</span><input name="password" type="password" required minLength={mode === 'login' ? 1 : 12} maxLength={128} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
    {mode !== 'login' && <small>Mindestens 12 Zeichen. Benutzername: 3 bis 32 Buchstaben, Zahlen oder Unterstriche. Das Präfix steam_ ist reserviert.</small>}
    {error && <p className="notice notice-error" role="alert">{error}</p>}
    <button className="button button-primary" disabled={busy}>{busy ? 'Bitte warten' : mode === 'login' ? 'Anmelden' : mode === 'setup' ? 'Admin anlegen' : 'Konto erstellen'}</button>
    {steam && <a className="button button-secondary" href={`/api/auth/steam${invite ? `?invite=${encodeURIComponent(invite)}` : ''}`}>Mit Steam anmelden</a>}
    <Link href={mode === 'login' ? '/register' : '/login'}>{mode === 'login' ? 'Konto erstellen' : 'Zur Anmeldung'}</Link>
  </form>;
}
