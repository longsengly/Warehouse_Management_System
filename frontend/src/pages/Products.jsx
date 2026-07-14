import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit2, Trash2, Search, X, Loader, Filter, Upload, Barcode, Calendar, AlertTriangle } from 'lucide-react';

const Products = () => {
  const { isManager, isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [minStock, setMinStock] = useState('0');
  const [unit, setUnit] = useState('pcs');
  const [imageUrl, setImageUrl] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchProductsAndCategories = async () => {
    setLoading(true);
    try {
      let query = `/products?search=${search}`;
      if (selectedCat) query += `&category_id=${selectedCat}`;
      if (lowStockFilter) query += `&low_stock=true`;
      
      const prodData = await api.get(query);
      const catData = await api.get('/categories');
      setProducts(prodData);
      setCategories(catData);
    } catch (err) {
      setError(err.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchProductsAndCategories();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [search, selectedCat, lowStockFilter]);

  const handleOpenCreate = () => {
    setCurrentProduct(null);
    setSku('');
    setBarcode('');
    setName('');
    setDescription('');
    setCategoryId(categories[0]?.id || '');
    setCostPrice('');
    setSellingPrice('');
    setMinStock('0');
    setUnit('pcs');
    setImageUrl('');
    setExpiryDate('');
    setModalOpen(true);
  };

  const handleOpenEdit = (prod) => {
    setCurrentProduct(prod);
    setSku(prod.sku);
    setBarcode(prod.barcode || '');
    setName(prod.name);
    setDescription(prod.description || '');
    setCategoryId(prod.category_id || '');
    setCostPrice(prod.cost_price.toString());
    setSellingPrice(prod.selling_price.toString());
    setMinStock(prod.min_stock.toString());
    setUnit(prod.unit);
    setImageUrl(prod.image_url || '');
    setExpiryDate(prod.expiry_date || '');
    setModalOpen(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadingImage(true);
    setError('');
    try {
      const data = await api.upload('/products/upload-image', formData);
      setImageUrl(data.image_url);
      setSuccess('Image uploaded successfully');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err.message || 'Image upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sku.trim() || !name.trim() || !costPrice || !sellingPrice) return;

    if (parseFloat(costPrice) > parseFloat(sellingPrice)) {
      if (!window.confirm('Warning: Cost price is higher than selling price. Do you want to proceed?')) {
        return;
      }
    }

    setSubmitLoading(true);
    setError('');
    
    const payload = {
      sku,
      barcode: barcode.trim() || null,
      name,
      description: description.trim() || null,
      category_id: categoryId ? parseInt(categoryId) : null,
      cost_price: parseFloat(costPrice),
      selling_price: parseFloat(sellingPrice),
      min_stock: parseInt(minStock),
      unit,
      image_url: imageUrl || null,
      expiry_date: expiryDate || null
    };

    try {
      if (currentProduct) {
        await api.put(`/products/${currentProduct.id}`, payload);
        setSuccess('Product updated successfully');
      } else {
        await api.post('/products', payload);
        setSuccess('Product created successfully');
      }
      setModalOpen(false);
      fetchProductsAndCategories();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save product');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product? Products referenced in transaction logs cannot be deleted.')) return;
    
    setError('');
    try {
      await api.delete(`/products/${id}`);
      setSuccess('Product deleted successfully');
      fetchProductsAndCategories();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to delete product');
      setTimeout(() => setError(''), 4500);
    }
  };

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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }} className="no-print">
        {/* Filters and Searches */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', flex: 1 }}>
          <div style={{ position: 'relative', width: '260px', maxWidth: '100%' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '38px' }}
              placeholder="Search by SKU, Name, Barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Category Dropdown Filter */}
          <select 
            className="form-control" 
            style={{ width: '180px' }}
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Low Stock Checkbox Filter */}
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', userSelect: 'none', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <input 
              type="checkbox" 
              checked={lowStockFilter} 
              onChange={(e) => setLowStockFilter(e.target.checked)}
              style={{ width: '16px', height: '16px' }}
            />
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={14} className="text-warning" /> Low Stock only</span>
          </label>
        </div>

        {/* Add Product Button */}
        {isManager && (
          <button className="btn btn-primary" onClick={handleOpenCreate}>
            <Plus size={18} />
            Add Product
          </button>
        )}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>Loading products...</div>}
      
      {!loading && products.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }} className="card">
          <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>No products found</p>
        </div>
      )}

      {!loading && products.length > 0 && (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Image</th>
                <th>SKU</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Cost / Sell</th>
                <th>Min Stock</th>
                <th>Unit</th>
                <th>Expiry</th>
                {isManager && <th className="no-print" style={{ width: '120px', textAlign: 'center' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {products.map((prod) => (
                <tr key={prod.id}>
                  <td>
                    {prod.image_url ? (
                      <img 
                        src={`http://localhost:8000${prod.image_url}`} 
                        alt={prod.name} 
                        style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover', border: '1px solid var(--border-color)' }} 
                      />
                    ) : (
                      <div style={{ width: '40px', height: '40px', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justify: 'center', color: 'var(--text-muted)', fontSize: '0.65rem', border: '1px solid var(--border-color)' }}>
                        NO IMG
                      </div>
                    )}
                  </td>
                  <td style={{ fontWeight: 800, color: 'var(--primary)' }}>{prod.sku}</td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{prod.name}</div>
                    {prod.barcode && <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}><Barcode size={10} /> {prod.barcode}</div>}
                  </td>
                  <td>
                    <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>{prod.category_name || 'Unassigned'}</span>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>Cost: <strong>${Number(prod.cost_price).toFixed(2)}</strong></div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--success)', marginTop: '2px' }}>Sell: <strong>${Number(prod.selling_price).toFixed(2)}</strong></div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{prod.min_stock}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{prod.unit}</td>
                  <td style={{ fontSize: '0.85rem', color: prod.expiry_date ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {prod.expiry_date ? new Date(prod.expiry_date).toLocaleDateString() : '—'}
                  </td>
                  {isManager && (
                    <td className="no-print" style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={() => handleOpenEdit(prod)}
                          title="Edit product"
                        >
                          <Edit2 size={14} />
                        </button>
                        {isAdmin && (
                          <button 
                            className="btn btn-danger btn-sm" 
                            onClick={() => handleDelete(prod.id)}
                            title="Delete product"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 800 }}>{currentProduct ? 'Edit Product' : 'Create Product'}</h3>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="prod-sku">SKU Code *</label>
                    <input
                      id="prod-sku"
                      type="text"
                      className="form-control"
                      placeholder="e.g., ELE-IPH15"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      required
                      disabled={submitLoading || currentProduct} // SKU immutable on edit for security
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="prod-barcode">Barcode</label>
                    <input
                      id="prod-barcode"
                      type="text"
                      className="form-control"
                      placeholder="Scan or type barcode"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      disabled={submitLoading}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="prod-name">Product Name *</label>
                  <input
                    id="prod-name"
                    type="text"
                    className="form-control"
                    placeholder="Enter descriptive product name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={submitLoading}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="prod-cat">Category *</label>
                    <select
                      id="prod-cat"
                      className="form-control"
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      required
                      disabled={submitLoading}
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="prod-unit">Unit of Measure *</label>
                    <input
                      id="prod-unit"
                      type="text"
                      className="form-control"
                      placeholder="e.g. pcs, bottle, box"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      required
                      disabled={submitLoading}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="prod-cost">Cost Price ($) *</label>
                    <input
                      id="prod-cost"
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-control"
                      placeholder="800.00"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      required
                      disabled={submitLoading}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="prod-sell">Selling Price ($) *</label>
                    <input
                      id="prod-sell"
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-control"
                      placeholder="999.00"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      required
                      disabled={submitLoading}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="prod-min">Min Stock Alert *</label>
                    <input
                      id="prod-min"
                      type="number"
                      min="0"
                      className="form-control"
                      placeholder="10"
                      value={minStock}
                      onChange={(e) => setMinStock(e.target.value)}
                      required
                      disabled={submitLoading}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="prod-exp">Expiry Date (Optional)</label>
                    <input
                      id="prod-exp"
                      type="date"
                      className="form-control"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      disabled={submitLoading}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Product Image</label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Image URL or upload"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        disabled={submitLoading}
                        style={{ flex: 1 }}
                      />
                      <label 
                        style={{ 
                          padding: '0.625rem', 
                          borderRadius: 'var(--radius-sm)', 
                          backgroundColor: 'var(--bg-hover)', 
                          border: '1px solid var(--border-color)', 
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-secondary)'
                        }}
                        title="Upload file"
                      >
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={handleImageUpload}
                          disabled={uploadingImage || submitLoading}
                        />
                        {uploadingImage ? <Loader className="animate-spin" size={16} /> : <Upload size={16} />}
                      </label>
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="prod-desc">Description</label>
                  <textarea
                    id="prod-desc"
                    className="form-control"
                    rows="3"
                    placeholder="Enter detail specifications..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={submitLoading}
                  />
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)} disabled={submitLoading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitLoading || uploadingImage}>
                  {submitLoading ? <Loader className="animate-spin" size={16} /> : (currentProduct ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
