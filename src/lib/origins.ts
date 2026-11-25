export function publicOrigin(): string {
  const url = new URL(process.env.PUBLIC_ORIGIN || 'http://localhost:3000');
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('PUBLIC_ORIGIN muss eine HTTP(S) Origin ohne Pfad sein.');
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('PUBLIC_ORIGIN benötigt HTTPS.');
  return url.origin;
}
