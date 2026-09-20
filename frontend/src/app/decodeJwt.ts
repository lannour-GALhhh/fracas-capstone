/** Minimal, dependency-free reader for the *payload* of a JWT (UI gating only, never trust). */
import type { Role } from '@/common/types/Role'

/** Alias of the canonical {@link Role} for token-facing call sites. */
export type UserRole = Role

export interface JwtClaims {
    user_id?: number
    username?: string
    role?: UserRole
    exp?: number
}

const base64UrlDecode = (segment: string): string => {
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    // decodeURIComponent(escape(...)) rehydrates any UTF-8 bytes atob left raw.
    return decodeURIComponent(escape(atob(padded)))
}

export const decodeJwt = (token: string | null): JwtClaims | null => {
    if (!token) return null
    const payload = token.split('.')[1]
    if (!payload) return null
    try {
        return JSON.parse(base64UrlDecode(payload)) as JwtClaims
    } catch {
        return null
    }
}
