import { z } from 'zod'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Editable profile fields (flat view for validation). Email and ZIP are
 * optional — many residents register phone-first without either — but must be
 * well-formed when present. Mirrors the web console's `ProfileSchema`, minus the
 * phone field (read-only in the resident app).
 */
export const profileSchema = z.object({
    first_name: z.string().trim().min(1, 'First name is required'),
    last_name: z.string().trim().min(1, 'Last name is required'),
    email: z.string().refine((v) => v === '' || EMAIL_RE.test(v), 'Enter a valid email'),
    zip_code: z.string().refine((v) => v === '' || /^\d{4}$/.test(v), 'Enter a 4-digit ZIP'),
})

/** Change-password form. Min length stays lenient (backend is source of truth). */
export const passwordChangeSchema = z
    .object({
        current_password: z.string().min(1, 'Enter your current password'),
        new_password: z.string().min(6, 'Use at least 6 characters'),
        confirm: z.string(),
    })
    .refine((v) => v.new_password === v.confirm, {
        message: 'Passwords do not match',
        path: ['confirm'],
    })

export type ProfileValues = z.infer<typeof profileSchema>
export type PasswordChangeValues = z.infer<typeof passwordChangeSchema>
