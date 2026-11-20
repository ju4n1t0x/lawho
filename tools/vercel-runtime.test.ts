import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { afterEach, describe, expect, it } from 'vitest';
import { assertNode26, configureNode26, verifyNode26 } from './vercel-runtime.mjs';

const directories: string[] = [];
async function fixture(runtime = 'nodejs24.x') {
  const root = await mkdtemp('/tmp/opencode/node26-runtime-');
  directories.push(root);
  await mkdir(`${root}/nested/render.func`, { recursive: true });
  const file = `${root}/nested/render.func/.vc-config.json`;
  const config = { runtime, handler: 'entry.mjs', launcherType: 'Nodejs', maxDuration: 60 };
  await writeFile(file, JSON.stringify(config));
  return { root, file, config };
}
afterEach(async () => {
  await Promise.all(directories.splice(0).map(directory => rm(directory, { recursive: true, force: true })));
});

describe('explicit Node 26 build output', () => {
  it('fails closed before building under another Node major', () => {
    expect(() => assertNode26('26.13.1')).not.toThrow();
    for (const version of ['24.21.0', '22.0.0', '27.0.0']) expect(() => assertNode26(version)).toThrow('Node 26');
  });
  it('normalizes the known adapter fallback while preserving all other config', async () => {
    const { root, file, config } = await fixture();
    await expect(verifyNode26(root)).rejects.toThrow('nodejs26.x');
    expect(await configureNode26(root, '26.13.1')).toBe(1);
    expect(JSON.parse(await readFile(file, 'utf8'))).toEqual({ ...config, runtime: 'nodejs26.x' });
    expect(await verifyNode26(root)).toBe(1);
    expect(await configureNode26(root, '26.13.1')).toBe(1);
  });
  it('does not rewrite artifacts when the build is using Node 24', async () => {
    const { root, file, config } = await fixture();
    await expect(configureNode26(root, '24.21.0')).rejects.toThrow('Node 26');
    expect(JSON.parse(await readFile(file, 'utf8'))).toEqual(config);
  });
  it.each(['edge', 'nodejs22.x', 'python3.12'])('rejects unexpected runtime %s rather than relabeling it', async (runtime) => {
    const { root, file, config } = await fixture(runtime);
    await expect(configureNode26(root, '26.13.1')).rejects.toThrow('Unexpected');
    expect(JSON.parse(await readFile(file, 'utf8'))).toEqual(config);
    await expect(verifyNode26(root)).rejects.toThrow('nodejs26.x');
  });
  it('rejects output with no functions', async () => {
    const root = await mkdtemp('/tmp/opencode/node26-empty-');
    directories.push(root);
    await expect(configureNode26(root, '26.13.1')).rejects.toThrow('No Vercel');
  });
  it('refuses to modify symlinked config outside the generated functions tree', async () => {
    const { root, file } = await fixture();
    const outside = await mkdtemp('/tmp/opencode/node26-outside-');
    directories.push(outside);
    await mkdir(`${outside}/render.func`);
    await symlink(file, `${outside}/render.func/.vc-config.json`);
    await expect(configureNode26(outside, '26.13.1')).rejects.toThrow('escapes');
  });
});
