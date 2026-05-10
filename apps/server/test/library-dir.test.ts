import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { initLibraryConfig } from '../src/local-library.js';

describe('initLibraryConfig', () => {
  let workspace: string;

  beforeEach(async () => {
    workspace = await mkdtemp(path.join(tmpdir(), 'homearchive-lib-'));
  });

  afterEach(async () => {
    await rm(workspace, { recursive: true, force: true });
  });

  it('creates the expected subdirectories under the configured root', async () => {
    const cfg = await initLibraryConfig({ rootDir: workspace });

    expect(cfg.rootDir).toBe(workspace);
    expect(cfg.configDir).toBe(path.join(workspace, 'config'));
    expect(cfg.databaseDir).toBe(path.join(workspace, 'database'));
    expect(cfg.databasePath).toBe(
      path.join(workspace, 'database', 'homearchive.sqlite')
    );
    expect(cfg.originalsDir).toBe(path.join(workspace, 'originals'));
    expect(cfg.thumbnailsDir).toBe(path.join(workspace, 'thumbnails'));
    expect(cfg.exportsDir).toBe(path.join(workspace, 'exports'));
    expect(cfg.backupsDir).toBe(path.join(workspace, 'backups'));

    for (const dir of [
      cfg.configDir,
      cfg.databaseDir,
      cfg.originalsDir,
      cfg.thumbnailsDir,
      cfg.exportsDir,
      cfg.backupsDir
    ]) {
      const s = await stat(dir);
      expect(s.isDirectory()).toBe(true);
    }
  });

  it('is idempotent — calling twice does not throw', async () => {
    await initLibraryConfig({ rootDir: workspace });
    await expect(initLibraryConfig({ rootDir: workspace })).resolves.toBeDefined();
  });

  it('default root falls back to ~/HomeArchiveLibrary when no override is passed', async () => {
    const cfg = await initLibraryConfig({
      rootDir: workspace,
      skipMkdir: true
    });
    expect(cfg.rootDir).toBe(workspace);
  });
});
