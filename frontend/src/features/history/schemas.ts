import { z } from 'zod'
import { OptionalNonNegativeNumber, OptionalWholeNumber, RequiredString } from '@/common/schema/schemas'

/** Flat validation view of the flood-event form. */
export const FloodEventSchema = z
    .object({
        barangay: RequiredString('Barangay'),
        occurred_at: RequiredString('Occurred-at time'),
        ended_at: z.string(),
        source_type: z.enum(['operator', 'third_party']),
        source: z.string(),
        reported_by: z.number().nullable(),
        flood_depth: OptionalNonNegativeNumber('Flood depth'),
        peak_rainfall: OptionalNonNegativeNumber('Peak rainfall'),
        people_affected: OptionalWholeNumber('People affected'),
        people_evacuated: OptionalWholeNumber('People evacuated'),
    })
    .refine(
        (d) => !d.ended_at || !d.occurred_at || new Date(d.ended_at) >= new Date(d.occurred_at),
        { message: 'Must be at or after the start time.', path: ['ended_at'] },
    )
    .refine((d) => d.source_type !== 'operator' || d.reported_by != null, {
        message: 'Select the reporting operator.',
        path: ['reported_by'],
    })
    .refine((d) => d.source_type !== 'third_party' || d.source.trim() !== '', {
        message: 'Name the third-party source.',
        path: ['source'],
    })
