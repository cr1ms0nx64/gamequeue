'use client';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
export function AccountForm({ name, local }: { name: string; local: boolean }) {
  const router=useRouter();
  const [notice, setNotice] = useState(''), [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/account', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ displayName: form.get('displayName'), ...(form.get('password') ? { password: form.get('password'), currentPassword: form.get('currentPassword') } : {}) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (result.passwordChanged) { router.replace('/login');router.refresh(); }
      else { setNotice('Profil gespeichert.'); router.refresh(); }
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Fehler.'); }
    finally { setBusy(false); }
  }
  return <form className="login-form" onSubmit={submit}><label>Anzeigename<input name="displayName" defaultValue={name} required maxLength={64} /></label>{local && <><label>Aktuelles Passwort<input name="currentPassword" type="password" autoComplete="current-password" maxLength={128} /></label><label>Neues Passwort (optional)<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} /></label><small>Ein neues Passwort beendet alle bestehenden Sitzungen.</small></>}<p role="status">{notice}</p><button className="button button-primary" disabled={busy}>Speichern</button></form>;
}
