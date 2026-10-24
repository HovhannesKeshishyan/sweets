import { describe, expect, it } from "vitest"
import { Session, User } from "../../server/db/models"
import { authenticate, registerCustomer, upsertAdmin } from "../../server/services/auth.service"
import { createSession, hashToken, resolveSession, revokeSession } from "../../server/services/session.service"
import { registerSchema } from "../../shared/schemas/auth"
import { hasDatabase, useTestDatabase } from "../setup/db"

const SECRET = "s".repeat(40)

describe.skipIf(!hasDatabase)("auth service", () => {
  useTestDatabase()

  it("registers customers only, even if the request asks for admin", async () => {
    const input = registerSchema.parse({ name: "Eve", email: "eve@example.com", password: "password-123", role: "admin" })
    const user = await registerCustomer(input)
    expect(user.role).toBe("customer")
    const stored = await User.findById(user._id).select("+passwordHash").lean()
    expect(stored?.passwordHash).toMatch(/^scrypt\$/)
    expect(stored?.passwordHash).not.toContain("password-123")
  })

  it("returns 409 for duplicate emails", async () => {
    await registerCustomer({ name: "A", email: "dup@example.com", password: "password-123" })
    await expect(registerCustomer({ name: "B", email: "dup@example.com", password: "password-456" })).rejects.toMatchObject({
      statusCode: 409,
    })
  })

  it("authenticates valid credentials and gives one generic error otherwise", async () => {
    await registerCustomer({ name: "A", email: "a@example.com", password: "password-123" })

    const user = await authenticate({ email: "a@example.com", password: "password-123" })
    expect(user.email).toBe("a@example.com")
    expect((user as { passwordHash?: string }).passwordHash).toBeUndefined()

    const wrong = authenticate({ email: "a@example.com", password: "nope-nope-nope" })
    const unknown = authenticate({ email: "nobody@example.com", password: "password-123" })
    await expect(wrong).rejects.toMatchObject({ statusCode: 401, statusMessage: "Invalid email or password" })
    await expect(unknown).rejects.toMatchObject({ statusCode: 401, statusMessage: "Invalid email or password" })
  })

  it("refuses disabled accounts", async () => {
    const user = await registerCustomer({ name: "A", email: "off@example.com", password: "password-123" })
    await User.updateOne({ _id: user._id }, { isActive: false })
    await expect(authenticate({ email: "off@example.com", password: "password-123" })).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it("creates or promotes admins via the CLI service", async () => {
    await registerCustomer({ name: "Owner", email: "owner@example.com", password: "password-123" })
    const admin = await upsertAdmin({ email: "owner@example.com", name: "Ignored", password: "new-password-1" })
    expect(admin?.role).toBe("admin")
    expect(admin?.name).toBe("Owner")
    await expect(authenticate({ email: "owner@example.com", password: "new-password-1" })).resolves.toBeTruthy()
  })
})

describe.skipIf(!hasDatabase)("sessions", () => {
  useTestDatabase()

  async function makeUser() {
    return registerCustomer({ name: "S", email: `s${Math.random()}@example.com`, password: "password-123" })
  }

  it("stores only a hash of the token and resolves the user", async () => {
    const user = await makeUser()
    const { token } = await createSession(user._id, SECRET)
    expect(await Session.findOne({ tokenHash: token })).toBeNull()
    expect(await Session.findOne({ tokenHash: hashToken(token, SECRET) })).not.toBeNull()

    const resolved = await resolveSession(token, SECRET)
    expect(resolved?.user.email).toBe(user.email)
    expect(resolved?.user.role).toBe("customer")
  })

  it("rejects unknown, tampered, wrong-secret and revoked tokens", async () => {
    const user = await makeUser()
    const { token } = await createSession(user._id, SECRET)
    expect(await resolveSession("made-up-token", SECRET)).toBeNull()
    expect(await resolveSession(`${token}x`, SECRET)).toBeNull()
    expect(await resolveSession(token, "z".repeat(40))).toBeNull()

    await revokeSession(token, SECRET)
    expect(await resolveSession(token, SECRET)).toBeNull()
  })

  it("drops expired sessions and sessions of disabled users", async () => {
    const user = await makeUser()
    const expired = await createSession(user._id, SECRET)
    await Session.updateOne({ tokenHash: hashToken(expired.token, SECRET) }, { expiresAt: new Date(Date.now() - 1000) })
    expect(await resolveSession(expired.token, SECRET)).toBeNull()

    const active = await createSession(user._id, SECRET)
    await User.updateOne({ _id: user._id }, { isActive: false })
    expect(await resolveSession(active.token, SECRET)).toBeNull()
  })

  it("reflects role changes immediately (role is read from the DB, not the session)", async () => {
    const user = await makeUser()
    const { token } = await createSession(user._id, SECRET)
    await User.updateOne({ _id: user._id }, { role: "admin" })
    expect((await resolveSession(token, SECRET))?.user.role).toBe("admin")
  })

  it("renews sessions close to expiry", async () => {
    const user = await makeUser()
    const { token } = await createSession(user._id, SECRET)
    const soon = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await Session.updateOne({ tokenHash: hashToken(token, SECRET) }, { expiresAt: soon })
    const resolved = await resolveSession(token, SECRET)
    expect(resolved?.renewed).toBe(true)
    expect(resolved!.expiresAt.getTime()).toBeGreaterThan(soon.getTime())
  })
})
