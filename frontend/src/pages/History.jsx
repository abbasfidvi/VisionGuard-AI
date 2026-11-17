import { useState, useEffect } from "react";
import { getHistory, clearHistory } from "../services/api";
import "./History.css";

export default function History() {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getHistory();
      setInspections(data.inspections);
    } catch {
      setError("Failed to load inspection history.");
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    setClearing(true);
    try {
      await clearHistory();
      setInspections([]);
      setConfirmClear(false);
    } catch {
      setError("Failed to clear history.");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="history-page">
      <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Inspection History</h1>
          <p className="page-subtitle">All recorded quality inspection results</p>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-secondary" onClick={fetchHistory}>
            🔄 Refresh
          </button>
          {inspections.length > 0 && (
            <button
              className="btn btn-danger"
              onClick={() => setConfirmClear(true)}
            >
              🗑️ Clear History
            </button>
          )}
        </div>
      </div>

      {/* Clear confirmation dialog */}
      {confirmClear && (
        <div className="confirm-dialog">
          <p>⚠️ Are you sure you want to delete all inspection records? This cannot be undone.</p>
          <div className="flex gap-3" style={{ marginTop: 12 }}>
            <button
              className="btn btn-danger"
              onClick={handleClearHistory}
              disabled={clearing}
            >
              {clearing ? "Clearing..." : "Yes, Clear All"}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setConfirmClear(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="history-error">{error}</div>
      )}

      {loading ? (
        <div className="page-loading">
          <div className="spinner"></div>
          <p>Loading history...</p>
        </div>
      ) : inspections.length === 0 ? (
        <div className="card empty-state">
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <h3>No Inspection Records</h3>
          <p>Run an inspection to see results here.</p>
        </div>
      ) : (
        <div className="card">
          <div className="history-count">
            Showing {inspections.length} inspection{inspections.length !== 1 ? "s" : ""}
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Product</th>
                  <th>Prediction</th>
                  <th>Confidence</th>
                  <th>Decision</th>
                  <th>Rejection Signal</th>
                  <th>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {inspections.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="history-id">#{item.id}</span>
                    </td>
                    <td>{item.product_name}</td>
                    <td>
                      <span
                        className={`badge ${
                          item.prediction === "GOOD" ? "badge-good" : "badge-defective"
                        }`}
                      >
                        {item.prediction}
                      </span>
                    </td>
                    <td>
                      <span className="history-confidence">
                        {item.confidence.toFixed(1)}%
                      </span>
                    </td>
                    <td>
                      <span
                        className={`decision-text ${
                          item.decision === "ACCEPT" ? "decision-accept" : "decision-reject"
                        }`}
                      >
                        {item.decision}
                      </span>
                    </td>
                    <td>
                      <span className={item.rejection_signal ? "signal-active" : "signal-inactive"}>
                        {item.rejection_signal ? "🔴 ON" : "🟢 OFF"}
                      </span>
                    </td>
                    <td className="history-time">{item.inspected_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
