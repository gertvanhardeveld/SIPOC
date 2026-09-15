import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/AuthContext";
import LoginPage from "./pages/LoginPage";
import Sidebar from "./components/Sidebar";
import EmptyState from "./pages/EmptyState";
import ProcessPage from "./pages/ProcessPage";
import AccessPage from "./pages/AccessPage";
import ProcessChainsPage from "./pages/ProcessChainsPage";

export default function App() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-grey-text">
        Laden…
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="app-shell flex h-screen overflow-hidden">
      <Sidebar />
      <main className="app-main flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<EmptyState />} />
          <Route path="/proces/:id" element={<ProcessPage />} />
          <Route path="/toegang" element={<AccessPage />} />
          <Route path="/procesketens" element={<ProcessChainsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
