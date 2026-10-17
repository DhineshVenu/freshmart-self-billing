import { useEffect, useState, useCallback } from "react";
import {
  FiBarChart2,
  FiRefreshCw,
  FiDownload,
  FiCalendar,
  FiTrendingUp,
} from "react-icons/fi";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  getDailyReport,
  getCategoryReport,
  getPeakHourReport,
  exportCsv,
  type DailySnapshotData,
  type CategoryReportItem,
  type PeakHourItem,
} from "../services/reportApi";
import { Toast, type ToastType } from "../components/Toast";
import "./ReportsPage.css";

function formatDate(d: Date) {
  return d.toISOString().split("T")[0];
}

function ReportsPage() {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const [startDate, setStartDate] = useState(formatDate(thirtyDaysAgo));
  const [endDate, setEndDate] = useState(formatDate(today));
  const [daily, setDaily] = useState<DailySnapshotData[]>([]);
  const [category, setCategory] = useState<CategoryReportItem[]>([]);
  const [peakHour, setPeakHour] = useState<PeakHourItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = (message: string, type: ToastType) =>
    setToast({ message, type });

  const load = useCallback(async () => {
    if (!startDate || !endDate) return;
    setIsLoading(true);
    try {
      const [dailyRes, catRes, peakRes] = await Promise.all([
        getDailyReport(startDate, endDate),
        getCategoryReport("month"),
        getPeakHourReport("month"),
      ]);
      setDaily(dailyRes);
      setCategory(catRes);
      setPeakHour(peakRes);
    } catch (err) {
      showToast((err as Error).message || "Failed to load report data", "error");
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    load();
  }, [load]);

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const blob = await exportCsv(startDate, endDate);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `freshmart-report-${startDate}-${endDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("CSV exported successfully", "success");
    } catch (err) {
      showToast((err as Error).message || "Export failed", "error");
    } finally {
      setIsExporting(false);
    }
  };

  // Summary stats
  const totalRevenue = daily.reduce((sum, d) => sum + d.totalRevenue, 0);
  const totalOrders = daily.reduce((sum, d) => sum + d.totalOrders, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return (
    <div className="rpt-root">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Header */}
      <div className="rpt-header">
        <div className="rpt-header-left">
          <FiBarChart2 size={24} />
          <div>
            <h1>Analytics & Reports</h1>
            <p>Historical sales data and performance insights</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <div className="rpt-date-range">
            <FiCalendar size={14} />
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rpt-date-input"
            />
            <span>to</span>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rpt-date-input"
            />
          </div>
          <button className="rpt-refresh-btn" onClick={load} disabled={isLoading}>
            <FiRefreshCw size={14} className={isLoading ? "rpt-spin" : ""} />
            {isLoading ? "Loading…" : "Apply"}
          </button>
          <button className="rpt-export-btn" onClick={handleExportCsv} disabled={isExporting}>
            <FiDownload size={14} /> {isExporting ? "Exporting…" : "Export CSV"}
          </button>
        </div>
      </div>

      {/* Summary KPI Tiles */}
      <div className="rpt-kpi-row">
        <div className="rpt-kpi-tile">
          <span className="rpt-kpi-val">₹{totalRevenue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
          <span className="rpt-kpi-label">Total Revenue</span>
        </div>
        <div className="rpt-kpi-tile">
          <span className="rpt-kpi-val">{totalOrders.toLocaleString()}</span>
          <span className="rpt-kpi-label">Total Orders</span>
        </div>
        <div className="rpt-kpi-tile">
          <span className="rpt-kpi-val">₹{avgOrderValue.toFixed(2)}</span>
          <span className="rpt-kpi-label">Avg. Order Value</span>
        </div>
        <div className="rpt-kpi-tile">
          <span className="rpt-kpi-val">{daily.length}</span>
          <span className="rpt-kpi-label">Days Tracked</span>
        </div>
      </div>

      {/* Revenue Trend */}
      <section className="rpt-chart-card">
        <h2><FiTrendingUp size={16} /> Revenue Trend</h2>
        {daily.length === 0 ? (
          <div className="rpt-empty">No data for selected date range</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={daily} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                tickFormatter={(v) => v?.slice(5) ?? v}
              />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }}
                labelStyle={{ color: "#e2e8f0" }}
                formatter={(val: number) => [`₹${val.toFixed(2)}`, "Revenue"]}
              />
              <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="totalRevenue"
                name="Revenue (₹)"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="totalOrders"
                name="Orders"
                stroke="#0284c7"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>

      <div className="rpt-two-col">
        {/* Category Revenue */}
        <section className="rpt-chart-card">
          <h2>Revenue by Category</h2>
          {category.length === 0 ? (
            <div className="rpt-empty">No category data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                layout="vertical"
                data={category}
                margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  tickFormatter={(v) => `₹${v}`}
                />
                <YAxis
                  type="category"
                  dataKey="category"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  width={80}
                />
                <Tooltip
                  contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }}
                  formatter={(val: number) => [`₹${val.toFixed(2)}`, "Revenue"]}
                />
                <Bar dataKey="revenue" name="Revenue (₹)" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        {/* Peak Hours */}
        <section className="rpt-chart-card">
          <h2>Orders by Hour of Day</h2>
          {peakHour.length === 0 ? (
            <div className="rpt-empty">No peak hour data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={peakHour} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="hour"
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                  tickFormatter={(v) => `${v}:00`}
                />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }}
                  labelFormatter={(v) => `${v}:00 – ${Number(v) + 1}:00`}
                  formatter={(val: number) => [val, "Orders"]}
                />
                <Bar dataKey="orderCount" name="Orders" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>
      </div>
    </div>
  );
}

export default ReportsPage;
