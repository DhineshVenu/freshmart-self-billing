import mongoose from "mongoose";
import { DailySalesSnapshot, IDailySalesSnapshot, ICategoryBreakdown } from "../models/DailySalesSnapshot.js";
import { Order } from "../models/Order.js";
import { LogExecution, ValidateInput, Singleton } from "../utils/index.js";

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

@Singleton
export class ReportService {
  /**
   * Generates (or regenerates idempotently) a daily sales snapshot for a given store and date.
   * Aggregates all PAID orders for that store + date into a single document.
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

    const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalOrders = orders.length;
    const totalTax = orders.reduce((sum, o) => sum + o.taxAmount, 0);

    // Category breakdown
    const catMap = new Map<string, { revenue: number; orders: number }>();
    orders.forEach((o) => {
      o.items.forEach((item) => {
        const cat = item.category || "General";
        const existing = catMap.get(cat) ?? { revenue: 0, orders: 0 };
        existing.revenue += item.lineTotal;
        existing.orders += 1;
        catMap.set(cat, existing);
      });
    });
    const categoryBreakdown: ICategoryBreakdown[] = Array.from(catMap.entries()).map(
      ([category, data]) => ({ category, revenue: data.revenue, orders: data.orders })
    );

    // Peak hour
    const hourCounts = new Map<number, number>();
    orders.forEach((o) => {
      if (o.paidAt) {
        const hour = new Date(o.paidAt).getHours();
        hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
      }
    });
    let peakHour = 0;
    let maxCount = 0;
    hourCounts.forEach((count, hour) => {
      if (count > maxCount) {
        maxCount = count;
        peakHour = hour;
      }
    });

    // Idempotent upsert
    const snapshot = await DailySalesSnapshot.findOneAndUpdate(
      { storeId: storeId ? new mongoose.Types.ObjectId(storeId) : null, date: dayStart },
      {
        $set: {
          totalRevenue,
          totalOrders,
          totalTax,
          categoryBreakdown,
          peakHour,
          generatedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return snapshot;
  }

  @LogExecution
  async getDailyReport(storeId: string | undefined, startDate: Date, endDate: Date): Promise<DailyReportDto[]> {
    const filter: Record<string, unknown> = {
      date: { $gte: startDate, $lte: endDate },
    };
    if (storeId) filter.storeId = new mongoose.Types.ObjectId(storeId);

    const snapshots = await DailySalesSnapshot.find(filter).sort({ date: 1 }).lean();
    return snapshots.map((s) => ({
      date: s.date.toISOString().split("T")[0],
      totalRevenue: s.totalRevenue,
      totalOrders: s.totalOrders,
      totalTax: s.totalTax,
      peakHour: s.peakHour,
    }));
  }

  @LogExecution
  async getCategoryReport(storeId: string | undefined, period: "week" | "month" | "quarter"): Promise<CategoryReportDto[]> {
    const now = new Date();
    const startDate = new Date(now);
    if (period === "week") startDate.setDate(now.getDate() - 7);
    else if (period === "month") startDate.setMonth(now.getMonth() - 1);
    else startDate.setMonth(now.getMonth() - 3);

    const filter: Record<string, unknown> = { date: { $gte: startDate } };
    if (storeId) filter.storeId = new mongoose.Types.ObjectId(storeId);

    const snapshots = await DailySalesSnapshot.find(filter).lean();
    const catMap = new Map<string, { revenue: number; orders: number }>();
    snapshots.forEach((s) => {
      s.categoryBreakdown.forEach((c) => {
        const existing = catMap.get(c.category) ?? { revenue: 0, orders: 0 };
        existing.revenue += c.revenue;
        existing.orders += c.orders;
        catMap.set(c.category, existing);
      });
    });

    return Array.from(catMap.entries())
      .map(([category, data]) => ({ category, revenue: data.revenue, orders: data.orders }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  @LogExecution
  async getPeakHourReport(storeId: string | undefined, period: "week" | "month" | "quarter"): Promise<PeakHourDto[]> {
    const now = new Date();
    const startDate = new Date(now);
    if (period === "week") startDate.setDate(now.getDate() - 7);
    else if (period === "month") startDate.setMonth(now.getMonth() - 1);
    else startDate.setMonth(now.getMonth() - 3);

    const filter: Record<string, unknown> = {
      status: "PAID",
      paidAt: { $gte: startDate },
    };
    if (storeId) filter.storeId = new mongoose.Types.ObjectId(storeId);

    const orders = await Order.find(filter).select("paidAt").lean();
    const hourCounts = new Map<number, number>();
    orders.forEach((o) => {
      if (o.paidAt) {
        const hour = new Date(o.paidAt).getHours();
        hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
      }
    });

    const result: PeakHourDto[] = [];
    for (let h = 0; h < 24; h++) {
      result.push({ hour: h, orderCount: hourCounts.get(h) ?? 0 });
    }
    return result;
  }

  @LogExecution
  async exportToCsv(storeId: string | undefined, startDate: Date, endDate: Date): Promise<string> {
    const data = await this.getDailyReport(storeId, startDate, endDate);
    let csv = "Date,Total Revenue,Total Orders,Total Tax,Peak Hour\n";
    data.forEach((d) => {
      csv += `${d.date},${d.totalRevenue.toFixed(2)},${d.totalOrders},${d.totalTax.toFixed(2)},${d.peakHour}\n`;
    });
    return csv;
  }

  @LogExecution
  async exportToPdf(_storeId: string | undefined, _startDate: Date, _endDate: Date): Promise<Buffer> {
    // TODO Phase 2C-1: implement via pdfkit
    throw new Error("PDF export not yet implemented. Install pdfkit and implement in Phase 2C-1.");
  }
}

export const reportService = new ReportService();
