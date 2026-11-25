import test from 'node:test';
import assert from 'node:assert/strict';
import { contentSecurityPolicy } from '../src/lib/security-headers';
test('production scripts require a nonce and development eval stays development-only',()=>{
  const production=contentSecurityPolicy('fixture');const scripts=production.split(';').find(item=>item.trim().startsWith('script-src'))||'';
  assert.ok(scripts.includes("'nonce-fixture'"));assert.ok(!scripts.includes('unsafe-inline'));assert.ok(!scripts.includes('unsafe-eval'));
  assert.ok(contentSecurityPolicy('fixture',true).includes('unsafe-eval'));
});

test('HSTS uses the runtime origin and does not change API icon caching',async()=>{
  const {NextRequest}=await import('next/server');const {proxy}=await import('../src/proxy');
  const original=process.env.PUBLIC_ORIGIN;
  try {
    process.env.PUBLIC_ORIGIN='https://example.test';
    const response=proxy(new NextRequest('http://localhost/api/site-icon?v=fixture'));
    assert.equal(response.headers.get('Strict-Transport-Security'),'max-age=31536000');
    assert.equal(response.headers.get('Cache-Control'),null);assert.equal(response.headers.get('Content-Security-Policy'),null);
    process.env.PUBLIC_ORIGIN='http://localhost:3000';
    assert.equal(proxy(new NextRequest('http://localhost/api/health')).headers.get('Strict-Transport-Security'),null);
  }finally{if(original===undefined)delete process.env.PUBLIC_ORIGIN;else process.env.PUBLIC_ORIGIN=original;}
});
