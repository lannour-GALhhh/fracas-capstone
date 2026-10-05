import * as z from 'zod'
import { RequiredString } from '@/common/schema/schemas'

export const ForgotPasswordSchema = z.object({
    email: z.string().trim().min(1, 'Enter your email').email('Enter a valid email address'),
})

export const ResetPasswordSchema = z
    .object({
        new_password: z.string().min(8, 'Use at least 8 characters'),
        confirm: RequiredString('Confirmation'),
    })
    .refine((d) => d.new_password === d.confirm, {
        message: 'Passwords do not match',
        path: ['confirm'],
    })
