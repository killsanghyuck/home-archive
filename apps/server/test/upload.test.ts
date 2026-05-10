import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm, readFile, stat, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../src/server.js';
import { initLibraryConfig } from '../src/local-library.js';
import { openDatabase, type HomeArchiveDb } from '../src/db.js';

const tinyJpeg = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9
]);

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
  'base64'
);

function exifJpegWithDateTimeOriginal(value: string): Buffer {
  const text = Buffer.from(`${value}\0`, 'ascii');
  const tiff = Buffer.alloc(8 + 2 + 12 + 4 + 2 + 12 + 4 + text.length);
  let offset = 0;
  tiff.write('II', offset, 'ascii');
  offset += 2;
  tiff.writeUInt16LE(42, offset);
  offset += 2;
  tiff.writeUInt32LE(8, offset);
  offset += 4;

  tiff.writeUInt16LE(1, offset);
  offset += 2;
  tiff.writeUInt16LE(0x8769, offset); // ExifIFDPointer
  offset += 2;
  tiff.writeUInt16LE(4, offset); // LONG
  offset += 2;
  tiff.writeUInt32LE(1, offset);
  offset += 4;
  tiff.writeUInt32LE(26, offset);
  offset += 4;
  tiff.writeUInt32LE(0, offset);
  offset += 4;

  tiff.writeUInt16LE(1, offset);
  offset += 2;
  tiff.writeUInt16LE(0x9003, offset); // DateTimeOriginal
  offset += 2;
  tiff.writeUInt16LE(2, offset); // ASCII
  offset += 2;
  tiff.writeUInt32LE(text.length, offset);
  offset += 4;
  tiff.writeUInt32LE(44, offset);
  offset += 4;
  tiff.writeUInt32LE(0, offset);
  offset += 4;
  text.copy(tiff, offset);

  const exif = Buffer.concat([Buffer.from('Exif\0\0', 'ascii'), tiff]);
  const app1 = Buffer.alloc(4);
  app1[0] = 0xff;
  app1[1] = 0xe1;
  app1.writeUInt16BE(exif.length + 2, 2);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app1, exif, Buffer.from([0xff, 0xd9])]);
}

function multipart(
  boundary: string,
  fields: Record<string, string>,
  file?: { name: string; filename: string; mime: string; data: Buffer }
): Buffer {
  const parts: Buffer[] = [];
  for (const [key, value] of Object.entries(fields)) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`
      )
    );
  }
  if (file) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${file.name}"; filename="${file.filename}"\r\nContent-Type: ${file.mime}\r\n\r\n`
      )
    );
    parts.push(file.data);
    parts.push(Buffer.from('\r\n'));
  }
  parts.push(Buffer.from(`--${boundary}--\r\n`));
  return Buffer.concat(parts);
}

