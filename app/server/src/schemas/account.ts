import { z } from 'zod';

/**
 * Account validation schemas
 * Used for validating account-related API requests
 */

// User role enum
export const UserRoleSchema = z.enum(['user', 'admin']);

// Account metadata schema
export const AccountMetadataSchema = z.object({
  avatarUrl: z.string().url().optional(),
  preferences: z.object({
    defaultPreset: z.string().optional(),
    cameraSettings: z.object({
      countdownSeconds: z.number().int().min(0).max(10).optional(),
    }).optional(),
  }).optional(),
  microsoftProfile: z.object({
    jobTitle: z.string().optional(),
    department: z.string().optional(),
  }).optional(),
}).optional();

// Create account schema (internal use)
export const CreateAccountSchema = z.object({
  microsoftId: z.string().min(1),
  email: z.string().email(),
  name: z.string().optional(),
  role: UserRoleSchema.default('user'),
  metadata: AccountMetadataSchema,
});

// Update account role schema (admin operation)
export const UpdateRoleSchema = z.object({
  role: UserRoleSchema,
});

// Update account preferences schema (user operation)
export const UpdatePreferencesSchema = z.object({
  preferences: z.object({
    defaultPreset: z.string().optional(),
    cameraSettings: z.object({
      countdownSeconds: z.number().int().min(0).max(10).optional(),
    }).optional(),
  }),
});

// Session data schema
export const SessionDataSchema = z.object({
  accountId: z.string().uuid(),
  microsoftId: z.string(),
  email: z.string().email(),
  role: UserRoleSchema,
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  tokenExpiry: z.number().optional(),
});

export type CreateAccountInput = z.infer<typeof CreateAccountSchema>;
export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>;
export type UpdatePreferencesInput = z.infer<typeof UpdatePreferencesSchema>;
export type SessionDataInput = z.infer<typeof SessionDataSchema>;
