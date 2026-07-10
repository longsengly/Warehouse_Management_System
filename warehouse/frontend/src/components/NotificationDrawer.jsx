import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { X, Bell, Check, AlertTriangle, AlertOctagon, Info } from 'lucide-react';

const NotificationDrawer = ({ isOpen, onClose, onRefreshCount }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.get('/notifications?unread_only=true');
      setNotifications(data);
      if (onRefreshCount) onRefreshCount(data.length);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const markAllRead = async () => {
    try {
      await api.put('/notifications/mark-all-read', {});
      setNotifications([]);
      if (onRefreshCount) onRefreshCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const markRead = async (id) => {
    try {
      await api.put(`/notifications/${id}`, { is_read: true });
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (onRefreshCount) onRefreshCount(notifications.length - 1);
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'out_of_stock':
        return <AlertOctagon className="text-danger" size={20} />;
      case 'low_stock':
        return <AlertTriangle className="text-warning" size={20} />;
      case 'expiring_soon':
        return <Info className="text-info" size={20} />;
      default:
        return <Bell className="text-primary" size={20} />;
    }
  };

  const getBadgeStyle = (type) => {
    switch (type) {
      case 'out_of_stock': return 'badge-danger';
      case 'low_stock': return 'badge-warning';
      case 'expiring_soon': return 'badge-info';
      default: return 'badge-success';
    }
  };

  return (
    <>
      {isOpen && (
        <div 
          className="modal-overlay" 
          style={{ background: 'rgba(0,0,0,0.3)', zIndex: 1050 }} 
          onClick={onClose}
        />
      )}
      <div className={`notification-drawer ${isOpen ? 'open' : ''}`}>
        <div className="modal-header" style={{ padding: '1.25rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bell size={20} className="text-primary" />
            Alert Notifications
            {notifications.length > 0 && (
              <span style={{ fontSize: '0.8rem', background: 'var(--danger-light)', color: 'var(--danger)', padding: '2px 8px', borderRadius: '10px' }}>
                {notifications.length} New
              </span>
            )}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Unread stock and status warnings
          </span>
          {notifications.length > 0 && (
            <button 
              onClick={markAllRead} 
              className="btn btn-sm btn-secondary" 
              style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px' }}
            >
              Mark all read
            </button>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          {loading && <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</p>}
          
          {!loading && notifications.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <Bell size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
              <p style={{ fontWeight: 600 }}>No unread notifications</p>
              <p style={{ fontSize: '0.85rem' }}>All clean! Stock levels are normal.</p>
            </div>
          )}

          {!loading && notifications.map((n) => (
            <div 
              key={n.id} 
              style={{ 
                display: 'flex', 
                gap: '0.75rem', 
                padding: '1rem', 
                borderRadius: '8px', 
                backgroundColor: 'var(--bg-primary)', 
                border: '1px solid var(--border-color)',
                marginBottom: '0.75rem',
                position: 'relative'
              }}
            >
              <div style={{ marginTop: '2px' }}>{getIcon(n.type)}</div>
              <div style={{ flex: 1, paddingRight: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.3, marginBottom: '0.25rem' }}>
                  {n.message}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span className={`badge ${getBadgeStyle(n.type)}`} style={{ fontSize: '0.65rem', padding: '2px 4px' }}>
                    {n.type.replace('_', ' ')}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => markRead(n.id)} 
                title="Mark as read"
                style={{ 
                  position: 'absolute', 
                  top: '10px', 
                  right: '10px',
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
                  borderRadius: '50%'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--success)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                <Check size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default NotificationDrawer;
