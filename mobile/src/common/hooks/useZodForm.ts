import { useMemo, useState } from 'react'
import type { z } from 'zod'

/** Shape consumed by the `Field` primitive. */
type FieldErrors = { message: string }[]

/**
 * Lightweight Zod validation for controlled forms — ported from the web
 * `useZodForm`, minus the DOM `FormEvent` (RN submit is a plain callback).
 *
 * - errors surface only after a field is blurred/touched or the form is submitted
 * - `fieldError(name)` feeds `<Field errors={...} />`
 * - `handleSubmit(fn)` runs `fn(parsedData)` only when the whole form is valid
 */
export function useZodForm<S extends z.ZodType>(schema: S, values: unknown) {
    const [touched, setTouched] = useState<Record<string, boolean>>({})
    const [submitted, setSubmitted] = useState(false)

    const result = useMemo(() => schema.safeParse(values), [schema, values])
    const fieldErrors = result.success
        ? {}
        : (result.error.flatten().fieldErrors as Record<string, string[] | undefined>)

    const isShown = (name: string) => submitted || !!touched[name]

    /** Errors for one field, or undefined when it shouldn't show yet. */
    const fieldError = (name: string): FieldErrors | undefined => {
        if (!isShown(name)) return undefined
        const messages = fieldErrors[name]
        return messages?.length ? messages.map((message) => ({ message })) : undefined
    }

    /** Blur handler factory: `onBlur={onBlur('phone')}`. */
    const onBlur = (name: string) => () => setTouched((prev) => ({ ...prev, [name]: true }))

    /** Imperatively mark a field touched. */
    const markTouched = (name: string) => setTouched((prev) => ({ ...prev, [name]: true }))

    /** Submit wrapper: reveals all errors, and calls `onValid` only when valid. */
    const handleSubmit = (onValid: (data: z.infer<S>) => void) => () => {
        setSubmitted(true)
        if (result.success) onValid(result.data)
    }

    /** Clear touched/submitted state. */
    const reset = () => {
        setTouched({})
        setSubmitted(false)
    }

    return { fieldError, onBlur, markTouched, handleSubmit, reset, isValid: result.success }
}
