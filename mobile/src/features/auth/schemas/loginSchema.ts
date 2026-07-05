import { z } from 'zod'

import { normalizePhone } from '@/common/utils/phone'

export const loginSchema = z.object({
    phone: z
        .string()
        .refine((value) => normalizePhone(value) !== null, 'Enter a valid mobile number'),
    password: z.string().min(1, 'Password is required'),
})

export type LoginValues = z.infer<typeof loginSchema>
