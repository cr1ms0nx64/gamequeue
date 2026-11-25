import { randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { contentSecurityPolicy } from '@/lib/security-headers';
export function proxy(request:NextRequest) {
  const path=request.nextUrl.pathname;
  const document=!path.startsWith('/api/')&&!/\.[a-z0-9]+$/i.test(path);
  let response:NextResponse;
  if(document) {
    const nonce=randomBytes(18).toString('base64');
    const policy=contentSecurityPolicy(nonce,process.env.NODE_ENV==='development');
    const headers=new Headers(request.headers);headers.set('x-nonce',nonce);headers.set('Content-Security-Policy',policy);
    response=NextResponse.next({request:{headers}});
    response.headers.set('Content-Security-Policy',policy);response.headers.set('Cache-Control','private, no-store');
  }else response=NextResponse.next();
  // PUBLIC_ORIGIN is evaluated at request time, including in prebuilt Docker images.
  if(process.env.PUBLIC_ORIGIN?.startsWith('https://'))response.headers.set('Strict-Transport-Security','max-age=31536000');
  return response;
}
export const config={matcher:['/((?!_next/static|_next/image).*)']};
