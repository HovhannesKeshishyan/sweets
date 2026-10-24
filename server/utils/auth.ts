import { randomBytes } from "node:crypto"
import { createError, deleteCookie, getCookie, getHeader, setCookie, type H3Event } from "h3"
import type { Types } from "mongoose"
import {
  createSession,
  resolveSession,
  revokeSession,
  SESSION_TTL_MS,
  type SessionUser,
} from "../services/session.service"

declare module "h3" {
  interface H3EventContext {
    /** Cached per request: undefined = not looked up yet, null = anonymous. */
    sessionUser?: SessionUser | null
  }
}

let devSecret: string | undefined

/** Session signing secret. Required in production; a per-process secret is used in dev. */
export function getSessionSecret(): string {
  const { sessionSecret } = useRuntimeConfig()
  if (sessionSecret && sessionSecret.length >= 32) return sessionSecret
  if (process.env.NODE_ENV === "production") {
    console.error("[auth] NUXT_SESSION_SECRET must be set to at least 32 characters.")
    throw createError({ statusCode: 500, statusMessage: "Server misconfigured" })
  }
  if (!devSecret) {
    devSecret = randomBytes(48).toString("base64url")
    console.warn("[auth] NUXT_SESSION_SECRET not set; using a temporary dev secret (sessions reset on restart).")
  }
  return devSecret
}

function isSecureSite(): boolean {
  return useRuntimeConfig().public.siteUrl.startsWith("https://")
}

/** `__Host-` prefix pins the cookie to this host, HTTPS and path "/". Needs HTTPS. */
export function sessionCookieName(): string {
  return isSecureSite() ? "__Host-mc_session" : "mc_session"
}

function writeSessionCookie(event: H3Event, token: string, expiresAt: Date) {
  setCookie(event, sessionCookieName(), token, {
    httpOnly: true,
    secure: isSecureSite(),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  })
}

export async function startUserSession(event: H3Event, userId: Types.ObjectId) {
  await useDatabase()
  // Drop any existing session token first to prevent session fixation.
  const previous = getCookie(event, sessionCookieName())
  if (previous) await revokeSession(previous, getSessionSecret())

  const { token, expiresAt } = await createSession(userId, getSessionSecret(), {
    userAgent: getHeader(event, "user-agent"),
    ip: getClientIp(event),
  })
  writeSessionCookie(event, token, expiresAt)
  event.context.sessionUser = undefined
}

export async function endUserSession(event: H3Event) {
  const token = getCookie(event, sessionCookieName())
  if (token) {
    await useDatabase()
    await revokeSession(token, getSessionSecret())
  }
  deleteCookie(event, sessionCookieName(), { path: "/", secure: isSecureSite(), sameSite: "lax" })
  event.context.sessionUser = null
}

/** Returns the signed-in user (from the DB, never from client claims) or null. */
export async function getSessionUser(event: H3Event): Promise<SessionUser | null> {
  if (event.context.sessionUser !== undefined) return event.context.sessionUser

  const token = getCookie(event, sessionCookieName())
  if (!token) {
    event.context.sessionUser = null
    return null
  }

  await useDatabase()
  const resolved = await resolveSession(token, getSessionSecret())
  if (!resolved) {
    deleteCookie(event, sessionCookieName(), { path: "/" })
    event.context.sessionUser = null
    return null
  }
  if (resolved.renewed) writeSessionCookie(event, token, resolved.expiresAt)

  event.context.sessionUser = resolved.user
  return resolved.user
}

export async function requireUser(event: H3Event): Promise<SessionUser> {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: "Authentication required" })
  return user
}

export async function requireAdmin(event: H3Event): Promise<SessionUser> {
  const user = await requireUser(event)
  if (user.role !== "admin") throw createError({ statusCode: 403, statusMessage: "Forbidden" })
  return user
}

/** Serializable view of the current user for API responses. */
export function toPublicUser(user: SessionUser) {
  return { id: String(user._id), email: user.email, name: user.name, role: user.role }
}
