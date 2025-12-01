// PresetType is now a string to support dynamic presets from database
export type PresetType = string;

// User roles
export type UserRole = 'user' | 'admin';

// Authentication providers
export type AuthProvider = 'microsoft' | 'google';

// Account types
export interface Account {
  id: string;
  microsoftId?: string; // Optional - for Microsoft OAuth
  googleId?: string; // Optional - for Google OAuth
  email: string;
  name?: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  metadata?: AccountMetadata;
  photosTaken: number; // Cumulative counter of photos taken (never decreases)
}

export interface AccountMetadata {
  avatarUrl?: string;
  preferences?: UserPreferences;
  microsoftProfile?: {
    jobTitle?: string;
    department?: string;
  };
  googleProfile?: {
    picture?: string;
    locale?: string;
  };
  lastAuthProvider?: AuthProvider;
}

export interface UserPreferences {
  defaultPreset?: string;
  cameraSettings?: {
    countdownSeconds?: number;
  };
}

// Session data structure
export interface SessionData {
  accountId: string;
  email: string;
  role: UserRole;
  authProvider: AuthProvider;
  // Provider-specific IDs
  microsoftId?: string;
  googleId?: string;
  // Tokens (primarily for Microsoft)
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: number;
}

export interface Photo {
  id: string;
  createdAt: Date;
  preset: PresetType; // Validated against database at runtime
  originalPath: string;
  transformedPath?: string;
  provider?: string;
  processingTime?: number;
  metadata?: Record<string, any>;
  status: PhotoStatus;
  accountId?: string; // Optional for backward compatibility during migration
  account?: Partial<Account>; // Optional populated account data
}

export type PhotoStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface TransformInput {
  photoId?: string;
  originalPath?: string;
  outputPath?: string;
  preset: PresetType; // Validated against database at runtime
  buffer?: Buffer;
  options?: TransformOptions;
}

export interface TransformOptions {
  strength?: number;  // 0-1, how strong the effect should be
  seed?: number;      // For reproducible results
}

export interface TransformResult {
  transformedPath?: string;
  buffer: Buffer;
  provider: string;
  duration: number;
  meta?: Record<string, any>;
}

export interface ProviderCapabilities {
  maxImageSize: number;
  supportedFormats: string[];
  supportedPresets: PresetType[]; // Dynamic list from database
  estimatedProcessingTime: {
    min: number;
    max: number;
  };
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  retry?: boolean;
}

// User photo limit information
export interface UserPhotoLimitInfo {
  used: number;
  limit: number | null; // null = unlimited (admin)
  remaining: number | null; // null = unlimited
  isLimitReached: boolean;
}