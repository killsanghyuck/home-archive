import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../src/server.js';
import { initLibraryConfig } from '../src/local-library.js';
import { openDatabase, type HomeArchiveDb } from '../src/db.js';

function insertPhoto(
  db: HomeArchiveDb,
  workspace: string,
  input: { id: string; takenAt: string; memo: string; place?: string; uploadedBy?: string }
): void {
  db.prepare(
    `INSERT INTO photos (
      id, family_id, uploaded_by, uploaded_at, taken_at, place, memo,
      original_path, thumbnail_path, mime_type, byte_size, sha256, ai_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    input.id,
    'family-default',
    input.uploadedBy ?? '엄마',
    '2026-05-10T09:00:00.000Z',
    input.takenAt,
    input.place ?? null,
    input.memo,
    `${workspace}/originals/${input.id}.jpg`,
    `${workspace}/thumbnails/${input.id}.webp`,
    'image/jpeg',
    10,
    input.id.padEnd(64, '0').slice(0, 64),
    'pending'
  );
}

describe('POST /api/ai/monthly-summary', () => {
  let workspace: string;
  let app: FastifyInstance;
  let db: HomeArchiveDb;

  beforeEach(async () => {
    workspace = await mkdtemp(path.join(tmpdir(), 'homearchive-ai-summary-'));
    const cfg = await initLibraryConfig({ rootDir: workspace });
    db = openDatabase(cfg);
    app = await buildServer({ libraryConfig: cfg, db });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    db.close();
    await rm(workspace, { recursive: true, force: true });
  });

  it('generates and stores a deterministic mock monthly family summary', async () => {
    insertPhoto(db, workspace, {
      id: 'photo-ai-1',
      takenAt: '2024-12-31T12:34:56.000Z',
      memo: '연말 가족 사진',
      place: '거실'
    });
    insertPhoto(db, workspace, {
      id: 'photo-ai-2',
      takenAt: '2024-12-24T08:30:00.000Z',
      memo: '크리스마스 준비',
      place: '부엌',
      uploadedBy: '아빠'
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/ai/monthly-summary',
      payload: { month: '2024-12' }
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body).toMatchObject({
      providerId: 'mock-local',
      providerKind: 'mock',
      scopeType: 'month',
      scopeId: '2024-12',
      photoCount: 2
    });
    expect(body.title).toBe('2024년 12월 우리집 요약');
    expect(body.body).toContain('2장의 사진');
    expect(body.body).toContain('거실');
    expect(body.body).toContain('부엌');
    expect(body.body).toContain('연말 가족 사진');

    const libraryResponse = await app.inject({ method: 'GET', url: '/api/library' });
    const library = libraryResponse.json();
    expect(library.highlights[0]).toMatchObject({
      id: body.id,
      title: '2024년 12월 우리집 요약',
      providerId: 'mock-local',
      scopeType: 'month',
      scopeId: '2024-12',
      photoCount: 2
    });
  });

  it('replaces an existing mock summary for the same month instead of duplicating it', async () => {
    insertPhoto(db, workspace, {
      id: 'photo-ai-repeat',
      takenAt: '2024-12-31T12:34:56.000Z',
      memo: '연말 가족 사진',
      place: '거실'
    });

    const first = await app.inject({
      method: 'POST',
      url: '/api/ai/monthly-summary',
      payload: { month: '2024-12' }
    });
    expect(first.statusCode).toBe(201);

    const second = await app.inject({
      method: 'POST',
      url: '/api/ai/monthly-summary',
      payload: { month: '2024-12' }
    });
    expect(second.statusCode).toBe(201);

    const rows = db
      .prepare("SELECT id FROM ai_summaries WHERE scope_type = 'month' AND scope_id = ?")
      .all('2024-12') as Array<{ id: string }>;
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(second.json().id);
  });

  it('rejects monthly summary generation when the month has no photos', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/ai/monthly-summary',
      payload: { month: '2024-11' }
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: 'no photos found for month: 2024-11' });
  });
});
