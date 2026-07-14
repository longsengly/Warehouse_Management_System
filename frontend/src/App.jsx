import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Suppliers from './pages/Suppliers';
import Warehouses from './pages/Warehouses';
import Inventory from './pages/Inventory';
import StockIn from './pages/StockIn';
import StockOut from './pages/StockOut';
import StockTransfer from './pages/StockTransfer';
import Reports from './pages/Reports';
import Users from './pages/Users';

// Route Guard for authenticated pages
const ProtectedRoute = ({ requiredRole }) => {
  const { token, user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        gap: '1rem'
      }}>
        <div className="spinner" style={{
          width: '40px',
          height: '40px',
          border: '4px solid var(--border-color)',
          borderTop: '4px solid var(--primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ fontWeight: 600 }}>Verifying credentials...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    // If user lacks role and is not an admin, redirect back to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

// Route Guard for unauthenticated pages (like Login)
const PublicRoute = () => {
  const { token, user, loading } = useAuth();

  if (loading) {
    return null; // Let the authentication check complete silently on startup
  }

  if (token && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

// Layout Wrapper to sync navigation with React Router locations
const LayoutWrapper = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine current active page path segment
  const path = location.pathname.substring(1) || 'dashboard';

  // Map path to user-friendly titles
  const pageTitles = {
    'dashboard': 'Dashboard Overview',
    'products': 'Product Catalog',
    'categories': 'Product Categories',
    'suppliers': 'Supplier Directory',
    'warehouses': 'Warehouse Locations',
    'inventory': 'Inventory & Stock Control',
    'stock-in': 'Purchase Stock In',
    'stock-out': 'Dispatch Stock Out',
    'stock-transfer': 'Inter-Warehouse Transfers',
    'reports': 'System Reports & Logs',
    'users': 'User Account Management'
  };

  const currentPageName = pageTitles[path] || 'Warehouse Management';

  return (
    <Layout
      currentPage={path}
      setCurrentPage={(pageId) => navigate('/' + pageId)}
      currentPageName={currentPageName}
    >
      <Outlet />
    </Layout>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<Login />} />
            </Route>

            {/* Protected Routes (Require Authentication) */}
            <Route element={<ProtectedRoute />}>
              <Route element={<LayoutWrapper />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/products" element={<Products />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/suppliers" element={<Suppliers />} />
                <Route path="/warehouses" element={<Warehouses />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/stock-in" element={<StockIn />} />
                <Route path="/stock-out" element={<StockOut />} />
                <Route path="/stock-transfer" element={<StockTransfer />} />
                <Route path="/reports" element={<Reports />} />
                
                {/* Admin Only Route */}
                <Route element={<ProtectedRoute requiredRole="admin" />}>
                  <Route path="/users" element={<Users />} />
                </Route>
              </Route>
            </Route>

            {/* Fallback Catch-All */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
