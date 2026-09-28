import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import DashboardPage from '../pages/DashboardPage';
import DetailPage from '../pages/DetailPage';
import HistoryPage from '../pages/HistoryPage';
import LoginPage from '../pages/LoginPage';
import ManageUsersPage from '../pages/ManageUsersPage';
import StandardsPage from '../pages/StandardsPage';
import NewInspectionPage from '../pages/NewInspectionPage';
import { useAppSelector } from '../store/hooks';

/** Route yang membutuhkan sesi login (placeholder hingga backend auth tersedia). */
function ProtectedRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Route khusus admin. Staff yang membuka URL-nya langsung dikembalikan ke dashboard. */
function AdminRoute({ children }: { children: ReactNode }) {
  const user = useAppSelector((s) => s.auth.user);
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/inspection/new"
        element={
          <ProtectedRoute>
            <AppLayout>
              <NewInspectionPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/inspection/history"
        element={
          <ProtectedRoute>
            <AppLayout>
              <HistoryPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/inspection/:id"
        element={
          <ProtectedRoute>
            <AppLayout>
              <DetailPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <AppLayout>
                <ManageUsersPage />
              </AppLayout>
            </AdminRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/standards"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <AppLayout>
                <StandardsPage />
              </AppLayout>
            </AdminRoute>
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
