import { lstat, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { verifyNode26 } from './vercel-runtime.mjs';

const forbidden = /(?:^|\/)(?:__tests__|fixtures|coverage|vitest|@vitest|typescript|@types)(?:\/|$)|\.(?:test|spec)\.[^/]+$|\.tsbuildinfo$|(?:^|\/)\.env(?:\.|$)/;

export async function findTestArtifacts(directory) {
  const visited = new Set();
  const matches = [];
  async function visit(current, relative) {
    if (forbidden.test(relative)) { matches.push(relative); return; }
    const resolved = await realpath(current);
    if (visited.has(resolved)) return;
    visited.add(resolved);
    const info = await lstat(resolved);
    if (info.isDirectory()) {
      for (const name of await readdir(resolved)) await visit(path.join(resolved, name), path.posix.join(relative, name));
    }
  }
  await visit(directory, '');
  return matches;
}

export async function checkDeployment(directory = '.vercel/output') {
  const matches = await findTestArtifacts(directory);
  if (matches.length) throw new Error(`Deployment contains forbidden artifacts:\n${matches.join('\n')}`);
  await verifyNode26(path.join(directory, 'functions'));
  console.log('Deployment verified: Node 26 only; no tests, fixtures, coverage, environment files or test-only tooling.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  checkDeployment().catch(error => { console.error(error.message); process.exitCode = 1; });
}
