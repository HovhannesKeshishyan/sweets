import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto'

/**
 * scrypt password hashing (Node built-in, no native addons).
 * Format: `scrypt$<N>$<r>$<p>$<salt b64>$<hash b64>` — parameters are stored
 * with each hash so they can be raised later without breaking old hashes.
 * Defaults are an OWASP-recommended setting (N=2^15, r=8, p=3): same work factor
 * as N=2^17/p=1 but ~33 MB of memory per hash instead of ~134 MB, which matters
 * under concurrent logins.
 */

export interface ScryptParams {
  N: number
  r: number
  p: number
}

export const DEFAULT_SCRYPT_PARAMS: ScryptParams = { N: 2 ** 15, r: 8, p: 3 }
const KEY_LENGTH = 64
const SALT_BYTES = 16

function derive(password: string, salt: Buffer, { N, r, p }: ScryptParams): Promise<Buffer> {
  const options: ScryptOptions = { N, r, p, maxmem: 256 * N * r }
  return new Promise((resolve, reject) => {
    scrypt(password.normalize('NFKC'), salt, KEY_LENGTH, options, (error, key) =>
      error ? reject(error) : resolve(key),
    )
  })
}

export async function hashPassword(password: string, params: ScryptParams = DEFAULT_SCRYPT_PARAMS): Promise<string> {
  const salt = randomBytes(SALT_BYTES)
  const key = await derive(password, salt, params)
  return ['scrypt', params.N, params.r, params.p, salt.toString('base64'), key.toString('base64')].join('$')
}

function parse(stored: string) {
  const [algorithm, N, r, p, salt, hash] = stored.split('$')
  if (algorithm !== 'scrypt' || !salt || !hash) return null
  const params = { N: Number(N), r: Number(r), p: Number(p) }
  if (![params.N, params.r, params.p].every(Number.isSafeInteger)) return null
  return { params, salt: Buffer.from(salt, 'base64'), hash: Buffer.from(hash, 'base64') }
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parsed = parse(stored)
  if (!parsed) return false
  const key = await derive(password, parsed.salt, parsed.params)
  return key.length === parsed.hash.length && timingSafeEqual(key, parsed.hash)
}

/** True when a hash was made with weaker parameters than the current defaults. */
export function needsRehash(stored: string, params: ScryptParams = DEFAULT_SCRYPT_PARAMS): boolean {
  const parsed = parse(stored)
  const cost = (x: ScryptParams) => x.N * x.r * x.p
  return !parsed || cost(parsed.params) < cost(params)
}

let dummyHash: Promise<string> | null = null

/**
 * Runs a full verification against a throwaway hash. Used when the email is
 * unknown so response time doesn't reveal whether an account exists.
 */
export async function verifyAgainstDummy(password: string): Promise<false> {
  dummyHash ??= hashPassword('dummy-password-for-timing')
  await verifyPassword(password, await dummyHash)
  return false
}
