import { z } from 'zod'

import { normalizePhone } from '@/common/utils/phone'

export const phoneSchema = z.object({
    phone: z
        .string()
        .refine((value) => normalizePhone(value) !== null, 'Enter a valid mobile number'),
})

export const verifySchema = z.object({
    code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
    acceptedTerms: z.boolean().refine((v) => v, 'Please accept the terms to continue'),
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
