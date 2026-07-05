/**
 * Dependency-free reader for a JWT *payload*. The access token is verified
 * server-side; the client only reads claims (e.g. `role`) to drive UI gating,
 * never to make a trust decision. Returns `null` for anything malformed.
 *
 * Decodes base64url → UTF-8 by hand (no `atob`/`Buffer`, which aren't reliably
 * present in the RN/Hermes runtime).
 */
import type { Role } from '@/common/types/Role'

export interface JwtClaims {
    user_id?: number
    username?: string
    role?: Role
    exp?: number
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function base64UrlToBytes(input: string): number[] {
    const b64 = input.replace(/-/g, '+').replace(/_/g, '/')
    const bytes: number[] = []
    let buffer = 0
    let bits = 0
    for (const ch of b64) {
        if (ch === '=') break
        const idx = B64.indexOf(ch)
        if (idx === -1) continue
        buffer = (buffer << 6) | idx
        bits += 6
        if (bits >= 8) {
            bits -= 8
            bytes.push((buffer >> bits) & 0xff)
        }
    }
    return bytes
}

function utf8Decode(bytes: number[]): string {
    let result = ''
    let i = 0
    while (i < bytes.length) {
        const b = bytes[i++]
        if (b < 0x80) {
            result += String.fromCharCode(b)
        } else if (b < 0xe0) {
            result += String.fromCharCode(((b & 0x1f) << 6) | (bytes[i++] & 0x3f))
        } else if (b < 0xf0) {
            result += String.fromCharCode(
                ((b & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f),
            )
        } else {
            const cp =
                ((b & 0x07) << 18) |
                ((bytes[i++] & 0x3f) << 12) |
                ((bytes[i++] & 0x3f) << 6) |
                (bytes[i++] & 0x3f)
            const c = cp - 0x10000
            result += String.fromCharCode(0xd800 + (c >> 10), 0xdc00 + (c & 0x3ff))
        }
    }
    return result
}

export const decodeJwt = (token: string | null): JwtClaims | null => {
    if (!token) return null
    const payload = token.split('.')[1]
    if (!payload) return null
    try {
        return JSON.parse(utf8Decode(base64UrlToBytes(payload))) as JwtClaims
    } catch {
        return null
    }
}
