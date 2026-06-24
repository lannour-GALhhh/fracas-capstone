const Role = {
    user: "user",
    staff: "staff",
    admin: "admin"
} as const

export type Role = typeof Role[keyof typeof Role]