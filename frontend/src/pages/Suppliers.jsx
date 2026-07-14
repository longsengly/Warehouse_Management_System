import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit2, Trash2, Search, X, Loader, FileText, Calendar, Phone, Mail } from 'lucide-react';

const Suppliers = () => {
  const { isManager } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal States for Edit/Create
  const [modalOpen, setModalOpen] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState(null);
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  // Purchase History States
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySupplier, setHistorySupplier] = useState(null);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/suppliers?search=${search}`);
      setSuppliers(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchSuppliers();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [search]);

  const handleOpenCreate = () => {
    setCurrentSupplier(null);
    setName('');
    setContactName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setModalOpen(true);
  };

  const handleOpenEdit = (sup) => {
    setCurrentSupplier(sup);
    setName(sup.name);
    setContactName(sup.contact_name || '');
    setPhone(sup.phone || '');
    setEmail(sup.email || '');
    setAddress(sup.address || '');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setSubmitLoading(true);
    setError('');
    const payload = { name, contact_name: contactName, phone, email, address };
    try {
      if (currentSupplier) {
        await api.put(`/suppliers/${currentSupplier.id}`, payload);
        setSuccess('Supplier updated successfully');
      } else {
        await api.post('/suppliers', payload);
        setSuccess('Supplier created successfully');
      }
      setModalOpen(false);
      fetchSuppliers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save supplier');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this supplier?')) return;
    
    setError('');
    try {
      await api.delete(`/suppliers/${id}`);
      setSuccess('Supplier deleted successfully');
      fetchSuppliers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to delete supplier');
      setTimeout(() => setError(''), 4000);
    }
  };

  const viewPurchaseHistory = async (sup) => {
    setHistorySupplier(sup);
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const data = await api.get(`/suppliers/${sup.id}/purchases`);
      setPurchaseHistory(data);
    } catch (err) {
      setError(err.message || 'Failed to load purchase history');
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div>
      {/* Banner message cards */}
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
            placeholder="Search suppliers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isManager && (
          <button className="btn btn-primary" onClick={handleOpenCreate}>
            <Plus size={18} />
            Add Supplier
          </button>
        )}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>Loading suppliers...</div>}
      
      {!loading && suppliers.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }} className="card">
          <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>No suppliers found</p>
        </div>
      )}

      {!loading && suppliers.length > 0 && (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Supplier Name</th>
                <th>Contact Person</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Address</th>
                <th className="no-print" style={{ width: '180px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((sup) => (
                <tr key={sup.id}>
                  <td style={{ fontWeight: 700 }}>{sup.name}</td>
                  <td>{sup.contact_name || '—'}</td>
                  <td>{sup.phone ? <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Phone size={12} /> {sup.phone}</span> : '—'}</td>
                  <td>{sup.email ? <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Mail size={12} /> {sup.email}</span> : '—'}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{sup.address || '—'}</td>
                  <td className="no-print" style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => viewPurchaseHistory(sup)}
                        title="View purchase history"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <FileText size={14} />
                        History
                      </button>
                      {isManager && (
                        <>
                          <button 
                            className="btn btn-secondary btn-sm" 
                            onClick={() => handleOpenEdit(sup)}
                            title="Edit supplier"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            className="btn btn-danger btn-sm" 
                            onClick={() => handleDelete(sup.id)}
                            title="Delete supplier"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontWeight: 800 }}>{currentSupplier ? 'Edit Supplier' : 'Create Supplier'}</h3>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label" htmlFor="sup-name">Supplier Company Name *</label>
                  <input
                    id="sup-name"
                    type="text"
                    className="form-control"
                    placeholder="e.g., Apex Tech Ltd"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={submitLoading}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="sup-contact">Contact Person Name</label>
                  <input
                    id="sup-contact"
                    type="text"
                    className="form-control"
                    placeholder="e.g., John Smith"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    disabled={submitLoading}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="sup-phone">Phone Number</label>
                    <input
                      id="sup-phone"
                      type="text"
                      className="form-control"
                      placeholder="e.g., +1 (555) 019-2834"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={submitLoading}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="sup-email">Email Address</label>
                    <input
                      id="sup-email"
                      type="email"
                      className="form-control"
                      placeholder="e.g., info@apex.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={submitLoading}
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label" htmlFor="sup-addr">Company Address</label>
                  <textarea
                    id="sup-addr"
                    className="form-control"
                    rows="3"
                    placeholder="Provide full address..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={submitLoading}
                  />
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)} disabled={submitLoading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitLoading || !name.trim()}>
                  {submitLoading ? <Loader className="animate-spin" size={16} /> : (currentSupplier ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Purchase History Modal */}
      {historyOpen && historySupplier && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontWeight: 800 }}>Purchase Receiving History</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Supplier: {historySupplier.name}</span>
              </div>
              <button onClick={() => setHistoryOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {historyLoading && <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>Loading records...</div>}
              
              {!historyLoading && purchaseHistory.length === 0 && (
                <p style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                  No past purchase receipts found for this supplier.
                </p>
              )}

              {!historyLoading && purchaseHistory.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {purchaseHistory.map((po) => (
                    <div key={po.id} className="card" style={{ padding: '1rem', marginBottom: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <strong style={{ fontSize: '0.95rem' }}>{po.transaction_no}</strong>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                            {new Date(po.receive_date).toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Received by: <strong>{po.username}</strong></span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {po.items.map((item, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            <span>{item.product_name} (SKU: {item.sku}) • Batch: {item.batch_number || 'N/A'}</span>
                            <span>{item.quantity} units x ${Number(item.cost_price).toFixed(2)} = <strong>${(item.quantity * item.cost_price).toFixed(2)}</strong></span>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
                        <span style={{ fontWeight: 800 }}>Total Value: ${Number(po.total_amount).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setHistoryOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;
