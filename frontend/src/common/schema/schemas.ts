import zod from 'zod';

export const EmailProp = zod.email()
export const UsernameProp = zod.string().nonempty("Username is required")
export const PasswordProp = zod.string().nonempty("Password is required")
