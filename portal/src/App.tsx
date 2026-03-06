import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import MyQuotes from '@/pages/MyQuotes';
import QuoteDetail from '@/pages/QuoteDetail';
import MyProjects from '@/pages/MyProjects';
import ProjectDetail from '@/pages/ProjectDetail';
import Profile from '@/pages/Profile';
import RequestQuote from '@/pages/RequestQuote';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="quotes" element={<MyQuotes />} />
        <Route path="quotes/:id" element={<QuoteDetail />} />
        <Route path="projects" element={<MyProjects />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="request-quote" element={<RequestQuote />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
