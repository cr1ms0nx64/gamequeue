import { siteBranding } from '@/lib/branding';
import Link from 'next/link';
export async function Footer() {
  const branding = await siteBranding();
  return <footer className="site-footer"><div className="footer-inner"><p>{branding.siteName} · Community Queue</p><nav aria-label="Informationen">{process.env.IMPRINT_URL && <a href={process.env.IMPRINT_URL}>Impressum</a>}{process.env.PRIVACY_URL && <a href={process.env.PRIVACY_URL}>Datenschutz</a>}<Link href="/about">Über die Community</Link></nav></div></footer>;
}
