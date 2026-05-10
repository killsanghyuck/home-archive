import { mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import type { LocalLibraryConfig } from '@home-archive/shared';

export interface InitLibraryOptions {
  rootDir?: string;
  skipMkdir?: boolean;
}

export function defaultLibraryRoot(): string {
  const fromEnv = process.env.HOME_ARCHIVE_LIBRARY_DIR;
  if (fromEnv && fromEnv.trim().length > 0) return path.resolve(fromEnv);
  return path.join(homedir(), 'HomeArchiveLibrary');
}

export function describeLibraryConfig(rootDir: string): LocalLibraryConfig {
  const root = path.resolve(rootDir);
  const databaseDir = path.join(root, 'database');
  return {
    rootDir: root,
    configDir: path.join(root, 'config'),
    databaseDir,
    databasePath: path.join(databaseDir, 'homearchive.sqlite'),
    originalsDir: path.join(root, 'originals'),
    thumbnailsDir: path.join(root, 'thumbnails'),
    exportsDir: path.join(root, 'exports'),
    backupsDir: path.join(root, 'backups')
  };
}

export async function initLibraryConfig(
  options: InitLibraryOptions = {}
): Promise<LocalLibraryConfig> {
  const root = options.rootDir ?? defaultLibraryRoot();
  const cfg = describeLibraryConfig(root);

  if (options.skipMkdir) return cfg;

  for (const dir of [
    cfg.rootDir,
    cfg.configDir,
    cfg.databaseDir,
    cfg.originalsDir,
    cfg.thumbnailsDir,
    cfg.exportsDir,
    cfg.backupsDir
  ]) {
    await mkdir(dir, { recursive: true });
  }
  return cfg;
}
