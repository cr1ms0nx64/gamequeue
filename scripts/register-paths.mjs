// Node 24 can strip erasable TypeScript; resolve the same source aliases as Next.
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
registerHooks({resolve(specifier,context,nextResolve){
  if(specifier.startsWith('@/')) {
    const file=new URL('../src/'+specifier.slice(2),import.meta.url);
    for(const suffix of ['.ts','.mjs','/index.ts']) {
      const candidate=new URL(file.href+suffix);if(existsSync(fileURLToPath(candidate)))return nextResolve(candidate.href,context);
    }
  }
  if(specifier==='next/server')return nextResolve('next/server.js',context);
  return nextResolve(specifier,context);
}});
