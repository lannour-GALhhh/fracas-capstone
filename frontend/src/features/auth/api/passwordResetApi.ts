import apiClient from '@/app/apiClient'

/** Ask for a reset link. Always succeeds, whether or not the email has an account. */
export const requestPasswordReset = (email: string) =>
    apiClient.post('/api/auth/password-reset/', { email })

/** Set a new password using the uid + token from the emailed link. */
export const confirmPasswordReset = (payload: { uid: string; token: string; new_password: string }) =>
    apiClient.post('/api/auth/password-reset/confirm/', payload)
