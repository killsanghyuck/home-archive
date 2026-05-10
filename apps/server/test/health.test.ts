import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../src/server.js';
import { initLibraryConfig } from '../src/local-library.js';
import { openDatabase, type HomeArchiveDb } from '../src/db.js';

describe('GET /api/health', () => {
  let app: FastifyInstance;
  let workspace: string;
  let db: HomeArchiveDb;

  beforeAll(async () => {
    workspace = await mkdtemp(path.join(tmpdir(), 'homearchive-health-'));
    const cfg = await initLibraryConfig({ rootDir: workspace });
    db = openDatabase(cfg);
    app = await buildServer({ libraryConfig: cfg, db });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    db.close();
    await rm(workspace, { recursive: true, force: true });
  });

  it('returns local-first health payload', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/health' });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toMatchObject({
      ok: true,
      app: '우리집 기록관',
      mode: 'local-first'
    });
  });
});
