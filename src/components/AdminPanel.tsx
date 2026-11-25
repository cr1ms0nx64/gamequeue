'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
type User = { id: number; username: string; display_name: string; role: 'ADMIN' | 'USER'; disabled: boolean; steam_id: string | null; local: boolean };
type Invite = { token_hash: string; expires_at: string; used_at: string | null; revoked: boolean };
export function AdminPanel({ mode, users, invites }: { mode: string; users: User[]; invites: Invite[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [url, setUrl] = useState(''), [resetUrl,setResetUrl]=useState('');
  async function action(data: object) {
    setBusy(true); setNotice(''); setResetUrl('');
    try {
      const response = await fetch('/api/admin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (result.resetUrl) setResetUrl(result.resetUrl);
      if (result.inviteUrl) setUrl(result.inviteUrl);
      setNotice('Gespeichert.'); router.refresh();
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Fehler.'); }
    finally { setBusy(false); }
  }
  return <div className="admin-stack">
    <article className="admin-card"><h2>Zugang zur Community</h2><label>Registrierung<select aria-label="Registrierung" value={mode} disabled={busy} onChange={event => action({ action: 'settings', registration: event.target.value })}><option value="invite">Nur mit Einladung</option><option value="open">Offene Registrierung</option><option value="closed">Geschlossen</option></select></label><p>Gilt auch für neue Steam Konten. Bestehende Konten können sich weiterhin anmelden.</p></article>
    <article className="admin-card"><h2>Einladungen</h2><p>Einmal verwendbar, 7 Tage gültig. Der vollständige Link wird nur direkt nach dem Erstellen angezeigt.</p><button className="button button-primary" disabled={busy} onClick={() => action({ action: 'invite', days: 7 })}>Einladungslink erstellen</button>
      {url && <label>Einladungslink<input readOnly value={url} onFocus={event => event.currentTarget.select()} /></label>}
      <div className="table-scroll"><table><thead><tr><th>Einladung</th><th>Gültig bis</th><th>Status</th><th>Aktion</th></tr></thead><tbody>{invites.map(invite => <tr key={invite.token_hash}><td>{invite.token_hash.slice(0, 8)}</td><td>{new Date(invite.expires_at).toLocaleString('de-DE', { timeZone: 'UTC' })} UTC</td><td>{invite.revoked ? 'Widerrufen' : invite.used_at ? 'Verwendet' : new Date(invite.expires_at).getTime() < Date.now() ? 'Abgelaufen' : 'Offen'}</td><td><button disabled={busy || invite.revoked || Boolean(invite.used_at)} onClick={() => action({ action: 'revoke', hash: invite.token_hash })}>Widerrufen</button></td></tr>)}</tbody></table></div>
    </article>
    <article className="admin-card"><h2>Benutzer</h2><p>Änderungen an Rolle oder Zugang melden den Benutzer ab. Der letzte aktive Admin bleibt erhalten.</p><div className="table-scroll"><table><thead><tr><th>Konto</th><th>Anmeldung</th><th>Rolle</th><th>Zugang</th></tr></thead><tbody>{users.map(user => <tr key={user.id}><td>{user.display_name}<small> @{user.username}</small></td><td>{user.steam_id ? 'Steam' : 'Passwort'}</td><td><select aria-label={`Rolle für ${user.username}`} disabled={busy} value={user.role} onChange={event => action({ action: 'user', id: user.id, role: event.target.value, disabled: user.disabled })}><option value="USER">User</option><option value="ADMIN">Admin</option></select></td><td><button disabled={busy} onClick={() => action({ action: 'user', id: user.id, role: user.role, disabled: !user.disabled })}>{user.disabled ? 'Freigeben' : 'Sperren'}</button>{user.local && <button disabled={busy} onClick={()=>action({action:'reset',id:user.id})}>Link zum Zurücksetzen erstellen</button>}</td></tr>)}</tbody></table></div></article>
    <p role="status">{notice}</p>{resetUrl && <label>Link zum Zurücksetzen, einmal angezeigt und 24 Stunden gültig<input readOnly value={resetUrl} onFocus={event=>event.currentTarget.select()}/></label>}
  </div>;
}
