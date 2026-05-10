import type { PhotoSummary } from './photo.js';
import type { AiProvider } from './ai-provider.js';

export interface FamilyMember {
  id: string;
  name: string;
  role: 'owner' | 'family' | 'guest';
  inviteAcceptedAt?: string;
}

export interface AiHighlight {
  id: string;
  generatedAt: string;
  title: string;
  body: string;
  providerId: string;
  providerKind: AiProvider['kind'];
  scopeType: 'week' | 'month' | 'custom';
  scopeId: string;
  photoCount: number;
}

export interface GenerateMonthlySummaryRequest {
  month: string;
}

export type GenerateMonthlySummaryResponse = AiHighlight;

export interface FamilyTimelineDay {
  date: string;
  label: string;
  title: string;
  photoCount: number;
  place?: string;
  coverPhotoIds: string[];
}

export interface FamilyTimelineMonth {
  month: string;
  label: string;
  photoCount: number;
  dayCount: number;
  coverPhotos: PhotoSummary[];
  days: FamilyTimelineDay[];
}

export interface LibraryHome {
  householdName: string;
  recentPhotos: PhotoSummary[];
  highlights: AiHighlight[];
  family: FamilyMember[];
  providers: AiProvider[];
  timelineMonths: FamilyTimelineMonth[];
}

export interface LocalLibraryConfig {
  rootDir: string;
  configDir: string;
  databaseDir: string;
  databasePath: string;
  originalsDir: string;
  thumbnailsDir: string;
  exportsDir: string;
  backupsDir: string;
}
