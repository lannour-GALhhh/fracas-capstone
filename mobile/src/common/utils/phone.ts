/**
 * Normalize a PH mobile number to E.164 `+639XXXXXXXXX`, or return null if
 * invalid. Mirrors the backend `users.services.registration.normalize_phone` so
 * the client sends the exact `username` the account was created with (login is
 * username-based, and residents' username IS their normalized phone).
 */
export function normalizePhone(raw: string): string | null {
    let digits = (raw ?? '').replace(/[\s\-()]/g, '')
    if (digits.startsWith('+63')) digits = digits.slice(3)
    else if (digits.startsWith('63')) digits = digits.slice(2)
    else if (digits.startsWith('0')) digits = digits.slice(1)
    if (!/^9\d{9}$/.test(digits)) return null
    return `+63${digits}`
}
