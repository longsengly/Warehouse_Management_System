import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Search, Boxes, Sliders, History, X, Loader, Plus, AlertTriangle, ArrowRight } from 'lucide-react';

const Inventory = () => {
  const { isManager } = useAuth();
  const [activeTab, setActiveTab] = useState('stock'); // 'stock', 'adjustments', 'movements'
  const [inventory, setInventory] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [movements, setMovements] = useState([]);
  
  const [search, setSearch] = useState('');
  const [selectedWh, setSelectedWh] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Adjustment Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [adjProductId, setAdjProductId] = useState('');
  const [adjWarehouseId, setAdjWarehouseId] = useState('');
  const [adjType, setAdjType] = useState('increase'); // 'increase', 'decrease'
  const [adjQty, setAdjQty] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchInventoryData = async () => {
    setLoading(true);
    try {
      const whData = await api.get('/warehouses');
      setWarehouses(whData);

      if (activeTab === 'stock') {
        let query = `/inventory?search=${search}`;
        if (selectedWh) query += `&warehouse_id=${selectedWh}`;
        const invData = await api.get(query);
        setInventory(invData);
      } else if (activeTab === 'adjustments') {
        const adjData = await api.get('/inventory/adjustments');
        setAdjustments(adjData);
      } else if (activeTab === 'movements') {
        const movData = await api.get('/inventory/movements');
        setMovements(movData);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch inventory records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, [activeTab, search, selectedWh]);

  const handleOpenAdjust = async () => {
    setError('');
    try {
      const prodData = await api.get('/products');
      setProducts(prodData);
      
      setAdjProductId(prodData[0]?.id || '');
      setAdjWarehouseId(warehouses[0]?.id || '');
      setAdjType('increase');
      setAdjQty('');
      setAdjReason('');
      setModalOpen(true);
    } catch (err) {
      setError('Failed to fetch product list for adjustment');
    }
  };

  const handleAdjustmentSubmit = async (e) => {
    e.preventDefault();
    if (!adjProductId || !adjWarehouseId || !adjQty || !adjReason.trim()) return;

    setSubmitLoading(true);
    setError('');

    try {
      await api.post('/inventory/adjust', {
        product_id: parseInt(adjProductId),
        warehouse_id: parseInt(adjWarehouseId),
        type: adjType,
        quantity: parseInt(adjQty),
        reason: adjReason
      });
      
      setSuccess('Inventory adjusted successfully');
      setModalOpen(false);
      fetchInventoryData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Adjustment failed');
    } finally {
      setSubmitLoading(false);
    }
  };

  const getMovementTypeBadge = (type) => {
    switch (type) {
      case 'stock_in': return 'badge-success';
      case 'stock_out': return 'badge-danger';
      case 'transfer_in': return 'badge-info';
      case 'transfer_out': return 'badge-warning';
      default: return 'badge-success'; // adjustment
    }
  };

  return (
    <div>
      {/* Banner Notifications */}
      {success && (
        <div className="card" style={{ borderLeft: '4px solid var(--success)', padding: '0.75rem 1.25rem', backgroundColor: 'var(--success-light)', color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{success}</span>
          <button onClick={() => setSuccess('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}><X size={16} /></button>
        </div>
      )}

      {error && (
        <div className="card" style={{ borderLeft: '4px solid var(--danger)', padding: '0.75rem 1.25rem', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}><X size={16} /></button>
        </div>
      )}

      {/* Tabs Menu Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', flexWrap: 'wrap' }} className="no-print">
        <button 
          onClick={() => setActiveTab('stock')} 
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            color: activeTab === 'stock' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'stock' ? '3px solid var(--primary)' : '3px solid transparent',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Boxes size={18} />
          Current Stock
        </button>

        <button 
          onClick={() => setActiveTab('adjustments')} 
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            color: activeTab === 'adjustments' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'adjustments' ? '3px solid var(--primary)' : '3px solid transparent',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Sliders size={18} />
          Manual Adjustments
        </button>

        <button 
          onClick={() => setActiveTab('movements')} 
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            color: activeTab === 'movements' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'movements' ? '3px solid var(--primary)' : '3px solid transparent',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <History size={18} />
          Detailed Movement Logs
        </button>
      </div>

      {/* Top Controls Grid (Search and Action) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }} className="no-print">
        {activeTab === 'stock' ? (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
            <div style={{ position: 'relative', width: '260px', maxWidth: '100%' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '38px' }}
                placeholder="Search SKU or Name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <select 
              className="form-control" 
              style={{ width: '180px' }}
              value={selectedWh}
              onChange={(e) => setSelectedWh(e.target.value)}
            >
              <option value="">All Warehouses</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
        ) : <div style={{ flex: 1 }} />}

        {isManager && (
          <button className="btn btn-secondary" onClick={handleOpenAdjust}>
            <Sliders size={16} />
            Adjust Stock
          </button>
        )}
      </div>

      {/* Tables based on tabs */}
      {loading && <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>Loading inventory data...</div>}

      {!loading && activeTab === 'stock' && (
        <>
          {inventory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem' }} className="card">
              <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>No stock entries found</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>SKU Code</th>
                    <th>Product Name</th>
                    <th>Warehouse Location</th>
                    <th>Stock Quantity</th>
                    <th>Reserved Stock</th>
                    <th>Available Stock</th>
                    <th>Alert Status</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((inv) => {
                    const isLow = inv.current_stock < inv.min_stock;
                    const isOut = inv.current_stock <= 0;
                    
                    return (
                      <tr key={inv.id}>
                        <td style={{ fontWeight: 800 }}>{inv.sku}</td>
                        <td style={{ fontWeight: 700 }}>{inv.product_name}</td>
                        <td>{inv.warehouse_name}</td>
                        <td style={{ fontWeight: 800 }}>{inv.current_stock} {inv.unit}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{inv.reserved_stock} {inv.unit}</td>
                        <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                          {inv.current_stock - inv.reserved_stock} {inv.unit}
                        </td>
                        <td>
                          {isOut ? (
                            <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>Out of Stock</span>
                          ) : isLow ? (
                            <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>Low Stock</span>
                          ) : (
                            <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Normal</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {!loading && activeTab === 'adjustments' && (
        <>
          {adjustments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem' }} className="card">
              <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>No adjustment logs found</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Warehouse</th>
                    <th>Type</th>
                    <th>Quantity</th>
                    <th>Reason / Details</th>
                    <th>User</th>
                    <th>Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustments.map((adj) => (
                    <tr key={adj.id}>
                      <td style={{ fontWeight: 700 }}>{adj.product_name}</td>
                      <td>{adj.warehouse_name}</td>
                      <td>
                        <span className={`badge ${adj.type === 'increase' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.65rem' }}>
                          {adj.type}
                        </span>
                      </td>
                      <td style={{ fontWeight: 800, color: adj.type === 'increase' ? 'var(--success)' : 'var(--danger)' }}>
                        {adj.type === 'increase' ? `+${adj.quantity}` : `-${adj.quantity}`}
                      </td>
                      <td>{adj.reason}</td>
                      <td><strong>@{adj.username}</strong></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {new Date(adj.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {!loading && activeTab === 'movements' && (
        <>
          {movements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem' }} className="card">
              <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>No movement logs found</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Warehouse</th>
                    <th>Qty Changed</th>
                    <th>Action Type</th>
                    <th>Recorded By</th>
                    <th>Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((mov) => (
                    <tr key={mov.id}>
                      <td style={{ fontWeight: 700 }}>{mov.product_name}</td>
                      <td style={{ fontWeight: 800, color: 'var(--primary)' }}>{mov.sku}</td>
                      <td>{mov.warehouse_name}</td>
                      <td style={{ fontWeight: 800, color: mov.quantity_changed > 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {mov.quantity_changed > 0 ? `+${mov.quantity_changed}` : mov.quantity_changed}
                      </td>
                      <td>
                        <span className={`badge ${getMovementTypeBadge(mov.type)}`} style={{ fontSize: '0.65rem' }}>
                          {mov.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td><strong>@{mov.username}</strong></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {new Date(mov.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Adjust Stock Modal */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontWeight: 800 }}>Adjust Stock Quantities</h3>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAdjustmentSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="adj-prod">Select Product *</label>
                  <select
                    id="adj-prod"
                    className="form-control"
                    value={adjProductId}
                    onChange={(e) => setAdjProductId(e.target.value)}
                    required
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="adj-wh">Target Warehouse Location *</label>
                  <select
                    id="adj-wh"
                    className="form-control"
                    value={adjWarehouseId}
                    onChange={(e) => setAdjWarehouseId(e.target.value)}
                    required
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name} (Capacity: {w.capacity})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Adjustment Type *</label>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 600 }}>
                        <input 
                          type="radio" 
                          name="adj_type" 
                          value="increase" 
                          checked={adjType === 'increase'} 
                          onChange={() => setAdjType('increase')}
                        />
                        Stock In (Add)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 600 }}>
                        <input 
                          type="radio" 
                          name="adj_type" 
                          value="decrease" 
                          checked={adjType === 'decrease'} 
                          onChange={() => setAdjType('decrease')}
                        />
                        Stock Out (Deduct)
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="adj-qty">Quantity *</label>
                    <input
                      id="adj-qty"
                      type="number"
                      min="1"
                      className="form-control"
                      placeholder="e.g. 50"
                      value={adjQty}
                      onChange={(e) => setAdjQty(e.target.value)}
                      required
                      disabled={submitLoading}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="adj-reason">Reason / Notes *</label>
                  <input
                    id="adj-reason"
                    type="text"
                    className="form-control"
                    placeholder="e.g., Annual count correction, damaged item removal"
                    value={adjReason}
                    onChange={(e) => setAdjReason(e.target.value)}
                    required
                    disabled={submitLoading}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)} disabled={submitLoading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitLoading || !adjQty || !adjReason.trim()}>
                  {submitLoading ? <Loader className="animate-spin" size={16} /> : 'Submit Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
