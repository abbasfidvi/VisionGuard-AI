import { useState, useEffect } from "react";
import { getStats, getHistory } from "../services/api";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import "./Dashboard.css";

// Colors for the pie chart
const PIE_COLORS = ["#2ea043", "#da3633"];

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [recentHistory, setRecentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch dashboard data when the page loads
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, historyData] = await Promise.all([
        getStats(),
        getHistory(),
      ]);
      setStats(statsData);
      // Show only the 5 most recent inspections on the dashboard
      setRecentHistory(historyData.inspections.slice(0, 5));
    } catch (err) {
      setError("Could not connect to backend. Make sure the server is running.");
    } finally {
      setLoading(false);
    }
  };

  // Data for the pie chart
  const pieData =
    stats && stats.total > 0
      ? [
          { name: "Accepted", value: stats.accepted },
          { name: "Rejected", value: stats.rejected },
        ]
      : [];

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          Real-time manufacturing quality inspection overview
        </p>
      </div>

      {error && (
        <div className="error-banner">
          ⚠️ {error}
          <button onClick={fetchData} className="btn btn-secondary" style={{ marginLeft: 12, padding: "6px 14px", fontSize: 12 }}>
            Retry
          </button>
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div className="stats-grid">
        <StatCard
          label="Total Inspected"
          value={stats?.total ?? 0}
          icon="🔬"
          color="blue"
        />
        <StatCard
          label="Accepted Products"
          value={stats?.accepted ?? 0}
          icon="✅"
          color="green"
        />
        <StatCard
          label="Rejected Products"
          value={stats?.rejected ?? 0}
          icon="❌"
          color="red"
        />
        <StatCard
          label="Acceptance Rate"
          value={`${stats?.acceptance_rate ?? 0}%`}
          icon="📊"
          color="blue"
        />
      </div>

      {/* ── Chart + Recent Table ── */}
      <div className="dashboard-grid">
        {/* Pie Chart */}
        <div className="card">
          <div className="section-title">Quality Distribution</div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#1c2128",
                    border: "1px solid #30363d",
                    borderRadius: 8,
                    color: "#e6edf3",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: "40px 0" }}>
              <p>No inspection data yet.</p>
              <button
                className="btn btn-primary"
                style={{ marginTop: 12 }}
                onClick={() => onNavigate("inspect")}
              >
                Run First Inspection
              </button>
            </div>
          )}
        </div>

        {/* Recent Inspections Table */}
        <div className="card">
          <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
            <div className="section-title" style={{ marginBottom: 0 }}>Recent Inspections</div>
            <button
              className="btn btn-secondary"
              style={{ padding: "6px 12px", fontSize: 12 }}
              onClick={() => onNavigate("history")}
            >
              View All →
            </button>
          </div>

          {recentHistory.length === 0 ? (
            <div className="empty-state" style={{ padding: "30px 0" }}>
              <p>No inspections recorded yet.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Result</th>
                  <th>Confidence</th>
                  <th>Decision</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentHistory.map((item) => (
                  <tr key={item.id}>
                    <td style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                      #{item.id}
                    </td>
                    <td>
                      <span className={`badge ${item.prediction === "GOOD" ? "badge-good" : "badge-defective"}`}>
                        {item.prediction}
                      </span>
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>
                      {item.confidence.toFixed(1)}%
                    </td>
                    <td>
                      <span
                        style={{
                          color: item.decision === "ACCEPT" ? "var(--green-light)" : "var(--red-light)",
                          fontWeight: 600,
                          fontSize: 13,
                        }}
                      >
                        {item.decision}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                      {item.inspected_at}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// Stat card component
function StatCard({ label, value, icon, color }) {
  const colorMap = {
    blue: { border: "var(--accent-blue)", bg: "rgba(31, 111, 235, 0.08)" },
    green: { border: "var(--green)", bg: "var(--green-bg)" },
    red: { border: "var(--red)", bg: "var(--red-bg)" },
  };
  const style = colorMap[color] || colorMap.blue;

  return (
    <div
      className="card stat-card"
      style={{ borderLeft: `3px solid ${style.border}`, background: style.bg }}
    >
      <div className="stat-card-icon">{icon}</div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  );
}
