import { cpSync, mkdirSync } from 'node:fs';
mkdirSync('.next/standalone/.next', { recursive: true });
cpSync('public', '.next/standalone/public', { recursive: true });
cpSync('.next/static', '.next/standalone/.next/static', { recursive: true });

for (const directory of ['migrations','scripts','src/lib']) cpSync(directory,`.next/standalone/${directory}`,{recursive:true});
