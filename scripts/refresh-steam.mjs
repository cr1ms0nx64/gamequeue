import { db, ensureSchema, refreshGame } from '../src/lib/db.ts';
import { fetchSteamGame } from '../src/lib/steam.ts';
const delay=Number(process.env.STEAM_REFRESH_DELAY_MS||1500);
if(!Number.isFinite(delay)||delay<1000)throw new Error('STEAM_REFRESH_DELAY_MS muss mindestens 1000 sein.');
try {
  await ensureSchema();const games=(await db.query('SELECT id,steam_app_id FROM games ORDER BY id')).rows;
  for(let i=0;i<games.length;i++) {
    if(i)await new Promise(resolve=>setTimeout(resolve,delay));
    const game=games[i];
    try{await refreshGame(Number(game.id),await fetchSteamGame(Number(game.steam_app_id)));console.log(`Spiel ${game.id} aktualisiert.`);}
    catch{console.error(`Spiel ${game.id} konnte nicht aktualisiert werden.`);process.exitCode=1;}
  }
}finally{await db.end();}
