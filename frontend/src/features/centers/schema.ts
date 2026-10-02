import { z } from 'zod'
import { RequiredString } from '@/common/schema/schemas'

/** Required coordinate entered as text, bounded to a valid lng/lat range. */
const Coordinate = (label: string, min: number, max: number) =>
    RequiredString(label).refine(
        (v) => {
            const n = Number(v)
            return !Number.isNaN(n) && n >= min && n <= max
        },
        `Enter a valid ${label.toLowerCase()} (${min} to ${max})`,
    )

/** Flat validation view of the evacuation-center form. */
export const CenterSchema = z.object({
    name: RequiredString('Name'),
    latitude: Coordinate('Latitude', -90, 90),
    longitude: Coordinate('Longitude', -180, 180),
    capacity: RequiredString('Capacity').refine(
        (v) => /^\d+$/.test(v),
        'Capacity must be a whole number',
    ),
    contacts: z
        .array(z.object({ label: z.string(), phone: z.string() }))
        // Fully blank rows are dropped on submit; at least one real number is required.
        .refine((rows) => rows.some((r) => r.phone.trim() !== ''), {
            message: 'Add at least one contact phone number',
        })
        .refine((rows) => rows.every((r) => r.phone.trim() !== '' || r.label.trim() === ''), {
            message: 'Every contact with a name needs a phone number',
        }),
})
