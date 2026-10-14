import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { runBarangayTest } from '../api/barangayTestApi'

const detail = (error: unknown): string | undefined => {
    const data = (error as { response?: { data?: Record<string, unknown> } })?.response?.data
    if (!data) return undefined
    const first = data.detail ?? Object.values(data)[0]
    return Array.isArray(first) ? String(first[0]) : typeof first === 'string' ? first : undefined
}

/** Run one per-barangay CSV test; the result lives on the mutation, nothing is cached. */
export const useBarangayTest = () =>
    useMutation({
        mutationFn: runBarangayTest,
        onError: (error: unknown) =>
            toast.error("Couldn't run the test", {
                description: detail(error) ?? 'Check the CSV and try again.',
            }),
    })
