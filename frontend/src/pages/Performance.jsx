import { useState, useEffect } from "react";
import { getModelInfo } from "../services/api";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from "recharts";
import "./Performance.css";

// Recharts tooltip styling to match the dark theme
const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    background: "#1c2128",
    border: "1px solid #30363d",
    borderRadius: 8,
    color: "#e6edf3",
    fontSize: 13,
  },
};

export default function Performance() {
  const [modelInfo, setModelInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchModelInfo();
  }, []);

  const fetchModelInfo = async () => {
    setLoading(true);
    try {
      const data = await getModelInfo();
      setModelInfo(data);
    } catch {
      setError("Could not load model information.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner"></div>
        <p>Loading model performance...</p>
      </div>
    );
  }

  if (error) {
    return <div className="perf-error">{error}</div>;
  }

  const hasEval = modelInfo?.evaluation != null;
  const hasHistory = modelInfo?.training_history != null;
  const eval_ = modelInfo?.evaluation;
  const hist = modelInfo?.training_history;

  // Prepare chart data from training history
  const chartData = hasHistory
    ? hist.accuracy.map((_, i) => ({
        epoch: `Epoch ${i + 1}`,
        "Train Accuracy": (hist.accuracy[i] * 100).toFixed(2),
        "Val Accuracy": (hist.val_accuracy[i] * 100).toFixed(2),
        "Train Loss": hist.loss[i].toFixed(4),
        "Val Loss": hist.val_loss[i].toFixed(4),
      }))
    : [];

  return (
    <div className="performance-page">
      <div className="page-header">
        <h1 className="page-title">Model Performance</h1>
        <p className="page-subtitle">
          Actual evaluation metrics from the trained MobileNetV2 model
        </p>
      </div>

      {/* Model not trained yet */}
      {!modelInfo?.model_available && (
        <div className="card not-trained-card">
          <div style={{ fontSize: 48, marginBottom: 12 }}>🤖</div>
          <h2>Model Not Trained Yet</h2>
          <p>
            To see performance metrics, you need to train the model first.
          </p>
          <div className="train-instructions">
            <div className="instruction-step">
              <span className="step-num">1</span>
              Download the dataset from Kaggle and place it in <code>backend/casting_data/</code>
            </div>
            <div className="instruction-step">
              <span className="step-num">2</span>
              Open a terminal in the <code>backend</code> folder
            </div>
            <div className="instruction-step">
              <span className="step-num">3</span>
              Run: <code>python training/train.py</code>
            </div>
            <div className="instruction-step">
              <span className="step-num">4</span>
              After training, restart the backend server
            </div>
          </div>
        </div>
      )}

      {/* Metrics cards */}
      {hasEval && (
        <>
          <div className="metrics-grid">
            <MetricCard label="Test Accuracy" value={`${eval_.accuracy}%`} icon="🎯" color="blue" />
            <MetricCard label="Precision" value={eval_.precision.toFixed(4)} icon="📏" color="green" />
            <MetricCard label="Recall" value={eval_.recall.toFixed(4)} icon="🔁" color="green" />
            <MetricCard label="F1-Score" value={eval_.f1_score.toFixed(4)} icon="⚡" color="blue" />
          </div>

          {/* Confusion Matrix */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-title">Confusion Matrix</div>
            <p className="section-note">Rows: Actual | Columns: Predicted</p>
            {eval_.confusion_matrix && (
              <ConfusionMatrix matrix={eval_.confusion_matrix} labels={eval_.confusion_matrix_labels} />
            )}
            <p className="cm-note">
              Test set: {eval_.test_samples} images total
            </p>
          </div>
        </>
      )}

      {/* Training history charts */}
      {hasHistory && chartData.length > 0 && (
        <div className="charts-grid">
          {/* Accuracy chart */}
          <div className="card">
            <div className="section-title">Training & Validation Accuracy</div>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                <XAxis dataKey="epoch" tick={{ fill: "#8b949e", fontSize: 12 }} />
                <YAxis tick={{ fill: "#8b949e", fontSize: 12 }} domain={[0, 100]} unit="%" />
                <Tooltip {...CHART_TOOLTIP_STYLE} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="Train Accuracy"
                  stroke="#388bfd"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="Val Accuracy"
                  stroke="#3fb950"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Loss chart */}
          <div className="card">
            <div className="section-title">Training & Validation Loss</div>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                <XAxis dataKey="epoch" tick={{ fill: "#8b949e", fontSize: 12 }} />
                <YAxis tick={{ fill: "#8b949e", fontSize: 12 }} />
                <Tooltip {...CHART_TOOLTIP_STYLE} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="Train Loss"
                  stroke="#f85149"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="Val Loss"
                  stroke="#d29922"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Model configuration info */}
      {modelInfo?.model_architecture && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="section-title">Model Configuration</div>
          <div className="config-grid">
            <ConfigItem label="Architecture" value={modelInfo.model_architecture} />
            <ConfigItem label="Input Size" value={`${modelInfo.input_size?.join("×")} pixels`} />
            <ConfigItem label="Training Epochs" value={modelInfo.training_epochs} />
            <ConfigItem label="Batch Size" value={modelInfo.batch_size} />
            <ConfigItem label="Learning Rate" value={modelInfo.learning_rate} />
            <ConfigItem label="Confidence Threshold" value={`${modelInfo.confidence_threshold}%`} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────────────────────

function MetricCard({ label, value, icon, color }) {
  const colorMap = {
    blue: "rgba(31, 111, 235, 0.08)",
    green: "var(--green-bg)",
  };
  return (
    <div className="card metric-card" style={{ background: colorMap[color] || colorMap.blue }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div className="metric-value-large">{value}</div>
      <div className="metric-label-text">{label}</div>
    </div>
  );
}

function ConfusionMatrix({ matrix, labels }) {
  return (
    <div className="cm-wrapper">
      <div className="cm-axis-label cm-y-label">Actual</div>
      <div className="cm-inner">
        <div className="cm-x-label-row">
          {labels.map((l) => (
            <div key={l} className="cm-header-cell">{l}</div>
          ))}
        </div>
        {matrix.map((row, i) => (
          <div key={i} className="cm-row">
            <div className="cm-row-label">{labels[i]}</div>
            {row.map((val, j) => (
              <div
                key={j}
                className={`cm-cell ${i === j ? "cm-diag" : "cm-off-diag"}`}
              >
                {val}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="cm-axis-label cm-x-bottom">Predicted</div>
    </div>
  );
}

function ConfigItem({ label, value }) {
  return (
    <div className="config-item">
      <span className="config-label">{label}</span>
      <span className="config-value">{value}</span>
    </div>
  );
}
