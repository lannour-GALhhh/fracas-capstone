import { z } from 'zod'

import { normalizePhone } from '@/common/utils/phone'

export const phoneSchema = z.object({
    phone: z
        .string()
        .refine((value) => normalizePhone(value) !== null, 'Enter a valid mobile number'),
})

// The two documents are accepted separately, so consent to each is recorded on
// its own rather than bundled behind a single tick.
export const verifySchema = z.object({
    code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
    acceptedTerms: z.boolean().refine((v) => v, 'Please accept the Terms of Use to continue'),
    acceptedPrivacy: z
        .boolean()
        .refine((v) => v, 'Please accept the Privacy Policy to continue'),
})

export const passwordSchema = z
    .object({
        password: z.string().min(6, 'Use at least 6 characters'),
        confirm: z.string(),
    })
    .refine((v) => v.password === v.confirm, {
        message: 'Passwords do not match',
        path: ['confirm'],
    })

export type PhoneValues = z.infer<typeof phoneSchema>
export type VerifyValues = z.infer<typeof verifySchema>
export type PasswordValues = z.infer<typeof passwordSchema>
