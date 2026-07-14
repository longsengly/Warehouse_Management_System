import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit2, Trash2, Search, X, Loader, MapPin, BarChart } from 'lucide-react';

const Warehouses = () => {
  const { isManager } = useAuth();
  const [warehouses, setWarehouses] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [currentWarehouse, setCurrentWarehouse] = useState(null);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchWarehousesAndInventory = async () => {
    setLoading(true);
    try {
      const whData = await api.get(`/warehouses?search=${search}`);
      const invData = await api.get('/inventory');
      setWarehouses(whData);
      setInventory(invData);
    } catch (err) {
      setError(err.message || 'Failed to fetch warehouse information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehousesAndInventory();
  }, [search]);

  // Helper to calculate total stock inside a specific warehouse
  const getOccupiedStock = (whId) => {
    return inventory
      .filter(item => item.warehouse_id === whId)
      .reduce((sum, item) => sum + item.current_stock, 0);
  };

  const handleOpenCreate = () => {
    setCurrentWarehouse(null);
    setName('');
    setLocation('');
    setCapacity('');
    setModalOpen(true);
  };

  const handleOpenEdit = (wh) => {
    setCurrentWarehouse(wh);
    setName(wh.name);
    setLocation(wh.location);
    setCapacity(wh.capacity);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !location.trim() || !capacity) return;
    
    setSubmitLoading(true);
    setError('');
    const capInt = parseInt(capacity);
    
    try {
      if (currentWarehouse) {
        await api.put(`/warehouses/${currentWarehouse.id}`, { name, location, capacity: capInt });
        setSuccess('Warehouse updated successfully');
      } else {
        await api.post('/warehouses', { name, location, capacity: capInt });
        setSuccess('Warehouse created successfully');
      }
      setModalOpen(false);
      fetchWarehousesAndInventory();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save warehouse');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this warehouse? All empty stocks will be deleted.')) return;
    
    setError('');
    try {
      await api.delete(`/warehouses/${id}`);
      setSuccess('Warehouse deleted successfully');
      fetchWarehousesAndInventory();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to delete warehouse');
      setTimeout(() => setError(''), 4000);
    }
  };

  return (
    <div>
      {/* Top message widgets */}
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }} className="no-print">
        <div style={{ position: 'relative', width: '300px', maxWidth: '100%' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '38px' }}
            placeholder="Search warehouses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isManager && (
          <button className="btn btn-primary" onClick={handleOpenCreate}>
            <Plus size={18} />
            Add Warehouse
          </button>
        )}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>Loading warehouses...</div>}
      
      {!loading && warehouses.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }} className="card">
          <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>No warehouses found</p>
        </div>
      )}

      {!loading && warehouses.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {warehouses.map((wh) => {
            const occupied = getOccupiedStock(wh.id);
            const percentage = Math.min(Math.round((occupied / wh.capacity) * 100), 100);
            
            // Progress color
            let progressColor = 'var(--success)';
            if (percentage > 90) progressColor = 'var(--danger)';
            else if (percentage > 70) progressColor = 'var(--warning)';

            return (
              <div key={wh.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: 0 }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>{wh.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                    <MapPin size={14} className="text-muted" />
                    <span>{wh.location}</span>
                  </div>
                </div>

                {/* Capacity Gauges */}
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><BarChart size={12} /> Occupancy</span>
                    <span>{occupied.toLocaleString()} / {wh.capacity.toLocaleString()} units ({percentage}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: progressColor, borderRadius: '4px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>

                {/* Actions */}
                {isManager && (
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }} className="no-print">
                    <button 
                      className="btn btn-secondary btn-sm" 
                      onClick={() => handleOpenEdit(wh)}
                      title="Edit warehouse"
                    >
                      <Edit2 size={12} />
                      Edit
                    </button>
                    <button 
                      className="btn btn-danger btn-sm" 
                      onClick={() => handleDelete(wh.id)}
                      title="Delete warehouse"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontWeight: 800 }}>{currentWarehouse ? 'Edit Warehouse' : 'Create Warehouse'}</h3>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label" htmlFor="wh-name">Warehouse Name *</label>
                  <input
                    id="wh-name"
                    type="text"
                    className="form-control"
                    placeholder="e.g., Main Depot, Cold Storage"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={submitLoading}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="wh-location">Location Location Address *</label>
                  <input
                    id="wh-location"
                    type="text"
                    className="form-control"
                    placeholder="e.g., Industrial Sector 1, Cityville"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                    disabled={submitLoading}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="wh-cap">Max Storage Capacity (Units) *</label>
                  <input
                    id="wh-cap"
                    type="number"
                    min="1"
                    className="form-control"
                    placeholder="e.g., 5000"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    required
                    disabled={submitLoading}
                  />
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)} disabled={submitLoading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitLoading || !name.trim() || !location.trim() || !capacity}>
                  {submitLoading ? <Loader className="animate-spin" size={16} /> : (currentWarehouse ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Warehouses;
