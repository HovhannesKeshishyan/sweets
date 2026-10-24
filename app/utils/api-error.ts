interface ApiErrorShape {
  statusCode?: number
  statusMessage?: string
  data?: { statusMessage?: string; message?: string; data?: { issues?: { path: string; message: string }[] } }
}

/** Human-readable message from a $fetch/H3 error. */
export function apiErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  const e = error as ApiErrorShape
  return e?.data?.statusMessage || e?.data?.message || e?.statusMessage || fallback
}

/** Field → message map from a 422 validation error. */
export function apiFieldErrors(error: unknown): Record<string, string> {
  const issues = (error as ApiErrorShape)?.data?.data?.issues ?? []
  return Object.fromEntries(issues.map((i) => [i.path, i.message]))
}
