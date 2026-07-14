import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Package, 
  Tags, 
  Truck, 
  Home, 
  Boxes, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ArrowLeftRight, 
  BarChart3, 
  Users, 
  LogOut,
  Warehouse
} from 'lucide-react';

const Sidebar = ({ currentPage, setCurrentPage }) => {
  const { user, logout, isAdmin } = useAuth();

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: <LayoutDashboard size={20} />, roles: ['admin', 'manager', 'staff'] },
    { id: 'products', name: 'Products', icon: <Package size={20} />, roles: ['admin', 'manager', 'staff'] },
    { id: 'categories', name: 'Categories', icon: <Tags size={20} />, roles: ['admin', 'manager', 'staff'] },
    { id: 'suppliers', name: 'Suppliers', icon: <Truck size={20} />, roles: ['admin', 'manager', 'staff'] },
    { id: 'warehouses', name: 'Warehouses', icon: <Warehouse size={20} />, roles: ['admin', 'manager', 'staff'] },
    { id: 'inventory', name: 'Inventory & Stock', icon: <Boxes size={20} />, roles: ['admin', 'manager', 'staff'] },
    { id: 'stock-in', name: 'Stock In', icon: <ArrowDownLeft size={20} />, roles: ['admin', 'manager', 'staff'] },
    { id: 'stock-out', name: 'Stock Out', icon: <ArrowUpRight size={20} />, roles: ['admin', 'manager', 'staff'] },
    { id: 'stock-transfer', name: 'Stock Transfer', icon: <ArrowLeftRight size={20} />, roles: ['admin', 'manager', 'staff'] },
    { id: 'reports', name: 'Reports', icon: <BarChart3 size={20} />, roles: ['admin', 'manager', 'staff'] },
    { id: 'users', name: 'User Management', icon: <Users size={20} />, roles: ['admin'] },
  ];

  const filteredItems = menuItems.filter(item => user && item.roles.includes(user.role));

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin': return 'badge-danger';
      case 'manager': return 'badge-warning';
      default: return 'badge-success';
    }
  };

  return (
    <div className="sidebar" style={{
      width: 'var(--sidebar-width)',
      height: '100vh',
      backgroundColor: 'var(--bg-sidebar)',
      color: 'var(--text-on-sidebar)',
      position: 'fixed',
      top: 0,
      left: 0,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
      borderRight: '1px solid var(--border-sidebar)',
      boxShadow: 'var(--shadow-lg)'
    }}>
      {/* Title */}
      <div style={{
        height: 'var(--header-height)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 1.5rem',
        borderBottom: '1px solid var(--border-sidebar)',
        gap: '0.75rem'
      }}>
        <Boxes size={28} className="text-primary" style={{ color: 'var(--primary)' }} />
        <div>
          <h2 style={{ fontSize: '1.25rem', color: '#ffffff', fontWeight: 800, letterSpacing: '0.5px' }}>WMS CORE</h2>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-sidebar-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Management System</span>
        </div>
      </div>

      {/* Nav Menu */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 0.75rem' }}>
        <ul style={{ listStyle: 'none' }}>
          {filteredItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <li key={item.id} style={{ marginBottom: '0.35rem' }}>
                <button
                  onClick={() => setCurrentPage(item.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.85rem',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: isActive ? 'var(--primary)' : 'transparent',
                    color: isActive ? '#ffffff' : 'var(--text-sidebar-muted)',
                    cursor: 'pointer',
                    fontSize: '0.925rem',
                    fontWeight: 600,
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = '#ffffff';
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = 'var(--text-sidebar-muted)';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {item.icon}
                  {item.name}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* User Info & Logout */}
      {user && (
        <div style={{
          padding: '1.25rem',
          borderTop: '1px solid var(--border-sidebar)',
          backgroundColor: 'rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.1rem',
              boxShadow: 'var(--shadow-sm)'
            }}>
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.full_name}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '2px' }}>
                <span className={`badge ${getRoleBadge(user.role)}`} style={{ fontSize: '0.6rem', padding: '1px 5px', fontWeight: 800 }}>
                  {user.role}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-sidebar-muted)' }}>@{user.username}</span>
              </div>
            </div>
          </div>
          
          <button
            onClick={logout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.625rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-sidebar)',
              backgroundColor: 'transparent',
              color: '#f87171',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.875rem',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)';
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = 'var(--border-sidebar)';
            }}
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
