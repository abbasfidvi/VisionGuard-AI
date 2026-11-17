import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { predictImage } from "../services/api";
import "./Inspection.css";

export default function Inspection() {
  // State for the selected image file
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // State for the prediction result
  const [result, setResult] = useState(null);

  // Loading state while calling the API
  const [loading, setLoading] = useState(false);

  // Error message to show if something goes wrong
  const [error, setError] = useState(null);

  // Called when user drops or selects an image
  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);  // Clear any previous result
    setError(null);
  }, []);

  // Configure react-dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"] },
    maxFiles: 1,
  });

  // Remove the selected image
  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
  };

  // Send image to backend for inspection
  const handleInspect = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await predictImage(selectedFile);
      setResult(data);
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        "Inspection failed. Make sure the backend is running and the model is trained.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Reset everything to inspect another product
  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="inspection-page">
      <div className="page-header">
        <h1 className="page-title">New Inspection</h1>
        <p className="page-subtitle">
          Upload a casting product image to inspect its quality using AI
        </p>
      </div>

      {/* Main inspection layout - split into two columns when result is shown */}
      <div className={`inspection-layout ${result ? "has-result" : ""}`}>
        {/* Left column: Image upload */}
        <div className="card upload-card">
          <div className="section-title">📤 Upload Product Image</div>

          {!selectedFile ? (
            /* Drag & Drop zone */
            <div
              {...getRootProps()}
              className={`dropzone ${isDragActive ? "drag-active" : ""}`}
            >
              <input {...getInputProps()} />
              <div className="dropzone-icon">📷</div>
              <p className="dropzone-text">
                {isDragActive
                  ? "Drop the image here..."
                  : "Drag & drop a product image here"}
              </p>
              <p className="dropzone-subtext">or</p>
              <button type="button" className="btn btn-primary">
                Browse Image
              </button>
              <p className="dropzone-hint">
                Supports JPG, JPEG, PNG • Max 10 MB
              </p>
            </div>
          ) : (
            /* Image Preview */
            <div className="image-preview-area">
              <img
                src={previewUrl}
                alt="Selected product"
                className="preview-image"
              />
              <div className="preview-info">
                <span className="preview-filename">{selectedFile.name}</span>
                <span className="preview-size">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </span>
              </div>
              <div className="preview-actions">
                <button className="btn btn-secondary" onClick={handleRemoveImage}>
                  🗑️ Remove
                </button>
                <button
                  className="btn btn-primary inspect-btn"
                  onClick={handleInspect}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="btn-spinner"></span>
                      Analyzing...
                    </>
                  ) : (
                    "🔬 Inspect Product"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="inspection-error">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Right column: Result (only shown after inspection) */}
        {result && (
          <InspectionResult result={result} onReset={handleReset} />
        )}
      </div>

      {/* Conveyor simulation - always visible */}
      <ConveyorSimulation result={result} loading={loading} />
    </div>
  );
}

// ─── Inspection Result Component ──────────────────────────────────────────────

function InspectionResult({ result, onReset }) {
  const isGood = result.prediction === "GOOD";
  const isUncertain = result.is_uncertain;

  return (
    <div className={`card result-card ${isUncertain ? "uncertain" : isGood ? "result-good" : "result-defective"}`}>
      {/* Decision banner */}
      <div className={`decision-banner ${isUncertain ? "banner-uncertain" : isGood ? "banner-good" : "banner-defective"}`}>
        <div className="decision-icon">
          {isUncertain ? "⚠️" : isGood ? "✅" : "🚫"}
        </div>
        <div className="decision-text">
          <div className="decision-label">
            {isUncertain ? "UNCERTAIN" : result.decision}
          </div>
          <div className="decision-message">{result.message}</div>
        </div>
      </div>

      {/* Metrics */}
      <div className="result-metrics">
        <MetricRow label="Prediction" value={result.prediction} highlight={isGood ? "green" : "red"} />
        <MetricRow label="Confidence" value={`${result.confidence.toFixed(1)}%`} />
        <MetricRow label="Decision" value={result.decision} highlight={isGood ? "green" : "red"} />
        <MetricRow
          label="Rejection Signal"
          value={result.rejection_signal ? "ACTIVATED 🔴" : "OFF 🟢"}
          highlight={result.rejection_signal ? "red" : "green"}
        />
        <MetricRow label="Inspection ID" value={`#${result.inspection_id}`} mono />
      </div>

      {/* Probability bars */}
      {result.probabilities && (
        <div className="probability-section">
          <div className="section-title" style={{ fontSize: 14, marginBottom: 12 }}>
            Class Probabilities
          </div>
          <ProbBar label="GOOD" value={result.probabilities.GOOD} color="var(--green)" />
          <ProbBar label="DEFECTIVE" value={result.probabilities.DEFECTIVE} color="var(--red)" />
        </div>
      )}

      {/* Model note */}
      <p className="result-note">
        ℹ️ Model confidence is not a guarantee of prediction correctness. 
        This model is trained specifically for metal casting impeller inspection.
      </p>

      <button className="btn btn-secondary" onClick={onReset} style={{ marginTop: 16, width: "100%" }}>
        🔄 Inspect Another Product
      </button>
    </div>
  );
}

