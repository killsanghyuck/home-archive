import { describe, it, expectTypeOf, expect } from 'vitest';
import type {
  AiProvider,
  HealthResponse,
  LibraryHome,
  LocalLibraryConfig,
  PhotoSummary,
  StoredPhoto,
  UploadPhotoResponse
} from '../src/index.js';

describe('shared types', () => {
  it('HealthResponse has the expected literal shape', () => {
    const value: HealthResponse = {
      ok: true,
      app: '우리집 기록관',
      mode: 'local-first'
    };
    expectTypeOf(value.app).toEqualTypeOf<'우리집 기록관'>();
    expectTypeOf(value.mode).toEqualTypeOf<'local-first'>();
  });

  it('AiProvider supports the three known kinds', () => {
    const provider: AiProvider = {
      id: 'p1',
      kind: 'claude',
      label: 'Claude',
      model: 'claude-opus-4-7',
      status: 'disconnected'
    };
    expectTypeOf(provider.kind).toEqualTypeOf<'claude' | 'openai' | 'ollama'>();
  });

  it('LibraryHome aggregates photos, providers, family, highlights', () => {
    const photo: PhotoSummary = {
      id: 'photo-1',
      takenAt: '2026-05-01T10:00:00Z',
      thumbnailPath: '/thumbs/photo-1.jpg',
      people: []
    };
    const home: LibraryHome = {
      householdName: '우리집',
      recentPhotos: [photo],
      highlights: [],
      family: [],
      providers: []
    };
    expectTypeOf(home.recentPhotos).toEqualTypeOf<PhotoSummary[]>();
  });

  it('LocalLibraryConfig describes the local storage layout', () => {
    const cfg: LocalLibraryConfig = {
      rootDir: '/tmp/HomeArchiveLibrary',
      configDir: '/tmp/HomeArchiveLibrary/config',
      databaseDir: '/tmp/HomeArchiveLibrary/database',
      databasePath: '/tmp/HomeArchiveLibrary/database/homearchive.sqlite',
      originalsDir: '/tmp/HomeArchiveLibrary/originals',
      thumbnailsDir: '/tmp/HomeArchiveLibrary/thumbnails',
      exportsDir: '/tmp/HomeArchiveLibrary/exports',
      backupsDir: '/tmp/HomeArchiveLibrary/backups'
    };
    expect(cfg.databasePath.endsWith('.sqlite')).toBe(true);
  });

  it('StoredPhoto and UploadPhotoResponse expose the AI status pipeline', () => {
    const stored: StoredPhoto = {
      id: 'photo-1',
      familyId: 'family-1',
      uploadedBy: '엄마',
      uploadedAt: '2026-05-10T10:00:00Z',
      originalPath: '/abs/originals/2026/05/photo-1-original.jpg',
      mimeType: 'image/jpeg',
      byteSize: 1024,
      sha256: 'abc',
      aiStatus: 'pending'
    };
    const response: UploadPhotoResponse = {
      id: stored.id,
      uploadedBy: stored.uploadedBy,
      uploadedAt: stored.uploadedAt,
      originalPath: stored.originalPath,
      mimeType: stored.mimeType,
      byteSize: stored.byteSize,
      aiStatus: 'pending'
    };
    expectTypeOf(response.aiStatus).toEqualTypeOf<
      'pending' | 'processing' | 'done' | 'error'
    >();
  });
});
