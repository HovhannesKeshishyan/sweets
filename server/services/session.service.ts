import { createHmac, randomBytes } from "node:crypto"
import type { Types } from "mongoose"
import { Session, User, type IUser } from "../db/models"

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
/** Extend a session once less than this much lifetime remains (rolling sessions). */
const RENEW_THRESHOLD_MS = 15 * 24 * 60 * 60 * 1000

/** 256-bit random token, URL-safe. Sent to the browser only in an HTTP-only cookie. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url")
}

/** Keyed hash of a token; this is the only form stored in the database. */
export function hashToken(token: string, secret: string): string {
  return createHmac("sha256", secret).update(token).digest("base64url")
}

export interface SessionMeta {
  userAgent?: string
  ip?: string
}

export async function createSession(userId: Types.ObjectId, secret: string, meta: SessionMeta = {}) {
  const token = generateToken()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  await Session.create({
    tokenHash: hashToken(token, secret),
    user: userId,
    expiresAt,
    userAgent: meta.userAgent?.slice(0, 300),
    ip: meta.ip?.slice(0, 64),
  })
  return { token, expiresAt }
}

export type SessionUser = Pick<IUser, "_id" | "email" | "name" | "role">

export interface ResolvedSession {
  user: SessionUser
  expiresAt: Date
  /** True when the expiry was extended and the cookie should be re-issued. */
  renewed: boolean
}

/** Looks up a session by cookie token. Expired sessions and inactive users resolve to null. */
export async function resolveSession(token: string, secret: string): Promise<ResolvedSession | null> {
  if (!token || token.length > 128) return null

  const session = await Session.findOne({ tokenHash: hashToken(token, secret) }).lean()
  if (!session) return null

  const now = Date.now()
  if (session.expiresAt.getTime() <= now) {
    await Session.deleteOne({ _id: session._id })
    return null
  }

  const user = await User.findOne({ _id: session.user, isActive: true }).select("email name role").lean()
  if (!user) {
    await Session.deleteOne({ _id: session._id })
    return null
  }

  let expiresAt = session.expiresAt
  let renewed = false
  if (expiresAt.getTime() - now < RENEW_THRESHOLD_MS) {
    expiresAt = new Date(now + SESSION_TTL_MS)
    await Session.updateOne({ _id: session._id }, { $set: { expiresAt } })
    renewed = true
  }

  return { user: { _id: user._id, email: user.email, name: user.name, role: user.role }, expiresAt, renewed }
}

export async function revokeSession(token: string, secret: string): Promise<void> {
  if (!token) return
  await Session.deleteOne({ tokenHash: hashToken(token, secret) })
}

export async function revokeAllUserSessions(userId: Types.ObjectId): Promise<void> {
  await Session.deleteMany({ user: userId })
}
