import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { NewProjectPage } from './pages/NewProjectPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AdminPortalPage } from './pages/AdminPortalPage';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isPublicPage = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register';

  if (isPublicPage) {
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
    <AuthProvider>
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/admin" element={<AdminPortalPage />} />
            <Route path="/new-project" element={<NewProjectPage />} />
            <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;

