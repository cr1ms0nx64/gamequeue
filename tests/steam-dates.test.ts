import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSteamReleaseDate } from '../src/lib/steam';
import { validName } from '../src/lib/names';
test('Steam dates parse only complete deterministic German or English calendar dates',()=>{
  for(const [text,expected] of [['12. Feb. 2025','2025-02-12T12:00:00.000Z'],['1. März 2025','2025-03-01T12:00:00.000Z'],['Feb 12, 2025','2025-02-12T12:00:00.000Z'],['12 Feb, 2025','2025-02-12T12:00:00.000Z']])assert.equal(parseSteamReleaseDate(text)?.toISOString(),expected);
  for(const text of ['Q1 2026','2026','Demnächst','Coming soon','31. Feb. 2025','01/02/2025'])assert.equal(parseSteamReleaseDate(text),null);
});
test('display names reject control characters',()=>{
  assert.equal(validName('Justin'),true);for(const text of ['','  ','A\nB','A\u007fB','A\u202eB'])assert.equal(validName(text),false);
});
