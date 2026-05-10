import Database, { type Database as BetterSqliteDb } from 'better-sqlite3';
import type { LocalLibraryConfig } from '@home-archive/shared';

export type HomeArchiveDb = BetterSqliteDb;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS families (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id),
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','family','guest')),
  invite_accepted_at TEXT
);

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id),
  uploaded_by TEXT NOT NULL,
  uploaded_at TEXT NOT NULL,
  taken_at TEXT,
  place TEXT,
  memo TEXT,
  original_path TEXT NOT NULL,
  thumbnail_path TEXT,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  ai_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_photos_family_uploaded
  ON photos (family_id, uploaded_at DESC);

CREATE TABLE IF NOT EXISTS ai_summaries (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id),
  generated_at TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  provider_kind TEXT NOT NULL DEFAULT 'mock',
  model TEXT NOT NULL DEFAULT 'mock-family-summary-v1',
  prompt_version TEXT NOT NULL DEFAULT 'mock-monthly-summary-v1',
  scope_type TEXT NOT NULL DEFAULT 'custom',
  scope_id TEXT NOT NULL DEFAULT 'legacy',
  photo_count INTEGER NOT NULL DEFAULT 0,
  result_json TEXT NOT NULL DEFAULT '{}'
);
`;

const DEFAULT_FAMILY_ID = 'family-default';

const AI_SUMMARY_MIGRATIONS = [
  ["provider_kind", "ALTER TABLE ai_summaries ADD COLUMN provider_kind TEXT NOT NULL DEFAULT 'mock'"],
  ["model", "ALTER TABLE ai_summaries ADD COLUMN model TEXT NOT NULL DEFAULT 'mock-family-summary-v1'"],
  ["prompt_version", "ALTER TABLE ai_summaries ADD COLUMN prompt_version TEXT NOT NULL DEFAULT 'mock-monthly-summary-v1'"],
  ["scope_type", "ALTER TABLE ai_summaries ADD COLUMN scope_type TEXT NOT NULL DEFAULT 'custom'"],
  ["scope_id", "ALTER TABLE ai_summaries ADD COLUMN scope_id TEXT NOT NULL DEFAULT 'legacy'"],
  ["photo_count", "ALTER TABLE ai_summaries ADD COLUMN photo_count INTEGER NOT NULL DEFAULT 0"],
  ["result_json", "ALTER TABLE ai_summaries ADD COLUMN result_json TEXT NOT NULL DEFAULT '{}'"],
] as const;

function migrate(db: HomeArchiveDb): void {
  const columns = db.prepare('PRAGMA table_info(ai_summaries)').all() as Array<{ name: string }>;
  const names = new Set(columns.map((column) => column.name));
  for (const [name, sql] of AI_SUMMARY_MIGRATIONS) {
    if (!names.has(name)) {
      db.exec(sql);
    }
  }
}

function seed(db: HomeArchiveDb): void {
  const now = new Date().toISOString();
  const insertFamily = db.prepare(
    'INSERT OR IGNORE INTO families (id, name, created_at) VALUES (?, ?, ?)'
  );
  insertFamily.run(DEFAULT_FAMILY_ID, '우리집', now);

  const insertMember = db.prepare(
    'INSERT OR IGNORE INTO members (id, family_id, name, role, invite_accepted_at) VALUES (?, ?, ?, ?, ?)'
  );
  insertMember.run('member-owner', DEFAULT_FAMILY_ID, '집주인', 'owner', now);
}

export function openDatabase(cfg: LocalLibraryConfig): HomeArchiveDb {
  const db = new Database(cfg.databasePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  migrate(db);
  seed(db);
  return db;
}

export function getDefaultFamilyId(): string {
  return DEFAULT_FAMILY_ID;
}
