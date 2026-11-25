import test from 'node:test';
import assert from 'node:assert/strict';
import { contentSecurityPolicy } from '../src/lib/security-headers';
test('production scripts require a nonce and development eval stays development-only',()=>{
  const production=contentSecurityPolicy('fixture');const scripts=production.split(';').find(item=>item.trim().startsWith('script-src'))||'';
  assert.ok(scripts.includes("'nonce-fixture'"));assert.ok(!scripts.includes('unsafe-inline'));assert.ok(!scripts.includes('unsafe-eval'));
  assert.ok(contentSecurityPolicy('fixture',true).includes('unsafe-eval'));
});
