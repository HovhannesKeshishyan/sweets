import {
  createError,
  getQuery,
  getRouterParams,
  readBody,
  type H3Event,
} from "h3";
import type { z, ZodType } from "zod";

export interface ValidationIssue {
  path: string;
  message: string;
}

/** Converts Zod issues to a stable, client-friendly shape. */
export function formatIssues(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

/**
 * Finds the first object key that MongoDB could interpret as an operator or a
 * nested path (`$gt`, `a.b`), anywhere in the input. Returns null if none.
 */
export function findOperatorKey(input: unknown, depth = 0): string | null {
  if (depth > 20 || input === null || typeof input !== "object") return null;
  if (Array.isArray(input)) {
    for (const item of input) {
      const found = findOperatorKey(item, depth + 1);
      if (found !== null) return found;
    }
    return null;
  }
  for (const [key, value] of Object.entries(input)) {
    if (
      key.startsWith("$") ||
      key.includes(".") ||
      key === "__proto__" ||
      key === "constructor"
    )
      return key;
    const found = findOperatorKey(value, depth + 1);
    if (found !== null) return found;
  }
  return null;
}

/**
 * Parses unknown input with a schema, throwing a 422 with field issues on failure.
 * Schemas are the allow-list: only declared fields survive, which prevents
 * mass assignment (e.g. a client sending `role: "admin"` or `price: 1`).
 */
export function parseWith<T extends ZodType>(
  schema: T,
  input: unknown,
): z.output<T> {
  const badKey = findOperatorKey(input);
  if (badKey !== null) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid input",
      data: { code: "INVALID_KEY", key: badKey.slice(0, 50) },
    });
  }
  const result = schema.safeParse(input);
  if (!result.success) {
    throw createError({
      statusCode: 422,
      statusMessage: "Validation failed",
      data: { code: "VALIDATION_ERROR", issues: formatIssues(result.error) },
    });
  }
  return result.data;
}

export async function validateBody<T extends ZodType>(
  event: H3Event,
  schema: T,
) {
  const body = await readBody(event).catch(() => {
    throw createError({ statusCode: 400, statusMessage: "Invalid JSON body" });
  });
  return parseWith(schema, body);
}

export function validateQuery<T extends ZodType>(event: H3Event, schema: T) {
  return parseWith(schema, getQuery(event));
}

export function validateParams<T extends ZodType>(event: H3Event, schema: T) {
  return parseWith(schema, getRouterParams(event));
}
