import { Schema, type Types } from 'mongoose'
import { defineModel } from './_shared'

/**
 * Server-side session. Only an HMAC of the cookie token is stored, so a
 * database leak does not expose usable session tokens.
 */
export interface ISession {
  _id: Types.ObjectId
  tokenHash: string
  user: Types.ObjectId
  expiresAt: Date
  userAgent?: string
  ip?: string
  createdAt: Date
  updatedAt: Date
}

const sessionSchema = new Schema<ISession>(
  {
    tokenHash: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    expiresAt: { type: Date, required: true },
    userAgent: { type: String, maxlength: 300 },
    ip: { type: String, maxlength: 64 },
  },
  { timestamps: true },
)

// MongoDB deletes expired sessions automatically.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const Session = defineModel<ISession>('Session', sessionSchema)
