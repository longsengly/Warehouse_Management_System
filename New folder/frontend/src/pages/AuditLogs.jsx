import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck, Search, Filter, RefreshCw, ChevronLeft, ChevronRight,
  X, Eye, User, Clock, Tag, Server, Hash, Globe, Info, AlertTriangle,
  CheckCircle, LogIn, Trash2, PenLine, Plus, ArrowDownLeft, ArrowUpRight,
  ArrowLeftRight, Settings, UserPlus, UserMinus, UserCog
} from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

// ─── Action badge config ────────────────────────────────────────────────────
const ACTION_CONFIG = {
  login:        { label: 'Login',       color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  icon: <LogIn size={12}/> },
  login_failed: { label: 'Failed Login',color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: <AlertTriangle size={12}/> },
  create:       { label: 'Create',      color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', icon: <Plus size={12}/> },
  update:       { label: 'Update',      color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: <PenLine size={12}/> },
  delete:       { label: 'Delete',      color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: <Trash2 size={12}/> },
  adjust:       { label: 'Adjust',      color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', icon: <Settings size={12}/> },
  stock_in:     { label: 'Stock In',    color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: <ArrowDownLeft size={12}/> },
  stock_out:    { label: 'Stock Out',   color: '#f97316', bg: 'rgba(249,115,22,0.12)', icon: <ArrowUpRight size={12}/> },
  transfer:     { label: 'Transfer',    color: '#06b6d4', bg: 'rgba(6,182,212,0.12)',  icon: <ArrowLeftRight size={12}/> },
};

const ROLE_CONFIG = {
  admin:   { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  manager: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  staff:   { color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
};

const RESOURCE_OPTIONS = ['', 'auth', 'products', 'categories', 'suppliers', 'warehouses', 'inventory', 'transactions', 'users'];
const ACTION_OPTIONS   = ['', 'login', 'login_failed', 'create', 'update', 'delete', 'adjust', 'stock_in', 'stock_out', 'transfer'];
const PAGE_LIMIT = 25;

// ─── Helper: format ISO datetime ─────────────────────────────────────────────
function formatDT(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

// ─── ActionBadge ─────────────────────────────────────────────────────────────
function ActionBadge({ action }) {
  const cfg = ACTION_CONFIG[action] || { label: action, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', icon: <Tag size={12}/> };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 9px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700,
      color: cfg.color, backgroundColor: cfg.bg, border: `1px solid ${cfg.color}33`,
      whiteSpace: 'nowrap'
    }}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

// ─── RoleBadge ───────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const cfg = ROLE_CONFIG[role] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: '20px',
      fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.5px',
      color: cfg.color, backgroundColor: cfg.bg, textTransform: 'uppercase'
    }}>
      {role}
    </span>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ log, onClose }) {
  if (!log) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      backdropFilter: 'blur(4px)', animation: 'fadeIn 0.15s ease'
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)', borderRadius: 'var(--radius)',
        border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-xl)',
        width: '100%', maxWidth: '540px', overflow: 'hidden',
        animation: 'slideUp 0.2s ease'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.05))'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Eye size={18} color="#fff"/>
            </div>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Audit Log Details</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 1 }}>Entry #{log.id}</p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: '4px', borderRadius: '50%',
            display: 'flex', transition: 'all 0.15s'
          }}><X size={20}/></button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <DetailRow icon={<Clock size={15}/>} label="Timestamp" value={formatDT(log.created_at)} />
          <DetailRow icon={<User size={15}/>} label="User" value={
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <strong>{log.username}</strong> <RoleBadge role={log.role}/>
            </span>
          }/>
          <DetailRow icon={<Tag size={15}/>} label="Action" value={<ActionBadge action={log.action}/>}/>
          <DetailRow icon={<Server size={15}/>} label="Resource" value={
            <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: 'var(--text-primary)' }}>{log.resource}</span>
          }/>
          {log.resource_id && (
            <DetailRow icon={<Hash size={15}/>} label="Resource ID" value={log.resource_id}/>
          )}
          {log.ip_address && (
            <DetailRow icon={<Globe size={15}/>} label="IP Address" value={log.ip_address}/>
          )}
          {log.details && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Info size={15} style={{ color: 'var(--text-muted)' }}/>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Details</span>
              </div>
              <div style={{
                background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)', padding: '0.75rem 1rem',
                fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6
              }}>
                {log.details}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
      <div style={{ color: 'var(--text-muted)', marginTop: 1, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>{label}</p>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>{value}</div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AuditLogs() {
  const { token } = useAuth();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Filters
  const [username, setUsername] = useState('');
  const [action, setAction] = useState('');
  const [resource, setResource] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchLogs = useCallback(async (pg = 0) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('limit', PAGE_LIMIT + 1);
      params.set('offset', pg * PAGE_LIMIT);
      if (username.trim()) params.set('username', username.trim());
      if (action) params.set('action', action);
      if (resource) params.set('resource', resource);
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);

      const res = await fetch(`${API_BASE}/audit-logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
      const data = await res.json();
      setHasMore(data.length > PAGE_LIMIT);
      setLogs(data.slice(0, PAGE_LIMIT));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, username, action, resource, startDate, endDate]);

  useEffect(() => {
    fetchLogs(0);
    setPage(0);
  }, [action, resource, startDate, endDate]);

  const handleSearch = (e) => { e.preventDefault(); setPage(0); fetchLogs(0); };

  const handlePrev = () => { const p = page - 1; setPage(p); fetchLogs(p); };
  const handleNext = () => { const p = page + 1; setPage(p); fetchLogs(p); };

  return (
    <div style={{ padding: '2rem', maxWidth: '100%' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
        .audit-row:hover { background: var(--bg-hover) !important; }
        .filter-input {
          background: var(--bg-secondary); border: 1px solid var(--border-color);
          color: var(--text-primary); border-radius: var(--radius-sm);
          padding: 0.5rem 0.75rem; font-size: 0.875rem;
          outline: none; transition: border-color 0.15s, box-shadow 0.15s;
          width: 100%;
        }
        .filter-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-glow); }
        .filter-select {
          background: var(--bg-secondary); border: 1px solid var(--border-color);
          color: var(--text-primary); border-radius: var(--radius-sm);
          padding: 0.5rem 0.75rem; font-size: 0.875rem; outline: none;
          cursor: pointer; transition: border-color 0.15s;
        }
        .filter-select:focus { border-color: var(--primary); }
      `}</style>

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 'var(--radius-sm)',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99,102,241,0.35)'
          }}>
            <ShieldCheck size={22} color="#fff"/>
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>Audit Logs</h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>Track and monitor all user activity across the system</p>
          </div>
        </div>
        <button
          onClick={() => { setPage(0); fetchLogs(0); }}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.6rem 1.2rem', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)', background: 'var(--bg-card)',
            color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}/>
          Refresh
        </button>
      </div>

      {/* Filters Panel */}
      <div style={{
        background: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)',
        padding: '1.25rem 1.5rem', marginBottom: '1.5rem', boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Filter size={15} style={{ color: 'var(--text-muted)' }}/>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Filters</span>
        </div>
        <form onSubmit={handleSearch} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
          {/* Username search */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Username</label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}/>
              <input id="audit-search-username" className="filter-input" style={{ paddingLeft: '2rem' }}
                value={username} onChange={e => setUsername(e.target.value)} placeholder="Search user…"/>
            </div>
          </div>

          {/* Action filter */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Action</label>
            <select id="audit-filter-action" className="filter-select" style={{ width: '100%' }} value={action} onChange={e => setAction(e.target.value)}>
              <option value="">All Actions</option>
              {ACTION_OPTIONS.filter(Boolean).map(a => (
                <option key={a} value={a}>{ACTION_CONFIG[a]?.label || a}</option>
              ))}
            </select>
          </div>

          {/* Resource filter */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Resource</label>
            <select id="audit-filter-resource" className="filter-select" style={{ width: '100%' }} value={resource} onChange={e => setResource(e.target.value)}>
              <option value="">All Resources</option>
              {RESOURCE_OPTIONS.filter(Boolean).map(r => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>From Date</label>
            <input id="audit-filter-start-date" type="date" className="filter-input" value={startDate} onChange={e => setStartDate(e.target.value)}/>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>To Date</label>
            <input id="audit-filter-end-date" type="date" className="filter-input" value={endDate} onChange={e => setEndDate(e.target.value)}/>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button id="audit-btn-search" type="submit" style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
              padding: '0.55rem 1rem', borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem',
              transition: 'opacity 0.15s'
            }} onMouseEnter={e => e.currentTarget.style.opacity = '0.9'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              <Search size={14}/> Search
            </button>
            <button id="audit-btn-clear" type="button" onClick={() => { setUsername(''); setAction(''); setResource(''); setStartDate(''); setEndDate(''); setPage(0); fetchLogs(0); }}
              style={{
                padding: '0.55rem 0.85rem', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
                color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.875rem',
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
              <X size={14}/>
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
        {error && (
          <div style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', background: 'rgba(239,68,68,0.06)', borderBottom: '1px solid var(--border-color)' }}>
            <AlertTriangle size={16}/> {error}
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                {['Timestamp', 'User', 'Role', 'Action', 'Resource', 'Resource ID', 'IP Address', ''].map(h => (
                  <th key={h} style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ height: 14, borderRadius: 4, background: 'var(--bg-secondary)', animation: 'pulse 1.5s ease infinite', width: j === 0 ? 120 : j === 7 ? 32 : 80 }}/>
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <ShieldCheck size={40} style={{ opacity: 0.3, display: 'block', margin: '0 auto 0.75rem' }}/>
                  No audit logs found for the selected filters.
                </td></tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="audit-row" style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s', cursor: 'pointer' }}>
                  <td style={{ padding: '0.8rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Clock size={12} style={{ color: 'var(--text-muted)' }}/>
                      {formatDT(log.created_at)}
                    </div>
                  </td>
                  <td style={{ padding: '0.8rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: '0.7rem', fontWeight: 800
                      }}>{log.username.charAt(0).toUpperCase()}</div>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{log.username}</span>
                    </div>
                  </td>
                  <td style={{ padding: '0.8rem 1rem' }}><RoleBadge role={log.role}/></td>
                  <td style={{ padding: '0.8rem 1rem' }}><ActionBadge action={log.action}/></td>
                  <td style={{ padding: '0.8rem 1rem' }}>
                    <code style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: 4 }}>{log.resource}</code>
                  </td>
                  <td style={{ padding: '0.8rem 1rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{log.resource_id || '—'}</td>
                  <td style={{ padding: '0.8rem 1rem', fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {log.ip_address ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Globe size={11}/>{log.ip_address}</span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '0.8rem 1rem' }}>
                    <button id={`audit-view-${log.id}`} onClick={() => setSelectedLog(log)} style={{
                      background: 'none', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
                      padding: '4px 8px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4,
                      fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
                      <Eye size={12}/> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{
          padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg-secondary)', flexWrap: 'wrap', gap: '0.5rem'
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {loading ? '…' : `Showing ${logs.length} log${logs.length !== 1 ? 's' : ''}`} · Page {page + 1}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button id="audit-prev-page" onClick={handlePrev} disabled={page === 0} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '0.45rem 0.9rem', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)', background: 'var(--bg-card)',
              color: page === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
              cursor: page === 0 ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.8rem',
              opacity: page === 0 ? 0.5 : 1, transition: 'all 0.15s'
            }}>
              <ChevronLeft size={14}/> Prev
            </button>
            <button id="audit-next-page" onClick={handleNext} disabled={!hasMore} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '0.45rem 0.9rem', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)', background: 'var(--bg-card)',
              color: !hasMore ? 'var(--text-muted)' : 'var(--text-primary)',
              cursor: !hasMore ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.8rem',
              opacity: !hasMore ? 0.5 : 1, transition: 'all 0.15s'
            }}>
              Next <ChevronRight size={14}/>
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLog && <DetailModal log={selectedLog} onClose={() => setSelectedLog(null)}/>}
    </div>
  );
}
