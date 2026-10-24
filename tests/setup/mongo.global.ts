import type { TestProject } from 'vitest/node'
import type { MongoMemoryReplSet } from 'mongodb-memory-server'

declare module 'vitest' {
  export interface ProvidedContext {
    /** Replica-set URI for DB tests, or '' when no MongoDB is available. */
    mongoUri: string
  }
}

/**
 * Provides a MongoDB replica set (needed for transactions) to DB tests.
 * Order of preference:
 *  1. MONGODB_TEST_URI — an existing test database you control.
 *  2. An in-memory replica set from mongodb-memory-server.
 * If neither is available, DB tests are skipped and say so.
 */
export default async function setup(project: TestProject) {
  if (process.env.SKIP_DB_TESTS === '1') {
    console.warn('\n[tests] SKIP_DB_TESTS=1 — database tests will be SKIPPED.\n')
    project.provide('mongoUri', '')
    return
  }

  const external = process.env.MONGODB_TEST_URI
  if (external) {
    project.provide('mongoUri', external)
    return
  }

  let replSet: MongoMemoryReplSet | undefined
  try {
    const { MongoMemoryReplSet } = await import('mongodb-memory-server')
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } })
    project.provide('mongoUri', replSet.getUri())
  } catch (error) {
    console.warn(
      '\n[tests] MongoDB unavailable — database tests will be SKIPPED.',
      '\n        Set MONGODB_TEST_URI or allow mongodb-memory-server to download a binary.',
      `\n        Cause: ${error instanceof Error ? error.message.split('\n')[0] : String(error)}\n`,
    )
    project.provide('mongoUri', '')
  }

  return async () => {
    await replSet?.stop()
  }
}
