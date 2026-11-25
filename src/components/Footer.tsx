import Link from 'next/link';
export function Footer() {
  return <footer className="site-footer"><div className="footer-inner"><p>cr1ms0n Games · Community Queue</p><nav aria-label="Informationen">{process.env.IMPRINT_URL && <a href={process.env.IMPRINT_URL}>Impressum</a>}{process.env.PRIVACY_URL && <a href={process.env.PRIVACY_URL}>Datenschutz</a>}<Link href="/about">Über Games</Link></nav></div></footer>;
}
