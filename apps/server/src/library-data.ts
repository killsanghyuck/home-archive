import type { FamilyTimelineMonth, LibraryHome, PhotoSummary } from '@home-archive/shared';
import {
  getDefaultFamilyId,
  type HomeArchiveDb
} from './db.js';
import { rowToPhotoSummary, type PhotoRow } from './photos.js';

const FALLBACK_PROVIDERS = [
  {
    id: 'mock-local',
    kind: 'mock' as const,
    label: 'Mock AI (로컬)',
    model: 'mock-family-summary-v1',
    status: 'connected' as const
  },
  {
    id: 'claude-default',
    kind: 'claude' as const,
    label: 'Claude',
    model: 'claude-opus-4-7',
    status: 'disconnected' as const
  },
  {
    id: 'openai-default',
    kind: 'openai' as const,
    label: 'GPT',
    model: 'gpt-4o',
    status: 'disconnected' as const
  },
  {
    id: 'ollama-local',
    kind: 'ollama' as const,
    label: 'Ollama (로컬)',
    model: 'llama3.2',
    status: 'disconnected' as const
  }
];

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function timelineDate(value: string): Date {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`;
}

function dayKey(d: Date): string {
  return `${monthKey(d)}-${pad2(d.getUTCDate())}`;
}

function monthLabel(d: Date): string {
  return `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월`;
}

function dayLabel(d: Date): string {
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
}

function firstMeaningfulTitle(rows: PhotoRow[]): string {
  const memo = rows.map((r) => r.memo?.trim()).find(Boolean);
  if (memo) return memo;
  const place = rows.map((r) => r.place?.trim()).find(Boolean);
  return place ? `${place}에서 찍은 가족 사진` : '가족 사진';
}

function buildTimelineMonths(rows: PhotoRow[]): FamilyTimelineMonth[] {
  const byMonth = new Map<string, { date: Date; rows: PhotoRow[] }>();

  for (const row of rows) {
    const d = timelineDate(row.taken_at ?? row.uploaded_at);
    const key = monthKey(d);
    const bucket = byMonth.get(key) ?? { date: d, rows: [] };
    bucket.rows.push(row);
    byMonth.set(key, bucket);
  }

  return [...byMonth.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, bucket]) => {
      const byDay = new Map<string, { date: Date; rows: PhotoRow[] }>();
      for (const row of bucket.rows) {
        const d = timelineDate(row.taken_at ?? row.uploaded_at);
        const key = dayKey(d);
        const dayBucket = byDay.get(key) ?? { date: d, rows: [] };
        dayBucket.rows.push(row);
        byDay.set(key, dayBucket);
      }

      const days = [...byDay.entries()]
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([date, dayBucket]) => {
          const place = dayBucket.rows.map((r) => r.place ?? undefined).find(Boolean);
          return {
            date,
            label: dayLabel(dayBucket.date),
            title: firstMeaningfulTitle(dayBucket.rows),
            photoCount: dayBucket.rows.length,
            place,
            coverPhotoIds: dayBucket.rows.slice(0, 4).map((r) => r.id),
            photos: dayBucket.rows.map(rowToPhotoSummary)
          };
        });

      const coverPhotos: PhotoSummary[] = bucket.rows.slice(0, 4).map(rowToPhotoSummary);

      return {
        month,
        label: monthLabel(bucket.date),
        photoCount: bucket.rows.length,
        dayCount: days.length,
        coverPhotos,
        days
      };
    });
}

export function getLibraryHome(db: HomeArchiveDb): LibraryHome {
  const familyId = getDefaultFamilyId();

  const family = db
    .prepare(
      'SELECT id, name, role, invite_accepted_at FROM members WHERE family_id = ? ORDER BY rowid'
    )
    .all(familyId) as Array<{
    id: string;
    name: string;
    role: 'owner' | 'family' | 'guest';
    invite_accepted_at: string | null;
  }>;

  const familyRow = db
    .prepare('SELECT name FROM families WHERE id = ?')
    .get(familyId) as { name: string } | undefined;

  const photos = db
    .prepare(
      `SELECT id, family_id, uploaded_by, uploaded_at, taken_at, place, memo,
              original_path, thumbnail_path, mime_type, byte_size, sha256, ai_status
       FROM photos WHERE family_id = ?
       ORDER BY datetime(uploaded_at) DESC LIMIT 24`
    )
    .all(familyId) as PhotoRow[];

  const timelinePhotos = db
    .prepare(
      `SELECT id, family_id, uploaded_by, uploaded_at, taken_at, place, memo,
              original_path, thumbnail_path, mime_type, byte_size, sha256, ai_status
       FROM photos WHERE family_id = ?
       ORDER BY datetime(COALESCE(taken_at, uploaded_at)) DESC LIMIT 300`
    )
    .all(familyId) as PhotoRow[];

  const recentPhotos: PhotoSummary[] = photos.map(rowToPhotoSummary);

  const summaries = db
    .prepare(
      `SELECT id, generated_at, title, body, provider_id, provider_kind,
              scope_type, scope_id, photo_count
       FROM ai_summaries WHERE family_id = ?
       ORDER BY datetime(generated_at) DESC LIMIT 5`
    )
    .all(familyId) as Array<{
    id: string;
    generated_at: string;
    title: string;
    body: string;
    provider_id: string;
    provider_kind: 'mock' | 'claude' | 'openai' | 'ollama';
    scope_type: 'week' | 'month' | 'custom';
    scope_id: string;
    photo_count: number;
  }>;

  return {
    householdName: familyRow?.name ?? '우리집',
    recentPhotos,
    highlights: summaries.map((s) => ({
      id: s.id,
      generatedAt: s.generated_at,
      title: s.title,
      body: s.body,
      providerId: s.provider_id,
      providerKind: s.provider_kind,
      scopeType: s.scope_type,
      scopeId: s.scope_id,
      photoCount: s.photo_count
    })),
    family: family.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      inviteAcceptedAt: m.invite_accepted_at ?? undefined
    })),
    providers: FALLBACK_PROVIDERS,
    timelineMonths: buildTimelineMonths(timelinePhotos)
  };
}
