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
  provider_id TEXT NOT NULL
);
`;

const DEFAULT_FAMILY_ID = 'family-default';

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
  seed(db);
  return db;
}

export function getDefaultFamilyId(): string {
  return DEFAULT_FAMILY_ID;
}
