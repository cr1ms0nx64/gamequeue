export function contentSecurityPolicy(nonce:string,development=false):string {
  return `default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data: https://*.steamstatic.com https://*.akamai.steamstatic.com; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development?" 'unsafe-eval'":''}; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self'${development?' ws:':''}`;
}
