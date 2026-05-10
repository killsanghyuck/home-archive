import Fastify, { type FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import type {
  HealthResponse,
  LibraryHome,
  LocalLibraryConfig,
  UploadPhotoResponse,
  GenerateMonthlySummaryRequest,
  GenerateMonthlySummaryResponse
} from '@home-archive/shared';
import { getLibraryHome } from './library-data.js';
import { initLibraryConfig } from './local-library.js';
import { openDatabase, type HomeArchiveDb } from './db.js';
import {
  ALLOWED_PHOTO_MIME,
  getPhotoMedia,
  savePhoto,
  toUploadResponse,
  UploadError
} from './photos.js';
import { AiSummaryError, generateMonthlySummary } from './ai-summary.js';

export interface BuildServerOptions {
  libraryConfig?: LocalLibraryConfig;
  db?: HomeArchiveDb;
}

const MAX_PHOTO_BYTES = 50 * 1024 * 1024;

export async function buildServer(
  options: BuildServerOptions = {}
): Promise<FastifyInstance> {
  const cfg = options.libraryConfig ?? (await initLibraryConfig());
  const db = options.db ?? openDatabase(cfg);

  const app = Fastify({ logger: false });
  await app.register(multipart, {
    limits: { fileSize: MAX_PHOTO_BYTES, files: 1 }
  });

  app.addHook('onClose', async () => {
    if (!options.db) {
      db.close();
    }
  });

  app.get('/api/health', async (): Promise<HealthResponse> => ({
    ok: true,
    app: '우리집 기록관',
    mode: 'local-first',
    version: '0.1.0'
  }));

  app.get('/api/library', async (): Promise<LibraryHome> => getLibraryHome(db));

  app.post('/api/ai/monthly-summary', async (request, reply) => {
    try {
      const body = request.body as Partial<GenerateMonthlySummaryRequest> | undefined;
      const summary: GenerateMonthlySummaryResponse = generateMonthlySummary(db, body?.month ?? '');
      reply.code(201);
      return summary;
    } catch (err) {
      if (err instanceof AiSummaryError) {
        reply.code(err.statusCode);
        return { error: err.message };
      }
      throw err;
    }
  });

  app.get('/api/photos/:id/original', async (request, reply) => {
    const { id } = request.params as { id: string };
    const media = await getPhotoMedia(cfg, db, id, 'original');
    if (!media) {
      reply.code(404);
      return { error: 'photo not found' };
    }
    return reply.type(media.mimeType).send(media.bytes);
  });

  app.get('/api/photos/:id/thumbnail', async (request, reply) => {
    const { id } = request.params as { id: string };
    const media = await getPhotoMedia(cfg, db, id, 'thumbnail');
    if (!media) {
      reply.code(404);
      return { error: 'photo not found' };
    }
    return reply.type(media.mimeType).send(media.bytes);
  });

  app.post('/api/photos', async (request, reply) => {
    let fileBuf: Buffer | null = null;
    let mimeType = '';
    const fields: Record<string, string> = {};

    let parts;
    try {
      parts = request.parts();
    } catch {
      reply.code(400);
      return { error: 'expected multipart/form-data' };
    }

    for await (const part of parts) {
      if (part.type === 'file') {
        if (part.fieldname !== 'photo') {
          await part.toBuffer().catch(() => undefined);
          continue;
        }
        mimeType = part.mimetype;
        fileBuf = await part.toBuffer();
      } else {
        fields[part.fieldname] = String(part.value ?? '');
      }
    }

    if (!fileBuf) {
      reply.code(400);
      return { error: 'photo file is required' };
    }
    if (!ALLOWED_PHOTO_MIME.has(mimeType)) {
      reply.code(400);
      return { error: `unsupported mime type: ${mimeType}` };
    }
    const uploadedBy = fields.uploadedBy?.trim();
    if (!uploadedBy) {
      reply.code(400);
      return { error: 'uploadedBy is required' };
    }

    try {
      const stored = await savePhoto(cfg, db, {
        uploadedBy,
        memo: fields.memo || undefined,
        takenAt: fields.takenAt || undefined,
        place: fields.place || undefined,
        mimeType,
        bytes: fileBuf
      });
      reply.code(201);
      const body: UploadPhotoResponse = toUploadResponse(stored);
      return body;
    } catch (err) {
      if (err instanceof UploadError) {
        reply.code(400);
        return { error: err.message };
      }
      throw err;
    }
  });

  return app;
}