function MetricRow({ label, value, highlight, mono }) {
  const colors = { green: "var(--green-light)", red: "var(--red-light)" };
  return (
    <div className="metric-row">
      <span className="metric-label">{label}</span>
      <span
        className="metric-value"
        style={{
          color: highlight ? colors[highlight] : "var(--text-primary)",
          fontFamily: mono ? "var(--font-mono)" : undefined,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function ProbBar({ label, value, color }) {
  return (
    <div className="prob-bar-row">
      <span className="prob-label">{label}</span>
      <div className="prob-bar-track">
        <div
          className="prob-bar-fill"
          style={{ width: `${value}%`, background: color }}
        ></div>
      </div>
      <span className="prob-value">{value.toFixed(1)}%</span>
    </div>
  );
}

// ─── Conveyor Belt Simulation ──────────────────────────────────────────────────

function ConveyorSimulation({ result, loading }) {
  const isGood = result?.prediction === "GOOD";
  const isDefective = result?.prediction === "DEFECTIVE";

  return (
    <div className="card conveyor-card" style={{ marginTop: 16 }}>
      <div className="section-title">🏭 Manufacturing Line Simulation</div>
      <div className="conveyor-track">
        {/* Stages */}
        <ConveyorStage
          label="Product Loaded"
          icon="📦"
          active={!!result || loading}
          done={!!result}
        />
        <ConveyorArrow active={loading || !!result} />
        <ConveyorStage
          label="AI Inspection"
          icon="🤖"
          active={loading || !!result}
          done={!!result}
          loading={loading}
        />
        <ConveyorArrow active={!!result} />
        <ConveyorStage
          label="Quality Decision"
          icon="⚖️"
          active={!!result}
          done={!!result}
        />
        <ConveyorArrow active={!!result} />
        {/* ACCEPT or REJECT */}
        <ConveyorStage
          label={isDefective ? "REJECT" : "ACCEPT"}
          icon={isDefective ? "🚫" : "✅"}
          active={!!result}
          done={!!result}
          variant={isDefective ? "reject" : isGood ? "accept" : "default"}
        />
      </div>

      {/* Rejection signal indicator */}
      {result && (
        <div
          className={`rejection-signal ${isDefective ? "signal-on" : "signal-off"}`}
        >
          <span className="signal-dot"></span>
          <span className="signal-text">
            {isDefective
              ? "⚡ REJECTION SIGNAL ACTIVATED — Product diverted to reject bin"
              : "✅ PRODUCT PASSED QUALITY INSPECTION — Forwarded for shipping"}
          </span>
        </div>
      )}
    </div>
  );
}

function ConveyorStage({ label, icon, active, done, loading, variant = "default" }) {
  const variantClass = variant === "accept" ? "stage-accept" : variant === "reject" ? "stage-reject" : "";
  return (
    <div className={`conveyor-stage ${active ? "stage-active" : ""} ${variantClass}`}>
      <div className="stage-icon">
        {loading ? <span className="btn-spinner" style={{ width: 20, height: 20 }}></span> : icon}
      </div>
      <div className="stage-label">{label}</div>
      {done && !loading && <div className="stage-check">✓</div>}
    </div>
  );
}

function ConveyorArrow({ active }) {
  return (
    <div className={`conveyor-arrow ${active ? "arrow-active" : ""}`}>→</div>
  );
}
