import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import exifr from 'exifr';
import sharp from 'sharp';
import type {
  AiAnalysisStatus,
  LocalLibraryConfig,
  PhotoSummary,
  StoredPhoto,
  UploadPhotoResponse
} from '@home-archive/shared';
import { getDefaultFamilyId, type HomeArchiveDb } from './db.js';

export const ALLOWED_PHOTO_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif'
]);

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif'
};

function datePartsToIso(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0
): string | undefined {
  const d = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function normalizeExifDate(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return datePartsToIso(
      value.getFullYear(),
      value.getMonth() + 1,
      value.getDate(),
      value.getHours(),
      value.getMinutes(),
      value.getSeconds()
    );
  }

  if (typeof value === 'string') {
    const m = value.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
    if (m) {
      return datePartsToIso(
        Number(m[1]),
        Number(m[2]),
        Number(m[3]),
        Number(m[4]),
        Number(m[5]),
        Number(m[6])
      );
    }
  }

  return undefined;
}

async function extractTakenAtFromExif(
  bytes: Buffer,
  mimeType: string
): Promise<string | undefined> {
  if (!['image/jpeg', 'image/heic', 'image/heif'].includes(mimeType)) return undefined;

  try {
    const exif = (await exifr.parse(bytes, {
      pick: ['DateTimeOriginal', 'CreateDate', 'ModifyDate']
    })) as Record<string, unknown> | undefined;

    return (
      normalizeExifDate(exif?.DateTimeOriginal) ??
      normalizeExifDate(exif?.CreateDate) ??
      normalizeExifDate(exif?.ModifyDate)
    );
  } catch {
    return undefined;
  }
}

export interface SavePhotoInput {
  uploadedBy: string;
  memo?: string;
  takenAt?: string;
  place?: string;
  mimeType: string;
  bytes: Buffer;
}

export interface PhotoMedia {
  bytes: Buffer;
  mimeType: string;
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

async function createThumbnail(
  cfg: LocalLibraryConfig,
  bytes: Buffer,
  photoId: string,
  yyyy: string,
  mm: string
): Promise<string | undefined> {
  try {
    const dir = path.join(cfg.thumbnailsDir, yyyy, mm);
    await mkdir(dir, { recursive: true });
    const thumbnailPath = path.join(dir, `${photoId}-thumb.webp`);
    await sharp(bytes, { failOn: 'none' })
      .rotate()
      .resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(thumbnailPath);
    return thumbnailPath;
  } catch {
    return undefined;
  }
}

export async function savePhoto(
  cfg: LocalLibraryConfig,
  db: HomeArchiveDb,
  input: SavePhotoInput
): Promise<StoredPhoto> {
  if (!ALLOWED_PHOTO_MIME.has(input.mimeType)) {
    throw new UploadError(`unsupported mime type: ${input.mimeType}`);
  }
  if (!input.uploadedBy || input.uploadedBy.trim().length === 0) {
    throw new UploadError('uploadedBy is required');
  }

  const id = `photo-${randomUUID()}`;
  const uploadedAt = new Date().toISOString();
  const extractedTakenAt = input.takenAt
    ? undefined
    : await extractTakenAtFromExif(input.bytes, input.mimeType);
  const effectiveTakenAt = input.takenAt ?? extractedTakenAt;
  const taken = effectiveTakenAt ? new Date(effectiveTakenAt) : null;
  const dateForFolder = taken && !Number.isNaN(taken.getTime()) ? taken : new Date(uploadedAt);
  const yyyy = dateForFolder.getUTCFullYear().toString();
  const mm = pad2(dateForFolder.getUTCMonth() + 1);
  const ext = MIME_EXT[input.mimeType] ?? 'bin';
  const dir = path.join(cfg.originalsDir, yyyy, mm);
  await mkdir(dir, { recursive: true });
  const originalPath = path.join(dir, `${id}-original.${ext}`);
  await writeFile(originalPath, input.bytes);
  const thumbnailPath = await createThumbnail(cfg, input.bytes, id, yyyy, mm);

  const sha256 = createHash('sha256').update(input.bytes).digest('hex');
  const familyId = getDefaultFamilyId();
  const aiStatus: AiAnalysisStatus = 'pending';

  db.prepare(
    `INSERT INTO photos (
      id, family_id, uploaded_by, uploaded_at, taken_at, place, memo,
      original_path, thumbnail_path, mime_type, byte_size, sha256, ai_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    familyId,
    input.uploadedBy,
    uploadedAt,
    effectiveTakenAt ?? null,
    input.place ?? null,
    input.memo ?? null,
    originalPath,
    thumbnailPath ?? null,
    input.mimeType,
    input.bytes.length,
    sha256,
    aiStatus
  );

  return {
    id,
    familyId,
    uploadedBy: input.uploadedBy,
    uploadedAt,
    takenAt: effectiveTakenAt,
    place: input.place,
    memo: input.memo,
    originalPath,
    thumbnailPath,
    mimeType: input.mimeType,
    byteSize: input.bytes.length,
    sha256,
    aiStatus
  };
}

export function toUploadResponse(photo: StoredPhoto): UploadPhotoResponse {
  return {
    id: photo.id,
    uploadedBy: photo.uploadedBy,
    uploadedAt: photo.uploadedAt,
    originalPath: photo.originalPath,
    thumbnailPath: photo.thumbnailPath,
    memo: photo.memo,
    takenAt: photo.takenAt,
    place: photo.place,
    mimeType: photo.mimeType,
    byteSize: photo.byteSize,
    aiStatus: photo.aiStatus
  };
}

export interface PhotoRow {
  id: string;
  family_id: string;
  uploaded_by: string;
  uploaded_at: string;
  taken_at: string | null;
  place: string | null;
  memo: string | null;
  original_path: string;
  thumbnail_path: string | null;
  mime_type: string;
  byte_size: number;
  sha256: string;
  ai_status: string;
}

export function rowToPhotoSummary(row: PhotoRow): PhotoSummary {
  return {
    id: row.id,
    takenAt: row.taken_at ?? row.uploaded_at,
    thumbnailPath: row.thumbnail_path ?? row.original_path,
    caption: row.memo ?? undefined,
    people: [],
    place: row.place ?? undefined
  };
}

export async function getPhotoMedia(
  cfg: LocalLibraryConfig,
  db: HomeArchiveDb,
  photoId: string,
  kind: 'original' | 'thumbnail'
): Promise<PhotoMedia | null> {
  const row = db
    .prepare('SELECT * FROM photos WHERE id = ?')
    .get(photoId) as PhotoRow | undefined;
  if (!row) return null;

  const selectedPath = kind === 'thumbnail' ? row.thumbnail_path : row.original_path;
  const filePath = selectedPath ?? row.original_path;
  const resolved = path.resolve(filePath);
  const root = path.resolve(cfg.rootDir);
  if (!resolved.startsWith(`${root}${path.sep}`)) return null;

  try {
    await stat(resolved);
    const bytes = await readFile(resolved);
    return {
      bytes,
      mimeType: kind === 'thumbnail' && selectedPath ? 'image/webp' : row.mime_type
    };
  } catch {
    return null;
  }
}

export class UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UploadError';
  }
}
