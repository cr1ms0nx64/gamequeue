'use client';
import { useState,type FormEvent } from 'react';
export function AccountDataControls({username,local}:{username:string;local:boolean}) {
  const [busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  async function download() {
    setBusy(true);setNotice('');
    try {const response=await fetch('/api/account/export',{method:'POST'});if(!response.ok)throw new Error((await response.json()).error);
      const url=URL.createObjectURL(await response.blob()),link=document.createElement('a');link.href=url;link.download='gamequeue-account.json';link.click();URL.revokeObjectURL(url);
    }catch(error){setNotice(error instanceof Error?error.message:'Export fehlgeschlagen.');}finally{setBusy(false);}
  }
  async function remove(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();if(!window.confirm('Konto und eigene Community-Beiträge dauerhaft löschen?'))return;
    const data=Object.fromEntries(new FormData(event.currentTarget));setBusy(true);setNotice('');
    try{const response=await fetch('/api/account',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify(data)});const payload=await response.json();if(!response.ok)throw new Error(payload.error);window.location.href='/';}
    catch(error){setNotice(error instanceof Error?error.message:'Löschen fehlgeschlagen.');setBusy(false);}
  }
  return <section className="admin-card"><h2>Meine Daten</h2><button type="button" className="button button-secondary" disabled={busy} onClick={download}>Daten als JSON herunterladen</button><h2>Konto löschen</h2><p>Votes, Kommentare, Vorschläge und Sitzungen werden gelöscht. Spiele bleiben erhalten. Diese Aktion kann nicht rückgängig gemacht werden.</p><form className="login-form" onSubmit={remove}><label>Benutzername zur Bestätigung: {username}<input name="username" required pattern={username} autoComplete="username"/></label>{local&&<label>Aktuelles Passwort<input name="password" type="password" required maxLength={128} autoComplete="current-password"/></label>}<button className="button button-secondary" disabled={busy}>Konto dauerhaft löschen</button></form><p role="status">{notice}</p></section>;
}
