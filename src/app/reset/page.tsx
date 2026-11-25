import { ResetForm } from '@/components/ResetForm';
export const dynamic='force-dynamic';
export const metadata={title:'Passwort zurücksetzen',robots:{index:false,follow:false}};
export default async function ResetPage({searchParams}:{searchParams:Promise<{token?:string}>}) {
  const token=(await searchParams).token||'';
  return <section className="auth-page"><div className="auth-panel"><h1>Passwort zurücksetzen</h1><ResetForm token={token}/></div></section>;
}
