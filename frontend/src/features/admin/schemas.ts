import { z } from 'zod'
import { PhoneProp, RequiredString, ZipProp } from '@/common/schema/schemas'

/** New-account form: contact + location; credentials are system-generated on submit. */
export const CreateUserSchema = z.object({
    first_name: RequiredString('First name'),
    last_name: RequiredString('Last name'),
    email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
    phone_number: PhoneProp.refine((v) => v !== '', 'Phone number is required'),
    street: RequiredString('Street'),
    province: RequiredString('Province'),
    city: RequiredString('City'),
    barangay: RequiredString('Barangay'),
    zip_code: ZipProp.refine((v) => v !== '', 'Zip code is required'),
})

/** Scoring config form: mirrors RiskConfig.clean() ordering/weight rules. */
export const RiskConfigSchema = z
    .object({
        name: RequiredString('Name'),
        combination_mode: z.enum(['rainfall_gated', 'weighted_sum']),
        zone_aggregation: z.enum(['mean', 'max', 'area_weighted']),
        rainfall: z.coerce.number('Enter a number').min(0).max(1),
        susceptibility: z.coerce.number('Enter a number').min(0).max(1),
        medium: z.coerce.number('Enter a number').gt(0),
        high: z.coerce.number('Enter a number').gt(0),
        critical: z.coerce.number('Enter a number').gt(0),
    })
    .refine(
        (data) =>
            data.combination_mode !== 'weighted_sum' ||
            Math.abs(data.rainfall + data.susceptibility - 1) < 1e-6,
        {
            message: 'Rainfall + susceptibility must sum to 1.0',
            path: ['susceptibility'],
        },
    )
    .refine((data) => data.medium < data.high, {
        message: 'Medium must be less than high',
        path: ['medium'],
    })
    .refine((data) => data.high < data.critical, {
        message: 'High must be less than critical',
        path: ['high'],
    })
