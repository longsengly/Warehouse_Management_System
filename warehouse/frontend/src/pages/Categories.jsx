import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit2, Trash2, Search, X, Loader } from 'lucide-react';

const Categories = () => {
  const { isManager } = useAuth();
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(null); // null for create, object for edit
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/categories?search=${search}`);
      setCategories(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchCategories();
    }, 300); // Debounce search
    return () => clearTimeout(delayDebounce);
  }, [search]);

  const handleOpenCreate = () => {
    setCurrentCategory(null);
    setName('');
    setDescription('');
    setModalOpen(true);
  };

  const handleOpenEdit = (cat) => {
    setCurrentCategory(cat);
    setName(cat.name);
    setDescription(cat.description || '');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setSubmitLoading(true);
    setError('');
    try {
      if (currentCategory) {
        // Edit Category
        await api.put(`/categories/${currentCategory.id}`, { name, description });
        setSuccess('Category updated successfully');
      } else {
        // Create Category
        await api.post('/categories', { name, description });
        setSuccess('Category created successfully');
      }
      setModalOpen(false);
      fetchCategories();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save category');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    
    setError('');
    try {
      await api.delete(`/categories/${id}`);
      setSuccess('Category deleted successfully');
      fetchCategories();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to delete category');
      setTimeout(() => setError(''), 4000);
    }
  };

  return (
    <div>
      {/* Top Banner Message */}
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
        {/* Search Bar */}
        <div style={{ position: 'relative', width: '300px', maxWidth: '100%' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '38px' }}
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Add Button */}
        {isManager && (
          <button className="btn btn-primary" onClick={handleOpenCreate}>
            <Plus size={18} />
            Add Category
          </button>
        )}
      </div>

      {/* Categories List Table */}
      {loading && <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>Loading categories...</div>}
      
      {!loading && categories.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }} className="card">
          <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>No categories found</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Create categories using the Add Category button above.</p>
        </div>
      )}

      {!loading && categories.length > 0 && (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Category Name</th>
                <th>Description</th>
                <th>Created Date</th>
                {isManager && <th className="no-print" style={{ width: '120px', textAlign: 'center' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id}>
                  <td style={{ fontWeight: 700 }}>{cat.name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{cat.description || '—'}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {new Date(cat.created_at).toLocaleDateString()}
                  </td>
                  {isManager && (
                    <td className="no-print" style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={() => handleOpenEdit(cat)}
                          title="Edit category"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          className="btn btn-danger btn-sm" 
                          onClick={() => handleDelete(cat.id)}
                          title="Delete category"
                        >
                          <Trash2 size={14} />
                        </button>
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
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontWeight: 800 }}>{currentCategory ? 'Edit Category' : 'Create Category'}</h3>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label" htmlFor="cat-name">Category Name *</label>
                  <input
                    id="cat-name"
                    type="text"
                    className="form-control"
                    placeholder="e.g., Electronics, Raw Materials"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={submitLoading}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label" htmlFor="cat-desc">Description</label>
                  <textarea
                    id="cat-desc"
                    className="form-control"
                    rows="4"
                    placeholder="Provide description..."
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
                <button type="submit" className="btn btn-primary" disabled={submitLoading || !name.trim()}>
                  {submitLoading ? <Loader className="animate-spin" size={16} /> : (currentCategory ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
