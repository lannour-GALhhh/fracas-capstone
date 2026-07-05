import axios from 'axios'

/**
 * Extract a human-readable message from an API error. Prefers DRF's `{detail}`,
 * then the first field error, then a fallback.
 */
export function apiErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data as Record<string, unknown> | undefined
        if (typeof data?.detail === 'string') return data.detail
        if (data && typeof data === 'object') {
            const first = Object.values(data)[0]
            if (Array.isArray(first) && typeof first[0] === 'string') return first[0]
            if (typeof first === 'string') return first
        }
    }
    return fallback
}
