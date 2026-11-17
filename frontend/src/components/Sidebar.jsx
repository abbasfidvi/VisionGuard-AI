import { useState, useEffect } from "react";
import "../styles/sidebar.css";
import { checkHealth } from "../services/api";

// Navigation items
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "inspect", label: "New Inspection", icon: "🔬" },
  { id: "history", label: "Inspection History", icon: "📋" },
  { id: "performance", label: "Model Performance", icon: "📈" },
  { id: "about", label: "About Project", icon: "ℹ️" },
];

export default function Sidebar({ activePage, onNavigate }) {
  // System status state - fetched from the backend health endpoint
  const [status, setStatus] = useState({
    backend: false,
    modelLoaded: false,
    ready: false,
  });

  // Poll backend health every 5 seconds
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await checkHealth();
        setStatus({
          backend: true,
          modelLoaded: data.model_loaded,
          ready: data.inspection_system_ready,
        });
      } catch {
        setStatus({ backend: false, modelLoaded: false, ready: false });
      }
    };

    fetchStatus(); // Run immediately
    const interval = setInterval(fetchStatus, 5000); // Then every 5 seconds
    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  return (
    <aside className="sidebar">
      {/* Logo / Brand */}
      <div className="sidebar-logo">
        <div className="logo-icon">🛡️</div>
        <div className="logo-name">VisionGuard AI</div>
        <div className="logo-tagline">Quality Inspection System</div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Main Menu</div>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activePage === item.id ? "active" : ""}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* System Status */}
      <div className="sidebar-footer">
        <div className="system-status-label">System Status</div>

        <StatusRow
          label="Backend"
          value={status.backend ? "Online" : "Offline"}
          statusClass={status.backend ? "status-online" : "status-offline"}
          dotClass={status.backend ? "online" : "offline"}
        />
        <StatusRow
          label="AI Model"
          value={status.modelLoaded ? "Loaded" : "Not Loaded"}
          statusClass={status.modelLoaded ? "status-online" : "status-warning"}
          dotClass={status.modelLoaded ? "online" : "warning"}
        />
        <StatusRow
          label="System"
          value={status.ready ? "Ready" : "Not Ready"}
          statusClass={status.ready ? "status-online" : "status-offline"}
          dotClass={status.ready ? "online" : "offline"}
        />
      </div>
    </aside>
  );
}

// Small helper component for a status row in the footer
function StatusRow({ label, value, statusClass, dotClass }) {
  return (
    <div className="status-item">
      <span className="status-item-label">
        <span className={`status-dot ${dotClass}`}></span>
        {label}
      </span>
      <span className={`status-item-value ${statusClass}`}>{value}</span>
    </div>
  );
}
