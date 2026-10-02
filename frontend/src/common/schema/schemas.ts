import zod from 'zod';

export const EmailProp = zod.email('Enter a valid email address')
export const UsernameProp = zod.string().nonempty("Username is required")
export const PasswordProp = zod.string().nonempty("Password is required")

/** A trimmed, non-empty string with a labelled "<X> is required" message. */
export const RequiredString = (label: string) =>
    zod.string().trim().min(1, `${label} is required`)

/** Optional phone: empty is allowed, otherwise a loose international format. */
export const PhoneProp = zod
    .string()
    .trim()
    .refine((v) => v === '' || /^\+?\d[\d\s-]{6,}$/.test(v), 'Enter a valid phone number')

/** Optional ZIP: empty is allowed, otherwise 4–5 digits. */
export const ZipProp = zod
    .string()
    .trim()
    .refine((v) => v === '' || /^\d{4,5}$/.test(v), 'ZIP must be 4–5 digits')

/** Optional positive number entered as text: empty allowed, else > 0. */
export const OptionalPositiveNumber = (label: string) =>
    zod
        .string()
        .trim()
        .refine((v) => v === '' || (Number(v) > 0 && !Number.isNaN(Number(v))), `${label} must be a positive number`)

/** Optional non-negative number entered as text (decimals allowed, no exponent). */
export const OptionalNonNegativeNumber = (label: string, max?: number) =>
    zod
        .string()
        .trim()
        .superRefine((v, ctx) => {
            if (v === '') return
            if (!/^\d*\.?\d+$|^\d+\.$/.test(v)) {
                ctx.addIssue({ code: 'custom', message: `${label} must be a number (digits only).` })
            } else if (max !== undefined && Number(v) > max) {
                ctx.addIssue({ code: 'custom', message: `${label} must not exceed ${max}.` })
            }
        })

/** Optional whole number entered as text: empty allowed, else digits only. */
export const OptionalWholeNumber = (label: string) =>
    zod
        .string()
        .trim()
        .refine((v) => v === '' || /^\d+$/.test(v), `${label} must be a whole number (digits only).`)
