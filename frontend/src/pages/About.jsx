import "./About.css";

export default function About() {
  return (
    <div className="about-page">
      <div className="page-header">
        <h1 className="page-title">About Project</h1>
        <p className="page-subtitle">VisionGuard AI — AI-Powered Manufacturing Quality Inspection</p>
      </div>

      {/* Project overview banner */}
      <div className="card overview-banner">
        <div className="overview-icon">🛡️</div>
        <div>
          <h2>VisionGuard AI</h2>
          <p>
            An intelligent manufacturing quality inspection system powered by computer vision and
            deep learning. Designed to detect surface defects in metal casting products using
            a transfer learning approach with MobileNetV2.
          </p>
        </div>
      </div>

      <div className="about-grid">
        {/* Problem Statement */}
        <div className="card">
          <div className="section-title">🔴 Problem Statement</div>
          <p className="about-text">
            Manual quality inspection in manufacturing is time-consuming, expensive, and prone to
            human error. Detecting defects in metal casting products like pump impellers requires
            skilled operators and consistent attention.
          </p>
          <ul className="about-list">
            <li>High labor cost for continuous manual inspection</li>
            <li>Fatigue-induced errors by human inspectors</li>
            <li>Inconsistent quality decisions across shifts</li>
            <li>Delay in identifying defective batches</li>
          </ul>
        </div>

        {/* Proposed Solution */}
        <div className="card">
          <div className="section-title">🟢 Proposed Solution</div>
          <p className="about-text">
            VisionGuard AI automates the quality inspection process using a deep learning
            image classification model trained on real industrial casting images.
          </p>
          <ul className="about-list">
            <li>Upload a product image to the inspection dashboard</li>
            <li>AI model classifies it as GOOD or DEFECTIVE</li>
            <li>System generates ACCEPT or REJECT decision automatically</li>
            <li>Simulates rejection signal activation for defective products</li>
            <li>Maintains full inspection history and statistics</li>
          </ul>
        </div>
      </div>

      {/* Dataset Information */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-title">📦 Dataset</div>
        <div className="dataset-info">
          <div className="dataset-item">
            <span className="dataset-label">Name</span>
            <span>Casting Product Image Data for Quality Inspection</span>
          </div>
          <div className="dataset-item">
            <span className="dataset-label">Source</span>
            <a
              href="https://www.kaggle.com/datasets/ravirajsinh45/real-life-industrial-dataset-of-casting-product"
              target="_blank"
              rel="noopener noreferrer"
              className="dataset-link"
            >
              Kaggle — ravirajsinh45
            </a>
          </div>
          <div className="dataset-item">
            <span className="dataset-label">Images</span>
            <span>~7,348 real industrial images</span>
          </div>
          <div className="dataset-item">
            <span className="dataset-label">Product</span>
            <span>Submersible pump impellers (metal casting)</span>
          </div>
          <div className="dataset-item">
            <span className="dataset-label">Classes</span>
            <span>
              <span className="badge badge-good" style={{ marginRight: 6 }}>ok_front — GOOD</span>
              <span className="badge badge-defective">def_front — DEFECTIVE</span>
            </span>
          </div>
          <div className="dataset-item">
            <span className="dataset-label">Format</span>
            <span>Grayscale images (converted to RGB for MobileNetV2)</span>
          </div>
        </div>
      </div>

      {/* ML Approach */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-title">🤖 Machine Learning Approach</div>
        <div className="about-grid" style={{ gap: 12 }}>
          <div className="approach-step">
            <span className="step-badge">1</span>
            <div>
              <strong>Transfer Learning</strong>
              <p>MobileNetV2 pretrained on ImageNet used as feature extractor</p>
            </div>
          </div>
          <div className="approach-step">
            <span className="step-badge">2</span>
            <div>
              <strong>Fine-tuning</strong>
              <p>Custom classification head with Dense(1, sigmoid) for binary output</p>
            </div>
          </div>
          <div className="approach-step">
            <span className="step-badge">3</span>
            <div>
              <strong>Data Augmentation</strong>
              <p>Horizontal flip, rotation, zoom to improve generalization</p>
            </div>
          </div>
          <div className="approach-step">
            <span className="step-badge">4</span>
            <div>
              <strong>Evaluation</strong>
              <p>Accuracy, Precision, Recall, F1-score, Confusion Matrix</p>
            </div>
          </div>
        </div>
      </div>

      {/* System Workflow */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-title">⚙️ System Workflow</div>
        <div className="workflow">
          {[
            { icon: "📤", step: "Image Upload", desc: "User uploads casting product photo" },
            { icon: "🔄", step: "Preprocessing", desc: "Resize to 224×224, normalize to [-1, 1]" },
            { icon: "🤖", step: "AI Inference", desc: "MobileNetV2 predicts defect probability" },
            { icon: "⚖️", step: "Decision Engine", desc: "Confidence threshold applied" },
            { icon: "✅", step: "Accept / Reject", desc: "Quality decision with rejection signal" },
            { icon: "📋", step: "Record", desc: "Result saved to SQLite database" },
          ].map((w, i) => (
            <div key={i} className="workflow-step">
              <div className="workflow-icon">{w.icon}</div>
              <div className="workflow-arrow">↓</div>
              <div className="workflow-label">{w.step}</div>
              <div className="workflow-desc">{w.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Technologies */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-title">🛠️ Technologies Used</div>
        <div className="tech-grid">
          <TechBadge name="Python 3" color="#3776ab" />
          <TechBadge name="TensorFlow / Keras" color="#ff6f00" />
          <TechBadge name="MobileNetV2" color="#ff6f00" />
          <TechBadge name="FastAPI" color="#009688" />
          <TechBadge name="SQLite" color="#003b57" />
          <TechBadge name="React.js" color="#61dafb" />
          <TechBadge name="Vite" color="#646cff" />
          <TechBadge name="Recharts" color="#22c55e" />
          <TechBadge name="NumPy" color="#4dabcf" />
          <TechBadge name="Scikit-learn" color="#f7931e" />
          <TechBadge name="Pillow" color="#5a2ca0" />
          <TechBadge name="Axios" color="#5a29e4" />
        </div>
      </div>

      {/* Future Scope */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-title">🚀 Future Scope</div>
        <ul className="about-list">
          <li>Real-time conveyor belt camera integration</li>
          <li>Multi-class defect classification (cracks, porosity, misrun)</li>
          <li>Hardware integration with PLCs and rejection actuators</li>
          <li>Edge deployment on Raspberry Pi / Jetson Nano</li>
          <li>Statistical process control (SPC) charts</li>
          <li>Email/SMS alerts for rejection spikes</li>
          <li>Support for other product categories beyond casting impellers</li>
        </ul>
      </div>

      {/* Important note */}
      <div className="card note-card" style={{ marginTop: 16 }}>
        <div className="section-title">⚠️ Important Notes</div>
        <ul className="about-list">
          <li>This system is trained specifically on metal casting impeller images from the Kaggle dataset.</li>
          <li>It may not accurately classify images of other product types.</li>
          <li>The rejection mechanism is a software simulation only. No physical hardware is controlled.</li>
          <li>Model confidence does not guarantee prediction correctness.</li>
          <li>Predictions below the confidence threshold are flagged as UNCERTAIN and require manual review.</li>
        </ul>
      </div>
    </div>
  );
}

function TechBadge({ name, color }) {
  return (
    <div className="tech-badge" style={{ borderColor: color + "44", background: color + "18" }}>
      <span style={{ color }}>{name}</span>
    </div>
  );
}
