import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  Package, 
  Tags, 
  Truck, 
  Warehouse, 
  Boxes, 
  AlertTriangle, 
  AlertOctagon, 
  Calendar, 
  DollarSign,
  ArrowRight
} from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    try {
      const data = await api.get('/reports/dashboard-stats');
      setStats(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Poll stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-muted)' }}>Loading dashboard...</div>;
  }

  if (error) {
    return (
      <div className="card" style={{ borderLeft: '4px solid var(--danger)', padding: '1rem' }}>
        <p style={{ color: 'var(--danger)', fontWeight: 600 }}>Error loading dashboard statistics</p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{error}</p>
      </div>
    );
  }

  if (!stats) return null;

  const kpis = [
    { name: 'Total Products', value: stats.total_products, icon: <Package size={24} />, bg: 'var(--primary-light)', color: 'var(--primary)' },
    { name: 'Total Categories', value: stats.total_categories, icon: <Tags size={24} />, bg: 'var(--info-light)', color: 'var(--info)' },
    { name: 'Total Suppliers', value: stats.total_suppliers, icon: <Truck size={24} />, bg: 'var(--success-light)', color: 'var(--success)' },
    { name: 'Total Warehouses', value: stats.total_warehouses, icon: <Warehouse size={24} />, bg: 'var(--primary-light)', color: 'var(--primary)' },
    { name: 'Total In-Stock', value: stats.total_stock, icon: <Boxes size={24} />, bg: 'var(--success-light)', color: 'var(--success)' },
    { name: 'Low Stock Items', value: stats.low_stock_count, icon: <AlertTriangle size={24} />, bg: 'var(--warning-light)', color: 'var(--warning)', highlight: stats.low_stock_count > 0 },
    { name: 'Out of Stock', value: stats.out_of_stock_count, icon: <AlertOctagon size={24} />, bg: 'var(--danger-light)', color: 'var(--danger)', highlight: stats.out_of_stock_count > 0 },
    { name: 'Expiring Soon', value: stats.expiring_soon_count, icon: <Calendar size={24} />, bg: 'var(--warning-light)', color: 'var(--warning)' },
    { name: 'Inventory Value', value: `$${stats.total_inventory_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: <DollarSign size={24} />, bg: 'var(--success-light)', color: 'var(--success)' },
  ];

  const getMovementBadgeStyle = (type) => {
    switch (type) {
      case 'stock_in': return 'badge-success';
      case 'stock_out': return 'badge-danger';
      case 'transfer_in': return 'badge-info';
      case 'transfer_out': return 'badge-warning';
      default: return 'badge-success';
    }
  };

  return (
    <div>
      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="card" style={{
            padding: '1.25rem',
            borderLeft: kpi.highlight ? `4px solid ${kpi.color}` : '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: 0
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: kpi.bg,
              color: kpi.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {kpi.icon}
            </div>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>{kpi.name}</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '2px' }}>{kpi.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="dashboard-grid" style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Main Stock Movements Line Chart */}
          <div className="card" style={{ marginBottom: 0 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Stock Movements (Last 7 Days)</h3>
            <div style={{ width: '100%', height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.movement_chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                  <Legend />
                  <Line type="monotone" dataKey="stock_in" name="Stock In" stroke="#10b981" strokeWidth={3} activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="stock_out" name="Stock Out" stroke="#ef4444" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Warehouses stock bar chart */}
          <div className="card" style={{ marginBottom: 0 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Stock Distribution by Warehouse</h3>
            <div style={{ width: '100%', height: '250px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.warehouse_stats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="warehouse_name" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                  <Legend />
                  <Bar dataKey="total_stock" name="Total Items In-Stock" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Sidebar panels: Categories Pie & Recent movements */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Categories Chart */}
          <div className="card" style={{ marginBottom: 0 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Stock by Category</h3>
            <div style={{ width: '100%', height: '200px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {stats.category_stats.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No data</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.category_stats}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="total_stock"
                      nameKey="category_name"
                    >
                      {stats.category_stats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            
            {/* Pie Legends */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center', marginTop: '0.5rem' }}>
              {stats.category_stats.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                  <span style={{ display: 'block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: COLORS[i % COLORS.length] }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{c.category_name} ({c.total_stock})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent movements */}
          <div className="card" style={{ marginBottom: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Recent Stock Movements</h3>
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '350px' }}>
              {stats.recent_movements.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>No recent movements</p>
              ) : (
                stats.recent_movements.map((mov) => (
                  <div key={mov.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'between', // wait, justifyContent: space-between
                    padding: '0.65rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    fontSize: '0.825rem'
                  }}>
                    <div style={{ flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
                      <p style={{ fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {mov.product_name}
                      </p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '1px' }}>
                        {mov.warehouse_name} • {new Date(mov.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem', marginLeft: 'auto' }}>
                      <span className={`badge ${getMovementBadgeStyle(mov.type)}`} style={{ fontSize: '0.6rem', padding: '1px 4px' }}>
                        {mov.type.replace('_', ' ')}
                      </span>
                      <span style={{ 
                        fontWeight: 800, 
                        color: mov.quantity_changed > 0 ? 'var(--success)' : 'var(--danger)',
                        fontSize: '0.85rem'
                      }}>
                        {mov.quantity_changed > 0 ? `+${mov.quantity_changed}` : mov.quantity_changed}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Styles patch for missing flex layout properties in recent movements container */}
      <style>{`
        div[style*="justify-content: between"] {
          justify-content: space-between !important;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
