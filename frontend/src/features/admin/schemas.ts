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
