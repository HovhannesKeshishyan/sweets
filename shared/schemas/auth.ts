import { z } from 'zod'
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../constants'
import { addressSchema, emailSchema, nameSchema, phoneSchema } from './fields'

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Use at most ${PASSWORD_MAX_LENGTH} characters`)

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
})

export const loginSchema = z.object({
  email: emailSchema,
  // Length-capped only: login must not reveal password rules or burn CPU on huge inputs.
  password: z.string().min(1, 'Required').max(PASSWORD_MAX_LENGTH),
})

/** Fields a customer may change on their own profile. Email and role are not editable here. */
export const profileUpdateSchema = z
  .object({
    name: nameSchema,
    phone: phoneSchema.nullable(),
    defaultAddress: addressSchema.nullable(),
  })
  .partial()

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
