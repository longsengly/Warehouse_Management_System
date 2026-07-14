import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Plus, Trash2, FileText, Check, Loader, X, AlertCircle } from 'lucide-react';

const StockOut = () => {
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [inventory, setInventory] = useState([]); // Master inventory records for validation
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [issueDate, setIssueDate] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });

  // Array of items to be dispatced: { product_id, warehouse_id, quantity, selling_price }
  const [items, setItems] = useState([
    { product_id: '', warehouse_id: '', quantity: '', selling_price: '' }
  ]);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchFormDetails = async () => {
    setLoading(true);
    try {
      const prodData = await api.get('/products');
      const whData = await api.get('/warehouses');
      const invData = await api.get('/inventory');
      
      setProducts(prodData);
      setWarehouses(whData);
      setInventory(invData);

      setItems([{
        product_id: prodData[0]?.id.toString() || '',
        warehouse_id: whData[0]?.id.toString() || '',
        quantity: '',
        selling_price: prodData[0]?.selling_price.toString() || ''
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
        quantity: '',
        selling_price: products[0]?.selling_price.toString() || ''
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
    
    // Auto-update selling price when product changes
    if (field === 'product_id') {
      const selectedProd = products.find(p => p.id.toString() === value);
      if (selectedProd) {
        newItems[index]['selling_price'] = selectedProd.selling_price.toString();
      }
    }
    
    setItems(newItems);
  };

  // Helper to query remaining stock for a product in a warehouse
  const getAvailableStock = (prodId, whId) => {
    if (!prodId || !whId) return 0;
    const inv = inventory.find(i => i.product_id.toString() === prodId.toString() && i.warehouse_id.toString() === whId.toString());
    return inv ? inv.current_stock : 0;
  };

  const getInvoiceTotal = () => {
    return items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.selling_price) || 0;
      return sum + (qty * price);
    }, 0);
  };

  // Validate quantities before submission
  const validateItems = () => {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const available = getAvailableStock(item.product_id, item.warehouse_id);
      const req = parseInt(item.quantity) || 0;
      
      if (req > available) {
        const prod = products.find(p => p.id.toString() === item.product_id.toString());
        const wh = warehouses.find(w => w.id.toString() === item.warehouse_id.toString());
        return `Error: Requested ${req} of '${prod?.name || 'Item'}' but only ${available} is available in warehouse '${wh?.name || 'Location'}'`;
      }
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerName.trim() || items.some(item => !item.product_id || !item.warehouse_id || !item.quantity || !item.selling_price)) {
      setError('Please check and fill in all item fields');
      return;
    }

    const validationError = validateItems();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitLoading(true);
    setError('');
    
    const formattedPayload = {
      customer_name: customerName,
      issue_date: new Date(issueDate).toISOString(),
      items: items.map(item => ({
        product_id: parseInt(item.product_id),
        warehouse_id: parseInt(item.warehouse_id),
        quantity: parseInt(item.quantity),
        selling_price: parseFloat(item.selling_price)
      }))
    };

    try {
      await api.post('/transactions/stock-out', formattedPayload);
      setSuccess(`Stock dispatched successfully! Transaction complete.`);
      
      // Reload inventory values for future validations
      const invData = await api.get('/inventory');
      setInventory(invData);
      
      // Reset form
      setCustomerName('');
      setIssueDate(() => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
      });
      setItems([{
        product_id: products[0]?.id.toString() || '',
        warehouse_id: warehouses[0]?.id.toString() || '',
        quantity: '',
        selling_price: products[0]?.selling_price.toString() || ''
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
      {/* Messages */}
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
          <FileText className="text-primary" /> Stock Out Dispatch entry
        </h3>

        {/* Customer & Date */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="stockout-cust">Customer Name / Department *</label>
            <input
              id="stockout-cust"
              type="text"
              className="form-control"
              placeholder="e.g. Sales Department, Customer Jane"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
              disabled={submitLoading}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="stockout-date">Dispatch Date & Time *</label>
            <input
              id="stockout-date"
              type="datetime-local"
              className="form-control"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              required
              disabled={submitLoading}
            />
          </div>
        </div>

        {/* Items Table */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>Item List</h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {items.map((item, idx) => {
              const available = getAvailableStock(item.product_id, item.warehouse_id);
              const requested = parseInt(item.quantity) || 0;
              const hasError = requested > available;

              return (
                <div 
                  key={idx} 
                  style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '3fr 2.5fr 2fr 1.5fr auto', 
                    gap: '1rem', 
                    alignItems: 'end',
                    backgroundColor: 'var(--bg-primary)',
                    padding: '1rem',
                    borderRadius: 'var(--radius-sm)',
                    border: hasError ? '1px solid var(--danger)' : '1px solid var(--border-color)',
                    position: 'relative'
                  }}
                >
                  {/* Product */}
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

                  {/* Warehouse */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Warehouse Location *</label>
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

                  {/* Price */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Unit Price ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="form-control"
                      placeholder="Price"
                      value={item.selling_price}
                      onChange={(e) => handleItemChange(idx, 'selling_price', e.target.value)}
                      required
                    />
                  </div>

                  {/* Quantity */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: 0 }}>Qty *</label>
                      <span style={{ fontSize: '0.75rem', color: hasError ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 600 }}>
                        Avail: {available}
                      </span>
                    </div>
                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      required
                      style={{ borderColor: hasError ? 'var(--danger)' : 'var(--border-color)' }}
                    />
                  </div>

                  {/* Remove row */}
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    disabled={items.length === 1}
                    className="btn btn-danger"
                    style={{ padding: '0.625rem', borderRadius: 'var(--radius-sm)' }}
                  >
                    <Trash2 size={16} />
                  </button>
                  
                  {hasError && (
                    <div style={{ 
                      gridColumn: '1 / -1', 
                      color: 'var(--danger)', 
                      fontSize: '0.75rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      marginTop: '4px',
                      fontWeight: 600
                    }}>
                      <AlertCircle size={12} />
                      Insufficient stock. Available quantity is {available}.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Buttons & Total */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <button type="button" className="btn btn-secondary" onClick={handleAddItem}>
            <Plus size={16} />
            Add Item Row
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginLeft: 'auto' }}>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Combined Invoice Value:</span>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>${getInvoiceTotal().toFixed(2)}</h3>
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 2rem' }} disabled={submitLoading}>
              {submitLoading ? <Loader className="animate-spin" size={18} /> : (
                <>
                  <Check size={18} /> Submit Dispatch
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default StockOut;
