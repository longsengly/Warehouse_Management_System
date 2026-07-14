import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Plus, Trash2, Calendar, FileText, Check, Loader, X, ArrowLeftRight, Search } from 'lucide-react';

const StockTransfer = () => {
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [sourceWarehouseId, setSourceWarehouseId] = useState('');
  const [destinationWarehouseId, setDestinationWarehouseId] = useState('');
  const [transferDate, setTransferDate] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });

  // Array of items to be transferred: { product_id, quantity }
  const [items, setItems] = useState([
    { product_id: '', quantity: '' }
  ]);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const whData = await api.get('/warehouses');
      const prodData = await api.get('/products');
      const invData = await api.get('/inventory');
      const trData = await api.get('/transactions/transfers');

      setWarehouses(whData);
      setProducts(prodData);
      setInventory(invData);
      setTransfers(trData);

      if (whData.length > 0) {
        setSourceWarehouseId(whData[0].id.toString());
        if (whData.length > 1) {
          setDestinationWarehouseId(whData[1].id.toString());
        } else {
          setDestinationWarehouseId(whData[0].id.toString());
        }
      }

      if (prodData.length > 0) {
        setItems([{
          product_id: prodData[0].id.toString(),
          quantity: ''
        }]);
      }
    } catch (err) {
      setError('Failed to fetch transfer form resources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Get current stock level for a product in the selected source warehouse
  const getSourceStock = (productId, sourceWhId) => {
    if (!productId || !sourceWhId) return 0;
    const invItem = inventory.find(
      (inv) => inv.product_id.toString() === productId.toString() && inv.warehouse_id.toString() === sourceWhId.toString()
    );
    return invItem ? invItem.current_stock : 0;
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        product_id: products[0]?.id.toString() || '',
        quantity: ''
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
    setItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sourceWarehouseId || !destinationWarehouseId) return;

    if (sourceWarehouseId === destinationWarehouseId) {
      setError('Source and destination warehouses must be different.');
      return;
    }

    // Basic validation checks
    for (const item of items) {
      if (!item.product_id || !item.quantity) {
        setError('Please select a product and quantity for all items.');
        return;
      }
      const qty = parseInt(item.quantity);
      if (isNaN(qty) || qty <= 0) {
        setError('Transfer quantity must be greater than zero.');
        return;
      }
      const sourceStock = getSourceStock(item.product_id, sourceWarehouseId);
      if (qty > sourceStock) {
        const prod = products.find(p => p.id.toString() === item.product_id.toString());
        setError(`Insufficient stock for product '${prod ? prod.name : 'Unknown'}'. Available: ${sourceStock}, Requested: ${qty}`);
        return;
      }
    }

    setSubmitLoading(true);
    setError('');

    try {
      const payload = {
        source_warehouse_id: parseInt(sourceWarehouseId),
        destination_warehouse_id: parseInt(destinationWarehouseId),
        transfer_date: transferDate,
        items: items.map(it => ({
          product_id: parseInt(it.product_id),
          quantity: parseInt(it.quantity)
        }))
      };

      await api.post('/transactions/transfer', payload);
      setSuccess('Stock transfer processed successfully');
      
      // Reset form
      setItems([{
        product_id: products[0]?.id.toString() || '',
        quantity: ''
      }]);
      
      // Refresh inventory levels and list of transfers
      const newInv = await api.get('/inventory');
      const newTrf = await api.get('/transactions/transfers');
      setInventory(newInv);
      setTransfers(newTrf);
      
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to submit stock transfer');
    } finally {
      setSubmitLoading(false);
    }
  };

  const filteredTransfers = transfers.filter(tr => {
    const sTerm = search.toLowerCase();
    return (
      tr.transfer_no.toLowerCase().includes(sTerm) ||
      tr.source_warehouse_name.toLowerCase().includes(sTerm) ||
      tr.destination_warehouse_name.toLowerCase().includes(sTerm) ||
      tr.username.toLowerCase().includes(sTerm)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Messages */}
      {success && (
        <div className="card" style={{ borderLeft: '4px solid var(--success)', padding: '0.75rem 1.25rem', backgroundColor: 'var(--success-light)', color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}>
          <span>{success}</span>
          <button onClick={() => setSuccess('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}><X size={16} /></button>
        </div>
      )}

      {error && (
        <div className="card" style={{ borderLeft: '4px solid var(--danger)', padding: '0.75rem 1.25rem', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}>
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}><X size={16} /></button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }} className="responsive-transfer-layout">
        {/* Form panel */}
        <div className="card" style={{ marginBottom: 0 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeftRight size={20} className="text-primary" /> New Stock Transfer
          </h2>
          
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="source-wh">Source Warehouse *</label>
                <select
                  id="source-wh"
                  className="form-control"
                  value={sourceWarehouseId}
                  onChange={(e) => setSourceWarehouseId(e.target.value)}
                  required
                  disabled={submitLoading || loading}
                >
                  {warehouses.map(wh => (
                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="dest-wh">Destination Warehouse *</label>
                <select
                  id="dest-wh"
                  className="form-control"
                  value={destinationWarehouseId}
                  onChange={(e) => setDestinationWarehouseId(e.target.value)}
                  required
                  disabled={submitLoading || loading}
                >
                  {warehouses.map(wh => (
                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="tr-date">Transfer Date *</label>
                <input
                  id="tr-date"
                  type="datetime-local"
                  className="form-control"
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                  required
                  disabled={submitLoading || loading}
                />
              </div>
            </div>

            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Transfer Items</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              {items.map((item, idx) => {
                const availableStock = getSourceStock(item.product_id, sourceWarehouseId);
                return (
                  <div key={idx} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: 2, minWidth: '180px', marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.85rem' }}>Select Product *</label>
                      <select
                        className="form-control"
                        value={item.product_id}
                        onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)}
                        required
                        disabled={submitLoading || loading}
                      >
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ flex: 1, minWidth: '100px', marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.85rem' }}>Available Stock</label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ backgroundColor: 'var(--bg-primary)', fontWeight: 700 }}
                        value={`${availableStock} units`}
                        readOnly
                      />
                    </div>

                    <div className="form-group" style={{ flex: 1, minWidth: '100px', marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.85rem' }}>Transfer Quantity *</label>
                      <input
                        type="number"
                        min="1"
                        max={availableStock}
                        className="form-control"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        required
                        disabled={submitLoading || loading}
                      />
                    </div>

                    {items.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={submitLoading || loading}
                        style={{ marginTop: '1.75rem', padding: '0.6rem 0.8rem' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleAddItem}
                disabled={submitLoading || loading}
              >
                <Plus size={16} /> Add Item
              </button>
              
              <button
                type="submit"
                className="btn btn-primary"
                style={{ marginLeft: 'auto' }}
                disabled={submitLoading || loading}
              >
                {submitLoading ? <Loader className="animate-spin" size={16} /> : 'Submit Transfer'}
              </button>
            </div>
          </form>
        </div>

        {/* History panel */}
        <div className="card" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
              Recent Transfers Logs
            </h2>
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '28px', fontSize: '0.85rem' }}
                placeholder="Search logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto', flex: 1 }}>
            {loading && <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>Loading logs...</div>}
            
            {!loading && filteredTransfers.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No transfer transactions found
              </div>
            )}

            {!loading && filteredTransfers.length > 0 && (
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem' }}>Tx No</th>
                    <th style={{ padding: '0.75rem' }}>From</th>
                    <th style={{ padding: '0.75rem' }}>To</th>
                    <th style={{ padding: '0.75rem' }}>Transfer Date</th>
                    <th style={{ padding: '0.75rem' }}>Operator</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Items Count</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransfers.map((tr) => (
                    <tr key={tr.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 700 }}>{tr.transfer_no}</td>
                      <td style={{ padding: '0.75rem' }}>{tr.source_warehouse_name}</td>
                      <td style={{ padding: '0.75rem' }}>{tr.destination_warehouse_name}</td>
                      <td style={{ padding: '0.75rem' }}>{new Date(tr.transfer_date).toLocaleString()}</td>
                      <td style={{ padding: '0.75rem' }}>@{tr.username}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700 }}>{tr.items.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 1200px) {
          .responsive-transfer-layout {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default StockTransfer;
