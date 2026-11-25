'use client';
import Image from 'next/image';
import { useState, type FormEvent, type ChangeEvent } from 'react';
import type { SiteBranding } from '@/lib/branding';
export function BrandingPanel({ branding }: { branding: SiteBranding }) {
  const [name,setName] = useState(branding.siteName), [icon,setIcon] = useState<string | null>(null), [reset,setReset] = useState(false), [busy,setBusy] = useState(false), [notice,setNotice] = useState('');
  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    setNotice('');
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 512 * 1024 || !['image/png','image/jpeg','image/webp'].includes(file.type)) {
      setNotice('Bitte PNG, JPEG oder WebP mit maximal 512 KB auswählen.'); event.target.value=''; return;
    }
    const reader = new FileReader();
    reader.onload = () => { setIcon(String(reader.result)); setReset(false); };
    reader.onerror = () => setNotice('Das Bild konnte nicht gelesen werden.');
    reader.readAsDataURL(file);
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice('');
    try {
      const response = await fetch('/api/admin',{ method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'branding',siteName:name,resetIcon:reset,...(icon ? {icon:icon.split(',')[1]} : {})}) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Speichern fehlgeschlagen.');
      window.location.reload();
    } catch(error) { setNotice(error instanceof Error ? error.message : 'Speichern fehlgeschlagen.'); setBusy(false); }
  }
  return <article className="admin-card"><h2>Name und Seitenicon</h2><p>Passe den Namen und das Icon deiner Community an. Das Icon erscheint in der Navigation, im Browser Tab und als Lesezeichen.</p><form onSubmit={save}>
    <label>Seitenname<input name="siteName" value={name} onChange={event=>setName(event.target.value)} minLength={1} maxLength={64} required disabled={busy} /></label>
    <div className="branding-preview"><Image unoptimized src={reset ? '/icon.png' : icon || branding.iconUrl} width="64" height="64" alt="Vorschau des Seitenicons" /><span>{name || 'GameQueue'}</span></div>
    <label>Neues Seitenicon<input name="siteIcon" type="file" accept="image/png,image/jpeg,image/webp" onChange={selectFile} disabled={busy} /></label>
    <p>PNG, JPEG oder WebP, maximal 512 KB. Ein quadratisches Bild funktioniert am besten.</p>
    <div className="branding-actions"><button type="button" disabled={busy} onClick={()=>{setIcon(null);setReset(true);}}>Standardicon verwenden</button><button className="button button-primary" disabled={busy}>{busy ? 'Wird gespeichert' : 'Darstellung speichern'}</button></div>
    <p role="status" aria-live="polite">{notice}</p>
  </form></article>;
}
