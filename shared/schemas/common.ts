import { z } from "zod";

/** 24-char hex MongoDB ObjectId. */
export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

export const MAX_PAGE_SIZE = 60;

/** Query-string pagination: values arrive as strings, so they are coerced. */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(12),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Route params `{ id }` for `[id]` routes. */
export const idParamsSchema = z.object({ id: objectIdSchema });

export const searchPageQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(100).optional(),
});
