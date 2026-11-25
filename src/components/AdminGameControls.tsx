'use client';

import { useState } from 'react';
import { LoaderCircle, Save, Settings2 } from 'lucide-react';
import { GameDeleteButton } from '@/components/GameDeleteButton';
import { statusLabels } from '@/lib/format';
import type { GameStatus } from '@/lib/types';

export function AdminGameControls({
  gameId,
  title,
  initialStatus,
  initialOwnerScore
}: {
  gameId: number;
  title: string;
  initialStatus: GameStatus;
  initialOwnerScore: number | null;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [score, setScore] = useState(initialOwnerScore == null ? '' : String(initialOwnerScore));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  async function save() {
    setBusy(true);
    setNotice('');
    try {
      const response = await fetch(`/api/games/${gameId}/admin`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status, ownerScore: score === '' ? null : Number(score) })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'Änderung fehlgeschlagen.');
      setNotice('Gespeichert');
      window.setTimeout(() => window.location.reload(), 450);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Änderung fehlgeschlagen.');
      setBusy(false);
    }
  }

  async function refreshSteam() {
    setBusy(true);setNotice('');
    try {const response=await fetch(`/api/games/${gameId}/admin`,{method:'POST'});const payload=await response.json();if(!response.ok)throw new Error(payload.error);window.location.reload();}
    catch(error){setNotice(error instanceof Error?error.message:'Aktualisierung fehlgeschlagen.');setBusy(false);}
  }

  return (
    <section className="admin-controls">
      <header><Settings2 /><strong>Verwaltung</strong></header>
      <label>
        <span>Status</span>
        <select onChange={(event) => setStatus(event.target.value as GameStatus)} value={status}>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label>
        <span>Admin Score</span>
        <input max="10" min="0" onChange={(event) => setScore(event.target.value)} placeholder="–" type="number" value={score} />
      </label>
      <div className="admin-actions">
        <button className="button button-primary" disabled={busy} onClick={save} type="button">
          {busy ? <LoaderCircle className="spin" /> : <Save />} Speichern
        </button>
        <button type="button" className="button button-secondary" disabled={busy} onClick={refreshSteam}>Daten von Steam aktualisieren</button>
        <GameDeleteButton gameId={gameId} redirectTo="/" title={title} />
      </div>
      {notice ? <small className="admin-notice">{notice}</small> : null}
    </section>
  );
}

