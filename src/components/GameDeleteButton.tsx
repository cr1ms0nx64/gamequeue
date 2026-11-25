'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle, Trash2, X } from 'lucide-react';

export function GameDeleteButton({ gameId, title, compact = false, redirectTo }: { gameId: number; title: string; compact?: boolean; redirectTo?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null), trigger = useRef<HTMLButtonElement>(null), cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const node = dialog.current, opener=trigger.current;
    if (!open || !node) return;
    node.showModal();
    cancel.current?.focus();
    return () => { node.close(); opener?.focus({ preventScroll: true }); };
  }, [open]);
  async function remove() {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/games/${gameId}/admin`, { method: 'DELETE', signal: AbortSignal.timeout(20_000) });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'Das Spiel konnte nicht gelöscht werden.');
      setOpen(false);
      if (redirectTo) window.location.assign(redirectTo);
      else router.refresh();
    } catch (reason) {
      setError(reason instanceof TypeError || reason instanceof DOMException ? 'Keine Serverbestätigung. Bitte kontrolliere den aktuellen Stand, bevor du es erneut versuchst.' : reason instanceof Error ? reason.message : 'Löschen fehlgeschlagen.');
    } finally { setBusy(false); }
  }
  return <>
    <button ref={trigger} aria-label={compact ? `${title} löschen` : undefined} className={compact ? 'game-card-delete' : 'button button-danger'} disabled={busy} onClick={() => { setError(''); setOpen(true); }} title="Spiel löschen" type="button"><Trash2 />{!compact && 'Spiel löschen'}</button>
    {open && <dialog className="platform-confirm" ref={dialog} aria-labelledby={`delete-game-${gameId}`} onCancel={event => { event.preventDefault(); if (!busy) setOpen(false); }}>
      <header><h2 id={`delete-game-${gameId}`}>Spiel löschen?</h2><button type="button" aria-label="Schließen" disabled={busy} onClick={() => setOpen(false)}><X size={20} /></button></header>
      <p>„{title}“ sowie zugehörige Stimmen, Kommentare und Einreichungen werden endgültig entfernt.</p>
      {error && <p role="alert">{error}</p>}
      <footer><button ref={cancel} type="button" disabled={busy} onClick={() => setOpen(false)}>Abbrechen</button><button type="button" className="danger" disabled={busy} onClick={() => void remove()}>{busy ? <LoaderCircle className="spin" size={18} /> : <Trash2 size={18} />}{busy ? 'Wird gelöscht' : 'Endgültig löschen'}</button></footer>
    </dialog>}
  </>;
}

