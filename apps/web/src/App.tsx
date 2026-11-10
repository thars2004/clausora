import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { NewProjectPage } from './pages/NewProjectPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AdminPortalPage } from './pages/AdminPortalPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { MaintenancePage } from './pages/MaintenancePage';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  const knownInternalPrefixes = [
    '/dashboard',
    '/projects',
    '/new-project',
    '/analytics',
    '/admin',
  ];

  const isInternalPage = knownInternalPrefixes.some(
    (prefix) => location.pathname === prefix || location.pathname.startsWith(prefix + '/')
  );

  if (!isInternalPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppLayout>
            <Routes>
              {/* Public Pages */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/maintenance" element={<MaintenancePage />} />
              <Route path="/404" element={<NotFoundPage />} />

              {/* Protected Internal Pages - Authentication Required */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <AnalyticsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminPortalPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/new-project"
                element={
                  <ProtectedRoute>
                    <NewProjectPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects"
                element={
                  <ProtectedRoute>
                    <ProjectsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects/:projectId"
                element={
                  <ProtectedRoute>
                    <ProjectDetailPage />
                  </ProtectedRoute>
                }
              />

              {/* Fallback to 404 for any unmatched route */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
