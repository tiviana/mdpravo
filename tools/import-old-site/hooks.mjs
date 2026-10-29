import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const ROOT = process.env.OLD_ROOT;
export async function resolve(spec, ctx, next) {
  if (spec.startsWith('@/')) spec = pathToFileURL(path.join(ROOT, spec.slice(2))).href;
  if ((spec.startsWith('.') || spec.startsWith('file:')) && ctx.parentURL) {
    const base = spec.startsWith('file:') ? fileURLToPath(spec) : path.resolve(path.dirname(fileURLToPath(ctx.parentURL)), spec);
    for (const ext of ['', '.ts', '.tsx', '/index.ts']) {
      const p = base + ext;
      if (existsSync(p) && !p.endsWith('/')) { try { if ((await import('node:fs')).statSync(p).isFile()) return next(pathToFileURL(p).href, ctx); } catch {} }
    }
  }
  return next(spec, ctx);
}
