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

/**
 * Flat validation view of the evacuation-center form. Coordinates and capacity
 * are the raw input strings; the dialog converts them to numbers on submit.
 */
export const EvacuationSchema = z.object({
    name: RequiredString('Name'),
    latitude: Coordinate('Latitude', -90, 90),
    longitude: Coordinate('Longitude', -180, 180),
    capacity: z
        .string()
        .trim()
        .refine(
            (v) => v === '' || (Number.isInteger(Number(v)) && Number(v) >= 0),
            'Capacity must be a whole number',
        ),
})
