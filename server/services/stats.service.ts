import { LOW_STOCK_THRESHOLD, ORDER_STATUSES, type OrderStatus } from "../../shared/constants"
import type { DashboardStatsDTO } from "../../shared/types/api"
import { Order, Product, User } from "../db/models"
import { toOrderSummary } from "./order.service"

const DAY = 24 * 60 * 60 * 1000

export async function getDashboardStats(currency: string, now = new Date()): Promise<DashboardStatsDTO> {
  const since = new Date(now.getTime() - 30 * DAY)

  const [byStatusRows, valueRows, productRows, lowStock, outOfStock, customers, newCustomers, recent, lowStockProducts] =
    await Promise.all([
      Order.aggregate<{ _id: OrderStatus; count: number; recent: number }>([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            recent: { $sum: { $cond: [{ $gte: ["$createdAt", since] }, 1, 0] } },
          },
        },
      ]),
      Order.aggregate<{ _id: null; total: number; recent: number }>([
        { $match: { status: { $ne: "cancelled" } } },
        {
          $group: {
            _id: null,
            total: { $sum: "$total" },
            recent: { $sum: { $cond: [{ $gte: ["$createdAt", since] }, "$total", 0] } },
          },
        },
      ]),
      Product.aggregate<{ _id: string; count: number }>([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Product.countDocuments({ status: "active", stock: { $gt: 0, $lte: LOW_STOCK_THRESHOLD } }),
      Product.countDocuments({ status: "active", stock: { $lte: 0 } }),
      User.countDocuments({ role: "customer" }),
      User.countDocuments({ role: "customer", createdAt: { $gte: since } }),
      Order.find().sort({ createdAt: -1 }).limit(8).lean(),
      Product.find({ status: "active", stock: { $lte: LOW_STOCK_THRESHOLD } })
        .sort({ stock: 1 })
        .limit(8)
        .select("name stock")
        .lean(),
    ])

  const byStatus = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<OrderStatus, number>
  let totalOrders = 0
  let recentOrders = 0
  for (const row of byStatusRows) {
    byStatus[row._id] = row.count
    totalOrders += row.count
    recentOrders += row.recent
  }
  const products = Object.fromEntries(productRows.map((r) => [r._id, r.count]))

  return {
    currency,
    orders: { total: totalOrders, last30Days: recentOrders, byStatus },
    orderValue: { total: valueRows[0]?.total ?? 0, last30Days: valueRows[0]?.recent ?? 0 },
    products: {
      active: products.active ?? 0,
      draft: products.draft ?? 0,
      archived: products.archived ?? 0,
      lowStock,
      outOfStock,
    },
    customers: { total: customers, last30Days: newCustomers },
    recentOrders: recent.map(toOrderSummary),
    lowStockProducts: lowStockProducts.map((p) => ({ id: String(p._id), name: p.name, stock: p.stock })),
  }
}
