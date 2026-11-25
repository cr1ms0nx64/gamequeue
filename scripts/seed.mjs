import { db,submitGame,updateGame } from '../src/lib/db.ts';
import { asUser } from '../src/lib/accounts.ts';
import { fetchSteamGame } from '../src/lib/steam.ts';
import { migrate } from '../src/lib/db/migrate.ts';
const seeds = [
  { id: 2684630, title: 'Endacopia', status: 'submitted', ownerScore: null },
  { id: 4369620, title: 'Last Harbor', status: 'submitted', ownerScore: null },
  { id: 1386900, title: 'Observer: System Redux', status: 'played', ownerScore: 8 },
  { id: 2592160, title: "Earth's Edge", status: 'planned', ownerScore: null },
  { id: 3074980, title: 'Dispatch', status: 'planned', ownerScore: null },
  { id: 3401960, title: 'JOIN US', status: 'submitted', ownerScore: null },
  { id: 4244510, title: 'Pratfall', status: 'submitted', ownerScore: null },
  { id: 412220, title: 'Nova Roma', status: 'planned', ownerScore: null },
  { id: 2426530, title: 'DDNet', status: 'played', ownerScore: 7 },
  { id: 3905450, title: 'Killer Frequency', status: 'played', ownerScore: 8 },
  { id: 1903620, title: 'WheelMates', status: 'submitted', ownerScore: null },
  { id: 2273980, title: 'Orcs Must Die! Deathtrap', status: 'planned', ownerScore: null },
  { id: 2475490, title: 'Mouthwashing', status: 'played', ownerScore: 9 },
  { id: 508440, title: 'Totally Accurate Battle Simulator', status: 'played', ownerScore: 8 },
  { id: 1869290, title: 'Supraworld', status: 'planned', ownerScore: null },
  { id: 3079210, title: 'Hell Let Loose: Vietnam', status: 'planned', ownerScore: null }
];

await migrate();
try {
  const admin=(await db.query("SELECT * FROM app_users WHERE role='ADMIN' AND NOT disabled ORDER BY id LIMIT 1")).rows[0];
  if(!admin)throw new Error('Bitte zuerst das Setup abschließen.');
  for(const seed of seeds) {
    let imported;
    try {imported=await fetchSteamGame(seed.id);}
    catch { imported={steamAppId:seed.id,slug:`seed-${seed.id}`,title:seed.title,shortDescription:'',about:'',headerImage:`https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${seed.id}/header.jpg`,website:null,developers:[],publishers:[],genres:[],modes:[],screenshots:[],releaseDate:'Unbekannt',releaseTimestamp:null,priceText:'Preis nicht verfügbar',comingSoon:false}; }
    const result=await submitGame(imported,asUser(admin));await updateGame(result.id,seed.status,seed.ownerScore);
    console.log(`Spiel ${seed.id} vorbereitet.`);await new Promise(resolve=>setTimeout(resolve,1500));
  }
}finally{await db.end();}
