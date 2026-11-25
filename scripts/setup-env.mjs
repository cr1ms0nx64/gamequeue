import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
const password = randomBytes(24).toString('hex');
const setupToken = randomBytes(32).toString('hex');
try {
  writeFileSync('.env.local', `DATABASE_URL=postgresql://games:${password}@localhost:5432/games\nDB_PASSWORD=${password}\nPUBLIC_ORIGIN=http://localhost:3000\nSETUP_TOKEN=${setupToken}\nSTEAM_AUTH_ENABLED=true\nTRUST_PROXY=false\nIMPRINT_URL=\nPRIVACY_URL=\n`, { flag: 'wx', mode: 0o600 });
  console.log('Created .env.local. Set PUBLIC_ORIGIN before starting. Read SETUP_TOKEN from that file when opening /setup.');
} catch (error) {
  if (error.code === 'EEXIST') { console.error('.env.local already exists; no changes made.'); process.exitCode = 1; }
  else throw error;
}
