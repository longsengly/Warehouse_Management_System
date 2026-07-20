import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Sun, Moon, Bell, Menu } from 'lucide-react';
import NotificationDrawer from './NotificationDrawer';

const Navbar = ({ currentPageName, onToggleMobileSidebar }) => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchUnreadCount = async () => {
    try {
      const data = await api.get('/notifications?unread_only=true');
      setUnreadCount(data.length);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      // Poll notifications count every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  return (
    <>
      <header className="header" style={{
        height: 'var(--header-height)',
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'between', // wait, justifyContent should be space-between
        padding: '0 2rem',
        position: 'sticky',
        top: 0,
        zIndex: 90,
        boxShadow: 'var(--shadow-sm)'
      }}>
        {/* Left Side: Mobile Toggle & Page Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            className="no-print"
            onClick={onToggleMobileSidebar} 
            style={{ 
              display: 'none', 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              color: 'var(--text-primary)',
              padding: '4px'
            }}
            // Reveal on mobile
            onLoad={(e) => {
              // we can handle display responsiveness via media query or inline styles. 
              // Inline style responsiveness via media queries is better handled in CSS, 
              // but we can do it inline in JS for ease, e.g. displaying button only on small widths.
            }}
          >
            <Menu size={24} />
          </button>
          
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
            {currentPageName}
          </h1>
        </div>

        {/* Right Side: Theme + Notifications */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: 'auto' }}>
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="no-print"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          {/* Notification Indicator */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="no-print"
            title="Notifications"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              position: 'relative',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                backgroundColor: 'var(--danger)',
                color: 'white',
                fontSize: '0.65rem',
                fontWeight: 800,
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 0 2px var(--bg-secondary)',
                animation: 'pulse 2s infinite'
              }}>
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Slide-over notifications drawer */}
      <NotificationDrawer 
        isOpen={drawerOpen} 
        onClose={() => setDrawerOpen(false)} 
        onRefreshCount={setUnreadCount}
      />
    </>
  );
};

export default Navbar;
