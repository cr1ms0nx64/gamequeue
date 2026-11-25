import test from 'node:test';
import assert from 'node:assert/strict';
import { clientKey, proxyMisconfigured } from '../src/lib/proxy';
test('proxy reads the trusted rightmost hop and fails closed on malformed input', () => {
  const original = { trust: process.env.TRUST_PROXY, hops: process.env.TRUSTED_PROXY_HOPS };
  try {
    process.env.TRUST_PROXY = 'true'; delete process.env.TRUSTED_PROXY_HOPS;
    const request = (value: string) => new Request('http://localhost', {headers:{'x-forwarded-for':value}});
    assert.equal(clientKey(request('1.2.3.4, 198.51.100.2')), '198.51.100.2');
    assert.equal(clientKey(request('1.2.3.4, invalid')), 'unknown');
    process.env.TRUSTED_PROXY_HOPS = '2';
    assert.equal(clientKey(request('1.2.3.4, 198.51.100.2')), '1.2.3.4');
    for (const hops of ['0','NaN','-1','99']) { process.env.TRUSTED_PROXY_HOPS=hops; assert.equal(clientKey(request('1.2.3.4')), 'unknown'); }
    process.env.TRUST_PROXY = 'false';
    assert.equal(clientKey(request('1.2.3.4')), 'shared'); assert.equal(proxyMisconfigured(),true);
  } finally {
    if (original.trust === undefined) delete process.env.TRUST_PROXY; else process.env.TRUST_PROXY=original.trust;
    if (original.hops === undefined) delete process.env.TRUSTED_PROXY_HOPS; else process.env.TRUSTED_PROXY_HOPS=original.hops;
  }
});
