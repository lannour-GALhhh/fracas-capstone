import * as z from 'zod'
import { RequiredString } from '@/common/schema/schemas'

export const ActivationSchema = z
    .object({
        username: z
            .string()
            .trim()
            .min(3, 'Use at least 3 characters')
            .max(150, 'Use 150 characters or fewer')
            .regex(/^[\w.@+-]+$/, 'Letters, numbers and @ . + - _ only'),
        new_password: z.string().min(8, 'Use at least 8 characters'),
        confirm: RequiredString('Confirmation'),
    })
    .refine((d) => d.new_password === d.confirm, {
        message: 'Passwords do not match',
        path: ['confirm'],
    })
