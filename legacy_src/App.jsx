import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from '@/pages/HomePage';
import StagePage from '@/pages/StagePage';
import AdminLoginPage from '@/pages/AdminLoginPage';
import AdminDashboardPage from '@/pages/AdminDashboardPage';
import LiveControllerPage from '@/pages/admin/LiveControllerPage';
import QuestionBankPage from '@/pages/admin/QuestionBankPage';
import ZonesSetupPage from '@/pages/admin/ZonesSetupPage';
import GrandPodiumPage from '@/pages/admin/GrandPodiumPage';
import SecurityPage from '@/pages/admin/SecurityPage';
import { useAuthStore } from '@/stores/authStore';

import TeamClientPage from '@/pages/TeamClientPage';
import AudiencePage from '@/pages/AudiencePage';

function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/stage" element={<StagePage />} />
      <Route path="/play" element={<TeamClientPage />} />
      <Route path="/join" element={<AudiencePage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<ProtectedRoute><AdminDashboardPage /></ProtectedRoute>} />
      <Route path="/admin/live" element={<ProtectedRoute><LiveControllerPage /></ProtectedRoute>} />
      <Route path="/admin/questions" element={<ProtectedRoute><QuestionBankPage /></ProtectedRoute>} />
      <Route path="/admin/zones" element={<ProtectedRoute><ZonesSetupPage /></ProtectedRoute>} />
      <Route path="/admin/podium" element={<ProtectedRoute><GrandPodiumPage /></ProtectedRoute>} />
      <Route path="/admin/security" element={<ProtectedRoute><SecurityPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
