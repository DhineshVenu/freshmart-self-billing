import mongoose from "mongoose";
import { DailySalesSnapshot, IDailySalesSnapshot, ICategoryBreakdown } from "../models/DailySalesSnapshot.js";
import { Order } from "../models/Order.js";
import { LogExecution, Singleton } from "../utils/index.js";

export interface DailyReportDto {
  date: string;
  totalRevenue: number;
  totalOrders: number;
  totalTax: number;
  peakHour: number;
}

export interface CategoryReportDto {
  category: string;
  revenue: number;
  orders: number;
}

export interface PeakHourDto {
  hour: number;
  orderCount: number;
}

// ─── helpers ───────────────────────────────────────────────────────────────────

function periodStart(period: "week" | "month" | "quarter"): Date {
  const d = new Date();
  if (period === "week")    d.setDate(d.getDate() - 7);
  else if (period === "month")  d.setMonth(d.getMonth() - 1);
  else                          d.setMonth(d.getMonth() - 3);
  return d;
}

@Singleton
export class ReportService {

  /**
   * Generates (or regenerates idempotently) a daily sales snapshot for a store + date.
   * Used by the nightly cron job and the manual /generate-snapshot endpoint.
   */
  @LogExecution
  async generateDailySnapshot(storeId: string | undefined, date: Date): Promise<IDailySalesSnapshot> {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const filter: Record<string, unknown> = {
      status: "PAID",
      paidAt: { $gte: dayStart, $lt: dayEnd },
    };
    if (storeId) filter.storeId = new mongoose.Types.ObjectId(storeId);

    const orders = await Order.find(filter).lean();

    const totalRevenue = orders.reduce((s, o) => s + o.totalAmount, 0);
    const totalOrders  = orders.length;
    const totalTax     = orders.reduce((s, o) => s + o.taxAmount, 0);

    const catMap = new Map<string, { revenue: number; orders: number }>();
    orders.forEach((o) =>
      o.items.forEach((item) => {
        const cat = item.category || "General";
        const e = catMap.get(cat) ?? { revenue: 0, orders: 0 };
        e.revenue += item.lineTotal;
        e.orders  += 1;
        catMap.set(cat, e);
      })
    );
    const categoryBreakdown: ICategoryBreakdown[] = Array.from(catMap.entries()).map(
      ([category, d]) => ({ category, revenue: d.revenue, orders: d.orders })
    );

    const hourCounts = new Map<number, number>();
    orders.forEach((o) => {
      if (o.paidAt) {
        const h = new Date(o.paidAt).getHours();
        hourCounts.set(h, (hourCounts.get(h) ?? 0) + 1);
      }
    });
    let peakHour = 0, maxCount = 0;
    hourCounts.forEach((count, hour) => {
      if (count > maxCount) { maxCount = count; peakHour = hour; }
    });

    const snapshot = await DailySalesSnapshot.findOneAndUpdate(
      { storeId: storeId ? new mongoose.Types.ObjectId(storeId) : null, date: dayStart },
      { $set: { totalRevenue, totalOrders, totalTax, categoryBreakdown, peakHour, generatedAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return snapshot;
  }

  /**
   * Daily revenue trend — queries Orders directly (no snapshot dependency).
   * Buckets PAID orders by calendar day across the requested date range.
   */
  @LogExecution
  async getDailyReport(
    storeId: string | undefined,
    startDate: Date,
    endDate: Date
  ): Promise<DailyReportDto[]> {
    // Guard against Invalid Date
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error("Invalid date range. Please provide valid start and end dates.");
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const filter: Record<string, unknown> = {
      status: "PAID",
      paidAt: { $gte: start, $lte: end },
    };
    if (storeId) filter.storeId = new mongoose.Types.ObjectId(storeId);

    const orders = await Order.find(filter).select("totalAmount taxAmount paidAt").lean();

    // Bucket by YYYY-MM-DD
    const dayMap = new Map<string, { totalRevenue: number; totalOrders: number; totalTax: number }>();
    orders.forEach((o) => {
      const key = new Date(o.paidAt!).toISOString().split("T")[0];
      const e = dayMap.get(key) ?? { totalRevenue: 0, totalOrders: 0, totalTax: 0 };
      e.totalRevenue += o.totalAmount;
      e.totalOrders  += 1;
      e.totalTax     += o.taxAmount;
      dayMap.set(key, e);
    });

    // Sort and return — fill every day in range so chart has no gaps
    const result: DailyReportDto[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const key = cursor.toISOString().split("T")[0];
      const e = dayMap.get(key) ?? { totalRevenue: 0, totalOrders: 0, totalTax: 0 };
      result.push({ date: key, ...e, peakHour: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
  }

  /**
   * Category revenue breakdown — queries Orders directly.
   */
  @LogExecution
  async getCategoryReport(
    storeId: string | undefined,
    period: "week" | "month" | "quarter"
  ): Promise<CategoryReportDto[]> {
    const filter: Record<string, unknown> = {
      status: "PAID",
      paidAt: { $gte: periodStart(period) },
    };
    if (storeId) filter.storeId = new mongoose.Types.ObjectId(storeId);

    const orders = await Order.find(filter).select("items").lean();

    const catMap = new Map<string, { revenue: number; orders: number }>();
    orders.forEach((o) =>
      o.items.forEach((item) => {
        const cat = (item as any).category || "General";
        const e = catMap.get(cat) ?? { revenue: 0, orders: 0 };
        e.revenue += (item as any).lineTotal ?? 0;
        e.orders  += 1;
        catMap.set(cat, e);
      })
    );

    return Array.from(catMap.entries())
      .map(([category, d]) => ({ category, revenue: d.revenue, orders: d.orders }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  /**
   * Peak hour analysis — queries Orders directly (unchanged).
   */
  @LogExecution
  async getPeakHourReport(
    storeId: string | undefined,
    period: "week" | "month" | "quarter"
  ): Promise<PeakHourDto[]> {
    const filter: Record<string, unknown> = {
      status: "PAID",
      paidAt: { $gte: periodStart(period) },
    };
    if (storeId) filter.storeId = new mongoose.Types.ObjectId(storeId);

    const orders = await Order.find(filter).select("paidAt").lean();
    const hourCounts = new Map<number, number>();
    orders.forEach((o) => {
      if (o.paidAt) {
        const h = new Date(o.paidAt).getHours();
        hourCounts.set(h, (hourCounts.get(h) ?? 0) + 1);
      }
    });

    const result: PeakHourDto[] = [];
    for (let h = 0; h < 24; h++) {
      result.push({ hour: h, orderCount: hourCounts.get(h) ?? 0 });
    }
    return result;
  }

  /**
   * CSV export of the daily revenue trend.
   */
  @LogExecution
  async exportToCsv(
    storeId: string | undefined,
    startDate: Date,
    endDate: Date
  ): Promise<string> {
    const data = await this.getDailyReport(storeId, startDate, endDate);
    // Filter out zero-order days from CSV to keep it clean
    const rows = data.filter((d) => d.totalOrders > 0);
    if (rows.length === 0) return "Date,Total Revenue,Total Orders,Total Tax\nNo paid orders in this period.\n";
    let csv = "Date,Total Revenue (INR),Total Orders,Total Tax (INR)\n";
    rows.forEach((d) => {
      csv += `${d.date},${d.totalRevenue.toFixed(2)},${d.totalOrders},${d.totalTax.toFixed(2)}\n`;
    });
    return csv;
  }

  /**
   * PDF export — stub (not implemented, use CSV for now).
   */
  @LogExecution
  async exportToPdf(
    _storeId: string | undefined,
    _startDate: Date,
    _endDate: Date
  ): Promise<Buffer> {
    throw new Error("PDF export is not available. Please use the CSV export option.");
  }
}

export const reportService = new ReportService();
