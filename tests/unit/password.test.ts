import { describe, expect, it } from "vitest"
import {
  DEFAULT_SCRYPT_PARAMS,
  hashPassword,
  needsRehash,
  verifyAgainstDummy,
  verifyPassword,
} from "../../server/services/password"

// Cheap parameters keep most tests fast; one test exercises the real defaults.
const FAST = { N: 2 ** 10, r: 8, p: 1 }

describe("password hashing", () => {
  it("verifies the correct password and rejects others", async () => {
    const hash = await hashPassword("correct horse battery", FAST)
    expect(await verifyPassword("correct horse battery", hash)).toBe(true)
    expect(await verifyPassword("correct horse batterY", hash)).toBe(false)
    expect(await verifyPassword("", hash)).toBe(false)
  })

  it("never stores the password and salts every hash", async () => {
    const a = await hashPassword("same-password-123", FAST)
    const b = await hashPassword("same-password-123", FAST)
    expect(a).not.toBe(b)
    expect(a).not.toContain("same-password-123")
    expect(a.startsWith("scrypt$1024$8$1$")).toBe(true)
  })

  it("works with the production defaults", async () => {
    const hash = await hashPassword("a-strong-password", DEFAULT_SCRYPT_PARAMS)
    expect(await verifyPassword("a-strong-password", hash)).toBe(true)
    expect(needsRehash(hash)).toBe(false)
  })

  it("treats Unicode-equivalent passwords as equal (NFKC)", async () => {
    const hash = await hashPassword("café-chocolat", FAST) // precomposed é
    expect(await verifyPassword("café-chocolat", hash)).toBe(true) // e + combining accent
  })

  it("rejects malformed stored hashes instead of throwing", async () => {
    expect(await verifyPassword("x", "not-a-hash")).toBe(false)
    expect(await verifyPassword("x", "bcrypt$1$2$3$a$b")).toBe(false)
    expect(await verifyPassword("x", "scrypt$abc$8$1$c2FsdA==$aGFzaA==")).toBe(false)
  })

  it("flags weaker hashes for rehashing", async () => {
    expect(needsRehash(await hashPassword("pw-for-rehash", FAST))).toBe(true)
    expect(needsRehash("garbage")).toBe(true)
  })

  it("dummy verification always fails", async () => {
    expect(await verifyAgainstDummy("anything")).toBe(false)
  })
})
