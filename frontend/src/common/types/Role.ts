/** Canonical console role, mirroring the backend `User.role` / JWT `role` claim. */
export const ROLES = {
    resident: "resident",
    operator: "operator",
    admin: "admin",
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]
