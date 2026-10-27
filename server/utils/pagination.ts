import type { Paginated, PaginationQuery } from "../../shared/schemas/common";

export function toSkipLimit({ page, limit }: PaginationQuery) {
  return { skip: (page - 1) * limit, limit };
}

export function paginate<T>(
  items: T[],
  total: number,
  { page, limit }: PaginationQuery,
): Paginated<T> {
  return {
    items,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
