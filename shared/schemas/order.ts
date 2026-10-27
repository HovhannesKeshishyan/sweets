import { z } from "zod";
import { ORDER_STATUSES, type OrderStatus } from "../constants";

/** Allowed fulfillment transitions. Delivered and cancelled are final. */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

export const orderStatusUpdateSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: z.string().trim().max(500).optional(),
});

export const orderNumberSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^MC-\d{6}-[A-Z0-9]{6}$/, "Invalid order number");

export const adminOrderListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(ORDER_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type AdminOrderListQuery = z.infer<typeof adminOrderListQuerySchema>;
