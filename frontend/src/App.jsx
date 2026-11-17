import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Inspection from "./pages/Inspection";
import History from "./pages/History";
import Performance from "./pages/Performance";
import About from "./pages/About";
import "./styles/global.css";

export default function App() {
  // Track which page is currently active
  const [activePage, setActivePage] = useState("dashboard");

  // Render the correct page based on activePage state
  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return <Dashboard onNavigate={setActivePage} />;
      case "inspect":
        return <Inspection />;
      case "history":
        return <History />;
      case "performance":
        return <Performance />;
      case "about":
        return <About />;
      default:
        return <Dashboard onNavigate={setActivePage} />;
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar navigation */}
      <Sidebar activePage={activePage} onNavigate={setActivePage} />

      {/* Main content area */}
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}
