import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Plus, Trash2, Calendar, FileText, Check, Loader, X } from 'lucide-react';

const StockIn = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  
  const [supplierId, setSupplierId] = useState('');
  const [receiveDate, setReceiveDate] = useState(() => {
    // Current date and time formatted for datetime-local input (YYYY-MM-DDThh:mm)
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  
  // Array of items to be received: { product_id, warehouse_id, batch_number, expiry_date, quantity, cost_price }
  const [items, setItems] = useState([
    { product_id: '', warehouse_id: '', batch_number: '', expiry_date: '', quantity: '', cost_price: '' }
  ]);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchFormDetails = async () => {
    setLoading(true);
    try {
      const supData = await api.get('/suppliers');
      const prodData = await api.get('/products');
      const whData = await api.get('/warehouses');
      
      setSuppliers(supData);
      setProducts(prodData);
      setWarehouses(whData);

      if (supData.length > 0) setSupplierId(supData[0].id.toString());
      
      // Initialize first item dropdown values
      setItems([{
        product_id: prodData[0]?.id.toString() || '',
        warehouse_id: whData[0]?.id.toString() || '',
        batch_number: '',
        expiry_date: '',
        quantity: '',
        cost_price: prodData[0]?.cost_price.toString() || ''
      }]);
    } catch (err) {
      setError('Failed to fetch transaction form lists');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFormDetails();
  }, []);

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        product_id: products[0]?.id.toString() || '',
        warehouse_id: warehouses[0]?.id.toString() || '',
        batch_number: '',
        expiry_date: '',
        quantity: '',
        cost_price: products[0]?.cost_price.toString() || ''
      }
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    // Auto-update default cost price when product changes
    if (field === 'product_id') {
      const selectedProd = products.find(p => p.id.toString() === value);
      if (selectedProd) {
        newItems[index]['cost_price'] = selectedProd.cost_price.toString();
      }
    }
    
    setItems(newItems);
  };

  // Computes the combined invoice total
  const getInvoiceTotal = () => {
    return items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const cost = parseFloat(item.cost_price) || 0;
      return sum + (qty * cost);
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supplierId || items.some(item => !item.product_id || !item.warehouse_id || !item.quantity || !item.cost_price)) {
      setError('Please check and fill in all item fields');
      return;
    }

    setSubmitLoading(true);
    setError('');
    
    const formattedPayload = {
      supplier_id: parseInt(supplierId),
      receive_date: new Date(receiveDate).toISOString(),
      items: items.map(item => ({
        product_id: parseInt(item.product_id),
        warehouse_id: parseInt(item.warehouse_id),
        batch_number: item.batch_number.trim() || null,
        expiry_date: item.expiry_date || null,
        quantity: parseInt(item.quantity),
        cost_price: parseFloat(item.cost_price)
      }))
    };

    try {
      await api.post('/transactions/stock-in', formattedPayload);
      setSuccess(`Inventory stocked in successfully! Transaction generated.`);
      
      // Reset form
      setReceiveDate(() => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
      });
      setItems([{
        product_id: products[0]?.id.toString() || '',
        warehouse_id: warehouses[0]?.id.toString() || '',
        batch_number: '',
        expiry_date: '',
        quantity: '',
        cost_price: products[0]?.cost_price.toString() || ''
      }]);
      
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Transaction submission failed');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>Loading form values...</div>;

  return (
    <div>
      {/* Alerts */}
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

      <form onSubmit={handleSubmit} className="card" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText className="text-primary" /> Purchase receiving entry
        </h3>

        {/* Top details layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="stockin-sup">Select Supplier Company *</label>
            <select
              id="stockin-sup"
              className="form-control"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              required
            >
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.contact_name || 'No contact name'})</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="stockin-date">Receiving Date & Time *</label>
            <input
              id="stockin-date"
              type="datetime-local"
              className="form-control"
              value={receiveDate}
              onChange={(e) => setReceiveDate(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Dynamic Items Table */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>Item List</h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {items.map((item, idx) => (
              <div 
                key={idx} 
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '3fr 2fr 2fr 2fr 1.5fr 1.5fr auto', 
                  gap: '0.75rem', 
                  alignItems: 'end',
                  backgroundColor: 'var(--bg-primary)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)'
                }}
              >
                {/* Product Select */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Product *</label>
                  <select
                    className="form-control"
                    value={item.product_id}
                    onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)}
                    required
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                </div>

                {/* Warehouse Select */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Warehouse *</label>
                  <select
                    className="form-control"
                    value={item.warehouse_id}
                    onChange={(e) => handleItemChange(idx, 'warehouse_id', e.target.value)}
                    required
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                {/* Batch No */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Batch Number</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Batch Code"
                    value={item.batch_number}
                    onChange={(e) => handleItemChange(idx, 'batch_number', e.target.value)}
                  />
                </div>

                {/* Expiry Date */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Expiry Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={item.expiry_date}
                    onChange={(e) => handleItemChange(idx, 'expiry_date', e.target.value)}
                  />
                </div>

                {/* Cost Price */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Unit Cost ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="form-control"
                    placeholder="Cost"
                    value={item.cost_price}
                    onChange={(e) => handleItemChange(idx, 'cost_price', e.target.value)}
                    required
                  />
                </div>

                {/* Quantity */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Qty *</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                    required
                  />
                </div>

                {/* Delete row */}
                <button
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  disabled={items.length === 1}
                  className="btn btn-danger"
                  style={{ padding: '0.625rem', borderRadius: 'var(--radius-sm)' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Control Buttons & Total */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <button type="button" className="btn btn-secondary" onClick={handleAddItem}>
            <Plus size={16} />
            Add Item Row
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginLeft: 'auto' }}>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Combined PO Value:</span>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>${getInvoiceTotal().toFixed(2)}</h3>
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 2rem' }} disabled={submitLoading}>
              {submitLoading ? <Loader className="animate-spin" size={18} /> : (
                <>
                  <Check size={18} /> Submit PO Receipt
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default StockIn;
