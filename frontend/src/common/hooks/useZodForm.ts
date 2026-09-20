import { useMemo, useState } from 'react'
import type { z } from 'zod'

/** Shape consumed by the `FieldError` primitive. */
type FieldErrors = { message: string }[]

/** Zod validation for controlled forms: on-blur + on-submit error reveal. */
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

    /** Blur handler factory: `onBlur={onBlur('email')}`. */
    const onBlur = (name: string) => () => setTouched((prev) => ({ ...prev, [name]: true }))

    /** Imperatively mark a field touched (e.g. from a Select's onValueChange). */
    const markTouched = (name: string) => setTouched((prev) => ({ ...prev, [name]: true }))

    /** Submit wrapper: reveals all errors, and calls `onValid` only when valid. */
    const handleSubmit =
        (onValid: (data: z.infer<S>) => void) => (event?: React.FormEvent) => {
            event?.preventDefault()
            setSubmitted(true)
            if (result.success) onValid(result.data)
        }

    /** Clear touched/submitted state (e.g. when a dialog reopens). */
    const reset = () => {
        setTouched({})
        setSubmitted(false)
    }

    return { fieldError, onBlur, markTouched, handleSubmit, reset, isValid: result.success }
}
