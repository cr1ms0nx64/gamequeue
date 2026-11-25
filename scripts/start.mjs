import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { migrate } from '../src/lib/db/migrate.ts';
await migrate();
const server=existsSync('server.js')?'server.js':'.next/standalone/server.js';
await import(pathToFileURL(resolve(server)).href);
