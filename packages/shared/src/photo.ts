export interface PhotoSummary {
  id: string;
  takenAt: string;
  thumbnailPath: string;
  caption?: string;
  people: string[];
  place?: string;
}

export type AiAnalysisStatus = 'pending' | 'processing' | 'done' | 'error';

export interface StoredPhoto {
  id: string;
  familyId: string;
  uploadedBy: string;
  uploadedAt: string;
  takenAt?: string;
  place?: string;
  memo?: string;
  originalPath: string;
  thumbnailPath?: string;
  mimeType: string;
  byteSize: number;
  sha256: string;
  aiStatus: AiAnalysisStatus;
}

export interface UploadPhotoResponse {
  id: string;
  uploadedBy: string;
  uploadedAt: string;
  originalPath: string;
  thumbnailPath?: string;
  memo?: string;
  takenAt?: string;
  place?: string;
  mimeType: string;
  byteSize: number;
  aiStatus: AiAnalysisStatus;
}