describe('POST /api/photos', () => {
  let workspace: string;
  let app: FastifyInstance;
  let db: HomeArchiveDb;

  beforeEach(async () => {
    workspace = await mkdtemp(path.join(tmpdir(), 'homearchive-upload-'));
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

  it('rejects requests without a file', async () => {
    const boundary = '----xboundaryNoFile';
    const body = multipart(boundary, { uploadedBy: '엄마', memo: 'hi' });
    const res = await app.inject({
      method: 'POST',
      url: '/api/photos',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: body
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects non-image MIME types', async () => {
    const boundary = '----xboundaryBadMime';
    const body = multipart(
      boundary,
      { uploadedBy: '엄마', memo: '메모' },
      {
        name: 'photo',
        filename: 'note.txt',
        mime: 'text/plain',
        data: Buffer.from('hello')
      }
    );
    const res = await app.inject({
      method: 'POST',
      url: '/api/photos',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: body
    });
    expect(res.statusCode).toBe(400);
  });

  it('accepts a JPEG and stores it under originals/YYYY/MM/', async () => {
    const boundary = '----xboundaryJpeg';
    const body = multipart(
      boundary,
      {
        uploadedBy: '엄마',
        memo: '준이의 첫 자전거',
        takenAt: '2026-05-08T14:00:00Z',
        place: '동네 공원'
      },
      {
        name: 'photo',
        filename: 'walk.jpg',
        mime: 'image/jpeg',
        data: tinyJpeg
      }
    );

    const res = await app.inject({
      method: 'POST',
      url: '/api/photos',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: body
    });

    expect(res.statusCode).toBe(201);
    const json = res.json();
    expect(json.id).toBeTruthy();
    expect(json.uploadedBy).toBe('엄마');
    expect(json.memo).toBe('준이의 첫 자전거');
    expect(json.aiStatus).toBe('pending');
    expect(json.mimeType).toBe('image/jpeg');
    expect(json.byteSize).toBe(tinyJpeg.length);
    expect(json.originalPath).toMatch(/originals\/2026\/05\//);
    expect(json.originalPath.endsWith('-original.jpg')).toBe(true);

    const onDisk = await readFile(json.originalPath);
    expect(onDisk.equals(tinyJpeg)).toBe(true);
    const s = await stat(json.originalPath);
    expect(s.size).toBe(tinyJpeg.length);

    const row = db
      .prepare('SELECT * FROM photos WHERE id = ?')
      .get(json.id) as { id: string; sha256: string; mime_type: string };
    expect(row.id).toBe(json.id);
    expect(row.mime_type).toBe('image/jpeg');
    expect(row.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('makes the uploaded photo appear in /api/library recentPhotos', async () => {
    const boundary = '----xboundaryRecent';
    const body = multipart(
      boundary,
      {
        uploadedBy: '아빠',
        memo: '저녁 식탁'
      },
      {
        name: 'photo',
        filename: 'dinner.jpg',
        mime: 'image/jpeg',
        data: tinyJpeg
      }
    );

    const upload = await app.inject({
      method: 'POST',
      url: '/api/photos',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: body
    });
    expect(upload.statusCode).toBe(201);
    const uploaded = upload.json();

    const lib = await app.inject({ method: 'GET', url: '/api/library' });
    expect(lib.statusCode).toBe(200);
    const home = lib.json();
    const found = home.recentPhotos.find(
      (p: { id: string }) => p.id === uploaded.id
    );
    expect(found).toBeTruthy();
    expect(found.caption).toBe('저녁 식탁');
  });

  it('extracts EXIF DateTimeOriginal as takenAt when the client does not provide a takenAt field', async () => {
    const boundary = '----xboundaryExifDate';
    const exifJpeg = exifJpegWithDateTimeOriginal('2024:12:31 12:34:56');
    const body = multipart(
      boundary,
      { uploadedBy: '엄마', memo: 'EXIF 촬영일 테스트' },
      {
        name: 'photo',
        filename: 'from-camera.jpg',
        mime: 'image/jpeg',
        data: exifJpeg
      }
    );

    const res = await app.inject({
      method: 'POST',
      url: '/api/photos',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: body
    });

    expect(res.statusCode).toBe(201);
    const json = res.json();
    expect(json.takenAt).toBe('2024-12-31T12:34:56.000Z');
    expect(json.originalPath).toMatch(/originals\/2024\/12\//);

    const row = db
      .prepare('SELECT taken_at FROM photos WHERE id = ?')
      .get(json.id) as { taken_at: string };
    expect(row.taken_at).toBe('2024-12-31T12:34:56.000Z');
  });

  it('creates a webp thumbnail when an uploaded image can be decoded', async () => {
    const boundary = '----xboundaryThumb';
    const body = multipart(
      boundary,
      { uploadedBy: '엄마', memo: '썸네일 테스트', takenAt: '2026-05-09T10:00:00Z' },
      {
        name: 'photo',
        filename: 'thumb-source.png',
        mime: 'image/png',
        data: tinyPng
      }
    );

    const res = await app.inject({
      method: 'POST',
      url: '/api/photos',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: body
    });

    expect(res.statusCode).toBe(201);
    const json = res.json();
    expect(json.thumbnailPath).toMatch(/thumbnails\/2026\/05\//);
    expect(json.thumbnailPath.endsWith('-thumb.webp')).toBe(true);

    const thumb = await readFile(json.thumbnailPath);
    expect(thumb.subarray(0, 4).toString('ascii')).toBe('RIFF');
    expect(thumb.subarray(8, 12).toString('ascii')).toBe('WEBP');
  });

  it('serves original and thumbnail bytes through photo media APIs without exposing file paths', async () => {
    const boundary = '----xboundaryMedia';
    const body = multipart(
      boundary,
      { uploadedBy: '아빠', memo: '미디어 API 테스트' },
      {
        name: 'photo',
        filename: 'media.png',
        mime: 'image/png',
        data: tinyPng
      }
    );

    const upload = await app.inject({
      method: 'POST',
      url: '/api/photos',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: body
    });
    expect(upload.statusCode).toBe(201);
    const uploaded = upload.json();

    const original = await app.inject({
      method: 'GET',
      url: `/api/photos/${uploaded.id}/original`
    });
    expect(original.statusCode).toBe(200);
    expect(original.headers['content-type']).toContain('image/png');
    expect(original.rawPayload.equals(tinyPng)).toBe(true);

    const thumbnail = await app.inject({
      method: 'GET',
      url: `/api/photos/${uploaded.id}/thumbnail`
    });
    expect(thumbnail.statusCode).toBe(200);
    expect(thumbnail.headers['content-type']).toContain('image/webp');
    expect(thumbnail.rawPayload.subarray(0, 4).toString('ascii')).toBe('RIFF');
  });

  it('deletes a photo row and removes its local original and thumbnail files', async () => {
    const boundary = '----xboundaryDelete';
    const body = multipart(
      boundary,
      { uploadedBy: '엄마', memo: '삭제할 사진', takenAt: '2026-05-09T10:00:00Z' },
      {
        name: 'photo',
        filename: 'delete-source.png',
        mime: 'image/png',
        data: tinyPng
      }
    );

    const upload = await app.inject({
      method: 'POST',
      url: '/api/photos',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: body
    });
    expect(upload.statusCode).toBe(201);
    const uploaded = upload.json();
    await expect(access(uploaded.originalPath)).resolves.toBeUndefined();
    await expect(access(uploaded.thumbnailPath)).resolves.toBeUndefined();

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/photos/${uploaded.id}`
    });
    expect(res.statusCode).toBe(204);

    const row = db.prepare('SELECT id FROM photos WHERE id = ?').get(uploaded.id);
    expect(row).toBeUndefined();
    await expect(access(uploaded.originalPath)).rejects.toThrow();
    await expect(access(uploaded.thumbnailPath)).rejects.toThrow();

    const lib = await app.inject({ method: 'GET', url: '/api/library' });
    expect(lib.statusCode).toBe(200);
    expect(lib.json().recentPhotos.some((p: { id: string }) => p.id === uploaded.id)).toBe(false);
  });

  it('returns 404 when deleting a missing photo', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/photos/photo-missing'
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 for missing photo media', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/photos/photo-missing/thumbnail'
    });
    expect(res.statusCode).toBe(404);
  });
});
