import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../src/server.js';
import { initLibraryConfig } from '../src/local-library.js';
import { openDatabase, type HomeArchiveDb } from '../src/db.js';

describe('GET /api/library', () => {
  let app: FastifyInstance;
  let workspace: string;
  let db: HomeArchiveDb;

  beforeAll(async () => {
    workspace = await mkdtemp(path.join(tmpdir(), 'homearchive-lib-api-'));
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

  it('returns the family home payload with photos, family, providers, and timeline months', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/library' });
    expect(response.statusCode).toBe(200);
    const body = response.json();

    expect(body.householdName).toBeTypeOf('string');
    expect(Array.isArray(body.recentPhotos)).toBe(true);
    expect(Array.isArray(body.highlights)).toBe(true);
    expect(Array.isArray(body.family)).toBe(true);
    expect(Array.isArray(body.providers)).toBe(true);
    expect(Array.isArray(body.timelineMonths)).toBe(true);

    expect(body.family.length).toBeGreaterThan(0);
    expect(body.providers.length).toBeGreaterThan(0);
    const claudeProvider = body.providers.find(
      (p: { kind: string }) => p.kind === 'claude'
    );
    expect(claudeProvider).toBeDefined();
  });

  it('groups family timeline by actual taken_at date instead of upload order', async () => {
    db.prepare(
      `INSERT INTO photos (
        id, family_id, uploaded_by, uploaded_at, taken_at, place, memo,
        original_path, thumbnail_path, mime_type, byte_size, sha256, ai_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      'photo-old-taken',
      'family-default',
      '엄마',
      '2026-05-10T08:00:00.000Z',
      '2024-12-31T12:34:56.000Z',
      '거실',
      '연말 가족 사진',
      `${workspace}/originals/2024/12/photo-old-taken-original.jpg`,
      `${workspace}/thumbnails/2024/12/photo-old-taken-thumb.webp`,
      'image/jpeg',
      10,
      'a'.repeat(64),
      'pending'
    );
    db.prepare(
      `INSERT INTO photos (
        id, family_id, uploaded_by, uploaded_at, taken_at, place, memo,
        original_path, thumbnail_path, mime_type, byte_size, sha256, ai_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      'photo-new-taken',
      'family-default',
      '아빠',
      '2026-05-10T09:00:00.000Z',
      '2025-01-02T09:00:00.000Z',
      '부엌',
      '새해 아침',
      `${workspace}/originals/2025/01/photo-new-taken-original.jpg`,
      `${workspace}/thumbnails/2025/01/photo-new-taken-thumb.webp`,
      'image/jpeg',
      10,
      'b'.repeat(64),
      'pending'
    );

    const response = await app.inject({ method: 'GET', url: '/api/library' });
    expect(response.statusCode).toBe(200);
    const body = response.json();

    expect(body.timelineMonths[0]).toMatchObject({
      month: '2025-01',
      label: '2025년 1월',
      photoCount: 1,
      dayCount: 1
    });
    expect(body.timelineMonths[0].days[0]).toMatchObject({
      date: '2025-01-02',
      title: '새해 아침',
      photoCount: 1,
      place: '부엌'
    });
    expect(body.timelineMonths[1]).toMatchObject({
      month: '2024-12',
      label: '2024년 12월'
    });
  });
});
