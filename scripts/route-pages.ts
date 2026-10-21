import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';
import { ROUTES } from '../src/routes.ts';

/**
 * GitHub Pages has no SPA fallback. Copy index.html to every route path so
 * deep links load with a 200, and to 404.html for anything else.
 */
export function routePages(): Plugin {
  let outDir = 'dist';
  return {
    name: 'route-pages',
    apply: 'build',
    configResolved(config) {
      outDir = join(config.root, config.build.outDir);
    },
    writeBundle() {
      const index = join(outDir, 'index.html');
      if (!existsSync(index)) this.error(`route-pages: ${index} was not written`);
      for (const { path } of ROUTES) {
        if (path === '/') continue;
        const dir = join(outDir, path);
        mkdirSync(dir, { recursive: true });
        copyFileSync(index, join(dir, 'index.html'));
      }
      copyFileSync(index, join(outDir, '404.html'));
    },
  };
}
