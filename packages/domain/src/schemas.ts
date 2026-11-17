import { z } from 'zod';

export const emailSchema = z.string().trim().toLowerCase().email().max(254);

export const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters')
  .max(128)
  .refine((v) => /[a-z]/i.test(v) && /\d/.test(v), 'Include letters and a number');

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: emailSchema,
  password: passwordSchema,
  church: z.string().trim().max(120).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
  /** False on a shared computer: the session ends when the browser closes and lasts at most a day. */
  remember: z.boolean().default(true),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  church?: string;
  /** A small picture, as a data URL. Set by the person, shown on their own screens. */
  avatar?: string;
  createdAt: string;
}

export const forgotPasswordSchema = z.object({ email: emailSchema });
export const resetPasswordSchema = z.object({ token: z.string().min(20).max(200), password: passwordSchema });
/** Pictures are shrunk on the device first. Only these types, never SVG, which can carry script. */
export const AVATAR_MAX_CHARS = 80_000;
export const avatarSchema = z
  .string()
  .max(AVATAR_MAX_CHARS)
  .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/, 'The picture must be a JPEG, PNG or WebP image');

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    church: z.string().trim().max(120).nullable().optional(),
    /** null removes the picture. */
    avatar: avatarSchema.nullable().optional(),
  })
  .refine((v) => v.name !== undefined || v.church !== undefined || v.avatar !== undefined, { message: 'Nothing to change' });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const renameDeviceSchema = z.object({ name: z.string().trim().min(1).max(60) });
export const deleteAccountSchema = z.object({ password: z.string().min(1).max(128) });
