import mongoose from 'mongoose'
import { afterAll, describe, expect, inject, it } from 'vitest'
import { connectToDatabase, disconnectFromDatabase, isDatabaseConnected } from '../../server/db/connection'

describe('connectToDatabase (no server needed)', () => {
  it('rejects when no URI is configured', async () => {
    await expect(connectToDatabase('')).rejects.toThrow(/not configured/)
  })

  it('rejects for an unreachable server and allows a retry afterwards', async () => {
    const unreachable = 'mongodb://127.0.0.1:1/unreachable?serverSelectionTimeoutMS=500'
    await expect(connectToDatabase(unreachable)).rejects.toThrow()
    expect(isDatabaseConnected()).toBe(false)
    // The failed promise is cleared, so a new attempt is made rather than reusing the rejection.
    await expect(connectToDatabase(unreachable)).rejects.toThrow()
  })

  it('drops unknown filter keys globally (strictQuery)', () => {
    expect(mongoose.get('strictQuery')).toBe(true)
  })
})

const mongoUri = inject('mongoUri')

describe.skipIf(!mongoUri)('connectToDatabase (requires MongoDB)', () => {
  afterAll(disconnectFromDatabase)

  it('connects once and reuses the connection for concurrent callers', async () => {
    const [a, b] = await Promise.all([connectToDatabase(mongoUri), connectToDatabase(mongoUri)])
    expect(a).toBe(b)
    expect(isDatabaseConnected()).toBe(true)
  })

  it('supports transactions (replica set)', async () => {
    await connectToDatabase(mongoUri)
    const probe = mongoose.connection.db!.collection(`tx_probe_${process.pid}_${Date.now()}`)
    const session = await mongoose.startSession()
    await session.withTransaction(async () => {
      await probe.insertOne({ ok: true }, { session })
    })
    await session.endSession()
    expect(await probe.countDocuments()).toBe(1)
    await probe.drop()
  })
})
