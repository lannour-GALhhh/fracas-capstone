import { z } from 'zod'
import { PhoneProp, RequiredString } from '@/common/schema/schemas'

/** New-account form: username + a system password (no email flow exists yet). */
export const CreateUserSchema = z.object({
    username: RequiredString('Username'),
    password: z.string().trim().min(8, 'Password must be at least 8 characters'),
    first_name: z.string().trim(),
    last_name: z.string().trim(),
    email: z.union([z.literal(''), z.string().trim().email('Enter a valid email address')]),
    phone_number: PhoneProp,
})

/** Scoring config form: a flat shape so field-level errors map 1:1 to inputs.
 * Mirrors RiskConfig.clean() on the backend — weights sum to 1.0, thresholds
 * strictly ordered medium < high < critical. */
export const RiskConfigSchema = z
    .object({
        name: RequiredString('Name'),
        rainfall: z.coerce.number('Enter a number').min(0).max(1),
        susceptibility: z.coerce.number('Enter a number').min(0).max(1),
        medium: z.coerce.number('Enter a number').gt(0),
        high: z.coerce.number('Enter a number').gt(0),
        critical: z.coerce.number('Enter a number').gt(0),
    })
    .refine((data) => Math.abs(data.rainfall + data.susceptibility - 1) < 1e-6, {
        message: 'Rainfall + susceptibility must sum to 1.0',
        path: ['susceptibility'],
    })
    .refine((data) => data.medium < data.high, {
        message: 'Medium must be less than high',
        path: ['medium'],
    })
    .refine((data) => data.high < data.critical, {
        message: 'High must be less than critical',
        path: ['high'],
    })
