import { randomUUID } from 'node:crypto';
import type { AiHighlight } from '@home-archive/shared';
import { getDefaultFamilyId, type HomeArchiveDb } from './db.js';
import { rowToPhotoSummary, type PhotoRow } from './photos.js';

const MOCK_PROVIDER = {
  id: 'mock-local',
  kind: 'mock' as const,
  model: 'mock-family-summary-v1',
  promptVersion: 'mock-monthly-summary-v1'
};

export class AiSummaryError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
  }
}

function validateMonth(month: string): void {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new AiSummaryError('month must be YYYY-MM', 400);
  }
}

function monthLabel(month: string): string {
  const [year, monthNumber] = month.split('-');
  return `${year}년 ${Number(monthNumber)}월`;
}

function unique(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))));
}

function buildMockBody(month: string, photos: PhotoRow[]): string {
  const places = unique(photos.map((photo) => photo.place));
  const memos = unique(photos.map((photo) => photo.memo));
  const people = unique(photos.map((photo) => photo.uploaded_by));
  const placeText = places.length > 0 ? `${places.slice(0, 3).join(', ')}에서의 순간이 돋보이고` : '장소 정보는 아직 적지만';
  const memoText = memos.length > 0 ? ` '${memos.slice(0, 2).join("', '")}' 같은 메모가 남아 있어요.` : ' 가족이 남긴 메모를 더하면 이야기가 더 풍성해져요.';
  const peopleText = people.length > 0 ? ` ${people.slice(0, 3).join(', ')}이 올린 기록을 바탕으로 정리했어요.` : '';

  return `${monthLabel(month)}에는 ${photos.length}장의 사진이 기록됐어요. ${placeText},${memoText}${peopleText} 실제 AI 연결 전까지는 로컬 Mock Provider가 사진 메타데이터만으로 안전하게 요약합니다.`;
}

export function generateMonthlySummary(db: HomeArchiveDb, month: string): AiHighlight {
  validateMonth(month);
  const familyId = getDefaultFamilyId();
  const photos = db
    .prepare(
      `SELECT id, family_id, uploaded_by, uploaded_at, taken_at, place, memo,
              original_path, thumbnail_path, mime_type, byte_size, sha256, ai_status
       FROM photos
       WHERE family_id = ? AND substr(COALESCE(taken_at, uploaded_at), 1, 7) = ?
       ORDER BY datetime(COALESCE(taken_at, uploaded_at)) ASC`
    )
    .all(familyId, month) as PhotoRow[];

  if (photos.length === 0) {
    throw new AiSummaryError(`no photos found for month: ${month}`, 404);
  }

  const generatedAt = new Date().toISOString();
  const summary: AiHighlight = {
    id: `summary-${randomUUID()}`,
    generatedAt,
    title: `${monthLabel(month)} 우리집 요약`,
    body: buildMockBody(month, photos),
    providerId: MOCK_PROVIDER.id,
    providerKind: MOCK_PROVIDER.kind,
    scopeType: 'month',
    scopeId: month,
    photoCount: photos.length
  };

  const resultJson = JSON.stringify({
    month,
    photoCount: photos.length,
    places: unique(photos.map((photo) => photo.place)),
    memos: unique(photos.map((photo) => photo.memo)),
    photos: photos.map(rowToPhotoSummary)
  });

  db.prepare(
    `DELETE FROM ai_summaries
     WHERE family_id = ? AND provider_id = ? AND scope_type = 'month' AND scope_id = ?`
  ).run(familyId, MOCK_PROVIDER.id, month);

  db.prepare(
    `INSERT INTO ai_summaries (
      id, family_id, generated_at, title, body, provider_id, provider_kind,
      model, prompt_version, scope_type, scope_id, photo_count, result_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    summary.id,
    familyId,
    summary.generatedAt,
    summary.title,
    summary.body,
    summary.providerId,
    summary.providerKind,
    MOCK_PROVIDER.model,
    MOCK_PROVIDER.promptVersion,
    summary.scopeType,
    summary.scopeId,
    summary.photoCount,
    resultJson
  );

  return summary;
}
