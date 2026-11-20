import { readFile, readdir, realpath, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const EXPECTED_RUNTIME = 'nodejs26.x';

export function assertNode26(version = process.versions.node) {
  if (!/^26\./.test(version)) throw new Error('Node 26 is required. Run nvm use before building.');
}

async function functionConfigs(directory) {
  const root = await realpath(directory);
  const configs = [];
  async function visit(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      if (entry.name.endsWith('.func')) {
        const file = await realpath(path.join(target, '.vc-config.json'));
        if (!file.startsWith(root + path.sep)) throw new Error('Function configuration escapes the deployment directory.');
        configs.push({ file, config: JSON.parse(await readFile(file, 'utf8')) });
      } else if (entry.isDirectory()) {
        await visit(target);
      }
    }
  }
  await visit(root);
  if (!configs.length) throw new Error('No Vercel function configurations were generated.');
  return configs;
}

/** Compatibility for the pinned adapter's stale Node table; never changes vendor files. */
export async function configureNode26(directory = '.vercel/output/functions', version = process.versions.node) {
  assertNode26(version);
  const configs = await functionConfigs(directory);
  for (const { config } of configs) {
    if (!['nodejs24.x', EXPECTED_RUNTIME].includes(config.runtime)) {
      throw new Error('Unexpected function runtime; review the adapter before changing generated metadata.');
    }
  }
  for (const { file, config } of configs) {
    if (config.runtime === EXPECTED_RUNTIME) continue;
    const temporary = file + '.tmp';
    await writeFile(temporary, JSON.stringify({ ...config, runtime: EXPECTED_RUNTIME }, null, 2) + '\n');
    await rename(temporary, file);
  }
  return configs.length;
}

export async function verifyNode26(directory = '.vercel/output/functions') {
  const configs = await functionConfigs(directory);
  if (configs.some(({ config }) => config.runtime !== EXPECTED_RUNTIME)) {
    throw new Error('Deployment requires nodejs26.x for every function. Use pnpm build; do not deploy raw adapter output.');
  }
  return configs.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (process.argv.length === 3 && process.argv[2] === '--check-node') {
      assertNode26();
    } else if (process.argv.length === 2) {
      const count = await configureNode26();
      console.log(`Build Output API compatibility: ${count} function(s) explicitly configured for ${EXPECTED_RUNTIME}.`);
    } else {
      throw new Error('Usage: node tools/vercel-runtime.mjs [--check-node]');
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
