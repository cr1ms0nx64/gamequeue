import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { AppError, unauthenticated, forbidden, notFound, rateLimited, validation, conflict, upstream, toResponse } from '../src/lib/errors';
import { parseSteamAppId } from '../src/lib/steam';
test('error boundary exposes only intentional public messages', async () => {
  for (const [error,status] of [[unauthenticated(),401],[forbidden(),403],[notFound(),404],[rateLimited(),429],[validation('Eingabe prüfen'),400],[conflict(),409],[upstream(),502],
    [z.string().safeParse(1).error,400],[{code:'23505',detail:'secret'},409],[{code:'23503',detail:'secret'},404]] as const) {
    const response=toResponse(error); assert.equal(response.status,status); assert.equal(JSON.stringify(await response.json()).includes('secret'),false);
  }
  const log=console.error; const logged:unknown[]=[];
  try { console.error=(...args)=>{logged.push(args);}; const response=toResponse(new Error('password=secret SELECT *')); assert.equal(response.status,500); assert.equal((await response.text()).includes('secret'),false); assert.equal(logged.length,1); }
  finally { console.error=log; }
  assert.equal(new AppError('X',400,'public').code,'X');
});
test('Steam app identifiers fit signed PostgreSQL integer range', () => {
  for (const value of ['0','-1','9999999999','2147483648','https://evil.test/app/620']) assert.equal(parseSteamAppId(value),null);
  assert.equal(parseSteamAppId('1'),1); assert.equal(parseSteamAppId('2147483647'),2147483647);
  assert.equal(parseSteamAppId('https://store.steampowered.com/app/620/Portal_2/'),620);
});
