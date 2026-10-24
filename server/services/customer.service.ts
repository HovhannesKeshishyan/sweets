import { createError } from 'h3'
import { Types, type QueryFilter } from 'mongoose'
import type { Paginated } from '../../shared/schemas/common'
import type { CustomerDTO, OrderSummaryDTO } from '../../shared/types/api'
import { Order, User, type IUser } from '../db/models'
import { escapeRegex } from './errors'
import { toOrderSummary } from './order.service'

interface OrderStats {
  _id: Types.ObjectId
  orderCount: number
  totalSpent: number
}

/** Order count and value per user, excluding cancelled orders from the value. */
async function orderStatsFor(userIds: Types.ObjectId[]) {
  const rows = await Order.aggregate<OrderStats>([
    { $match: { user: { $in: userIds } } },
    {
      $group: {
        _id: '$user',
        orderCount: { $sum: 1 },
        totalSpent: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 0, '$total'] } },
      },
    },
  ])
  return new Map(rows.map((r) => [String(r._id), r]))
}

function toCustomerDTO(u: IUser, stats?: OrderStats): CustomerDTO {
  return {
    id: String(u._id),
    name: u.name,
    email: u.email,
    phone: u.phone ?? null,
    role: u.role,
    isActive: u.isActive,
    orderCount: stats?.orderCount ?? 0,
    totalSpent: stats?.totalSpent ?? 0,
    createdAt: u.createdAt.toISOString(),
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
  }
}

export async function listCustomers(query: { q?: string; page: number; limit: number }): Promise<Paginated<CustomerDTO>> {
  const filter: QueryFilter<IUser> = { role: 'customer' }
  if (query.q) {
    const pattern = new RegExp(escapeRegex(query.q), 'i')
    filter.$or = [{ email: pattern }, { name: pattern }]
  }
  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    User.countDocuments(filter),
  ])
  const stats = await orderStatsFor(users.map((u) => u._id))
  return {
    items: users.map((u) => toCustomerDTO(u, stats.get(String(u._id)))),
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  }
}

export async function getCustomer(id: string): Promise<{ customer: CustomerDTO; orders: OrderSummaryDTO[] }> {
  const user = await User.findById(id).lean()
  if (!user) throw createError({ statusCode: 404, statusMessage: 'Customer not found' })
  const [stats, orders] = await Promise.all([
    orderStatsFor([user._id]),
    Order.find({ user: user._id }).sort({ createdAt: -1 }).limit(100).lean(),
  ])
  return { customer: toCustomerDTO(user, stats.get(String(user._id))), orders: orders.map(toOrderSummary) }
}
