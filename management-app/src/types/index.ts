/**
 * Shared TypeScript type definitions for the application
 */

// Component Props
export interface ImageUploaderProps {
  folderName?: string;
  onUploadComplete?: () => void;
}

export interface FileListProps {
  folderName: string;
  refreshTrigger: number;
}

export interface ConfigPanelProps {
  side: string;
}

export interface LoginProps {
  onLoginSuccess: () => void;
}

export interface TwoSidesUploaderProps {
  leftFolder: string;
  rightFolder: string;
}

// API Response Types
export interface FileListResponse {
  files: string[];
}

export interface ConfigResponse {
  secondsBetweenImages: number;
}

export interface UpdateCheckResponse {
  updatesAvailable: boolean;
}

export interface UpdateResultResponse {
  success: boolean;
  message: string;
}

export interface DeleteFileResponse {
  success: boolean;
}

export interface RebootResponse {
  message: string;
}

export interface LoginResponse {
  success: boolean;
}

// File upload types
export type FileStatus = 'pending' | 'uploading' | 'done';

export interface UploadProgress {
  percent: number;
}
