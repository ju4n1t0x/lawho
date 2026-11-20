import { mkdtemp, mkdir, rm, writeFile, symlink } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { findTestArtifacts } from './check-deployment.mjs';

describe('deployment artifact inspection', () => {
  it('rejects tests and test tools including through runtime symlinks', async () => {
    const dir = await mkdtemp('/tmp/opencode/deployment-check-');
    try {
      await mkdir(`${dir}/output/static`, { recursive: true });
      await writeFile(`${dir}/output/static/index.html`, '<h1>Production</h1>');
      expect(await findTestArtifacts(`${dir}/output`)).toEqual([]);
      await writeFile(`${dir}/output/static/example.test.js`, 'test');
      await mkdir(`${dir}/tooling/vitest`, { recursive: true });
      await mkdir(`${dir}/tooling/typescript`, { recursive: true });
      await symlink(`${dir}/tooling`, `${dir}/output/node_modules`);
      expect(await findTestArtifacts(`${dir}/output`)).toEqual(expect.arrayContaining(['static/example.test.js', 'node_modules/vitest', 'node_modules/typescript']));
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
});
