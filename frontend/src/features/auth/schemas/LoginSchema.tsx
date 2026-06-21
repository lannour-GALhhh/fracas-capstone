import { UsernameProp, PasswordProp } from "@/common/schema/schemas";
import * as z from 'zod'

export const LoginSchema = z.object({
    username: UsernameProp,
    password: PasswordProp
})

export type LoginSchemaType = z.infer<typeof LoginSchema>