import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { initLibraryConfig } from '../src/local-library.js';
import { openDatabase, type HomeArchiveDb } from '../src/db.js';

describe('openDatabase', () => {
  let workspace: string;
  let db: HomeArchiveDb;

  beforeEach(async () => {
    workspace = await mkdtemp(path.join(tmpdir(), 'homearchive-db-'));
    const cfg = await initLibraryConfig({ rootDir: workspace });
    db = openDatabase(cfg);
  });

  afterEach(async () => {
    db.close();
    await rm(workspace, { recursive: true, force: true });
  });

  it('creates the four core tables on first open', () => {
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      )
      .all() as Array<{ name: string }>;
    const names = tables.map((t) => t.name);
    expect(names).toContain('families');
    expect(names).toContain('members');
    expect(names).toContain('photos');
    expect(names).toContain('ai_summaries');
  });

  it('seeds at least one family and one member', () => {
    const families = db.prepare('SELECT * FROM families').all() as Array<{
      id: string;
      name: string;
    }>;
    expect(families.length).toBeGreaterThan(0);
    const members = db.prepare('SELECT * FROM members').all() as Array<{
      id: string;
      family_id: string;
      name: string;
    }>;
    expect(members.length).toBeGreaterThan(0);
    expect(members[0]?.family_id).toBe(families[0]?.id);
  });

  it('is idempotent — re-opening the same DB does not duplicate seeds', () => {
    const before = db.prepare('SELECT COUNT(*) AS c FROM families').get() as {
      c: number;
    };
    db.close();
    const cfg = {
      rootDir: workspace,
      configDir: path.join(workspace, 'config'),
      databaseDir: path.join(workspace, 'database'),
      databasePath: path.join(workspace, 'database', 'homearchive.sqlite'),
      originalsDir: path.join(workspace, 'originals'),
      thumbnailsDir: path.join(workspace, 'thumbnails'),
      exportsDir: path.join(workspace, 'exports'),
      backupsDir: path.join(workspace, 'backups')
    };
    db = openDatabase(cfg);
    const after = db.prepare('SELECT COUNT(*) AS c FROM families').get() as {
      c: number;
    };
    expect(after.c).toBe(before.c);
  });
});
