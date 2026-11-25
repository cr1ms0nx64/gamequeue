'use client';
import { useState, type FormEvent } from 'react';
export function ResetForm({token}:{token:string}) {
  const [busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice('');
    const form=new FormData(event.currentTarget);
    if(form.get('password')!==form.get('confirmation')) {setNotice('Die Passwörter stimmen nicht überein.');setBusy(false);return;}
    try {
      const response=await fetch('/api/auth/reset',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token,password:form.get('password')})});
      const data=await response.json();if(!response.ok)throw new Error(data.error);
      window.location.href='/login';
    }catch(error){setNotice(error instanceof Error?error.message:'Das Passwort konnte nicht geändert werden.');setBusy(false);}
  }
  return <form className="login-form" onSubmit={submit}><label>Neues Passwort<input name="password" type="password" required minLength={12} maxLength={128} autoComplete="new-password"/></label><label>Passwort wiederholen<input name="confirmation" type="password" required minLength={12} maxLength={128} autoComplete="new-password"/></label><p>Mindestens 12 Zeichen. Alle bestehenden Sitzungen werden beendet.</p><p role="status">{notice}</p><button className="button button-primary" disabled={busy||!token}>Passwort zurücksetzen</button></form>;
}
