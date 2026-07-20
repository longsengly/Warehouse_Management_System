import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Plus, Edit2, Trash2, Search, X, Loader,
  FileSpreadsheet, Upload, CheckCircle, AlertTriangle,
  FileUp, ChevronRight, Info
} from 'lucide-react';

const Categories = () => {
  const { isManager } = useAuth();
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create / Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  // Import modal
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState([]);       // parsed preview rows
  const [importFile, setImportFile] = useState(null);     // file name
  const [importParseError, setImportParseError] = useState('');
  const [importProgress, setImportProgress] = useState(null); // { done, total, errors }
  const [importDone, setImportDone] = useState(false);
  const fileInputRef = useRef(null);

  // ─── Data fetch ─────────────────────────────────────────────────────────────
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
    const t = setTimeout(fetchCategories, 300);
    return () => clearTimeout(t);
  }, [search]);

  // ─── Create / Edit handlers ──────────────────────────────────────────────────
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
        await api.put(`/categories/${currentCategory.id}`, { name, description });
        setSuccess('Category updated successfully');
      } else {
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

  // ─── Export ──────────────────────────────────────────────────────────────────
  const exportToExcel = () => {
    if (categories.length === 0) return;
    const headers = ['ID', 'Category Name', 'Description', 'Created Date'];
    const rows = categories.map(cat => [
      cat.id,
      `"${(cat.name || '').replace(/"/g, '""')}"`,
      `"${(cat.description || '').replace(/"/g, '""')}"`,
      new Date(cat.created_at).toLocaleDateString()
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `categories_export_${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // ─── Import: file parsing ────────────────────────────────────────────────────
  const resetImport = () => {
    setImportRows([]);
    setImportFile(null);
    setImportParseError('');
    setImportProgress(null);
    setImportDone(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openImportModal = () => {
    resetImport();
    setImportOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      setImportParseError('Unsupported file type. Please upload .xlsx, .xls, or .csv files.');
      return;
    }

    setImportParseError('');
    setImportFile(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (json.length === 0) {
          setImportParseError('The file appears to be empty or has no data rows.');
          return;
        }

        // Normalize column names (case-insensitive, trim whitespace)
        const normalized = json.map(row => {
          const norm = {};
          for (const key of Object.keys(row)) {
            norm[key.trim().toLowerCase().replace(/\s+/g, '_')] = String(row[key]).trim();
          }
          return norm;
        });

        // Try to find name / description columns with flexible matching
        const nameKey = Object.keys(normalized[0]).find(k =>
          k.includes('name') || k.includes('category')
        );
        const descKey = Object.keys(normalized[0]).find(k =>
          k.includes('desc')
        );

        if (!nameKey) {
          setImportParseError(
            'Could not find a "Category Name" or "Name" column. ' +
            'Please make sure your file has a column named "Category Name" or "Name".'
          );
          return;
        }

        const rows = normalized
          .map(row => ({
            name: row[nameKey] || '',
            description: descKey ? (row[descKey] || '') : ''
          }))
          .filter(row => row.name !== '' && row.name !== 'undefined');

        if (rows.length === 0) {
          setImportParseError('No valid rows found. Make sure the Name column is filled in.');
          return;
        }

        setImportRows(rows);
      } catch (err) {
        setImportParseError('Failed to parse the file. Make sure it is a valid Excel or CSV file.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ─── Import: submit ───────────────────────────────────────────────────────────
  const handleImport = async () => {
    if (importRows.length === 0) return;

    const total = importRows.length;
    let done = 0;
    const errors = [];

    setImportProgress({ done: 0, total, errors: [] });

    for (const row of importRows) {
      try {
        await api.post('/categories', { name: row.name, description: row.description });
        done++;
      } catch (err) {
        errors.push({ name: row.name, reason: err.message || 'Failed' });
        done++;
      }
      setImportProgress({ done, total, errors: [...errors] });
    }

    setImportDone(true);
    fetchCategories();
    if (errors.length === 0) {
      setTimeout(() => {
        setImportOpen(false);
        resetImport();
        setSuccess(`${total} categor${total === 1 ? 'y' : 'ies'} imported successfully`);
        setTimeout(() => setSuccess(''), 4000);
      }, 1500);
    }
  };

  // ─── Derived progress ─────────────────────────────────────────────────────────
  const progressPct = importProgress
    ? Math.round((importProgress.done / importProgress.total) * 100)
    : 0;
  const successCount = importProgress
    ? importProgress.done - importProgress.errors.length
    : 0;

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Top Banner Messages */}
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

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }} className="no-print">
        {/* Search */}
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

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* Export */}
          <button
            className="btn btn-secondary"
            onClick={exportToExcel}
            disabled={categories.length === 0}
            title="Export categories to Excel"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <FileSpreadsheet size={17} />
            Export Excel
          </button>

          {/* Import — manager/admin only */}
          {isManager && (
            <button
              className="btn btn-secondary"
              onClick={openImportModal}
              title="Import categories from Excel"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Upload size={17} />
              Import Excel
            </button>
          )}

          {/* Add */}
          {isManager && (
            <button className="btn btn-primary" onClick={handleOpenCreate}>
              <Plus size={18} />
              Add Category
            </button>
          )}
        </div>
      </div>

      {/* Table */}
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
                        <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEdit(cat)} title="Edit category">
                          <Edit2 size={14} />
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(cat.id)} title="Delete category">
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

      {/* ── Create / Edit Modal ───────────────────────────────────────────────── */}
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
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)} disabled={submitLoading}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitLoading || !name.trim()}>
                  {submitLoading ? <Loader className="animate-spin" size={16} /> : (currentCategory ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Import Modal ──────────────────────────────────────────────────────── */}
      {importOpen && (
        <div className="modal-overlay" onClick={() => { if (!importProgress || importDone) { setImportOpen(false); resetImport(); } }}>
          <div className="modal-content" style={{ maxWidth: '620px', width: '100%' }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 'var(--radius-sm)',
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <FileUp size={17} color="#fff" />
                </div>
                <h3 style={{ fontWeight: 800 }}>Import Categories from Excel</h3>
              </div>
              <button
                onClick={() => { setImportOpen(false); resetImport(); }}
                disabled={importProgress && !importDone}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', opacity: (importProgress && !importDone) ? 0.4 : 1 }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">

              {/* Instructions */}
              <div style={{
                background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: 'var(--radius-sm)', padding: '0.875rem 1rem', marginBottom: '1.25rem',
                display: 'flex', gap: '0.65rem'
              }}>
                <Info size={16} style={{ color: '#6366f1', flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Accepted formats:</strong> .xlsx, .xls, .csv<br />
                  Your file must have at least a <strong>"Category Name"</strong> or <strong>"Name"</strong> column.<br />
                  An optional <strong>"Description"</strong> column is also supported.<br />
                  Rows with duplicate names will be rejected by the server and shown as errors.
                </div>
              </div>

              {/* File picker */}
              {!importProgress && (
                <div
                  style={{
                    border: '2px dashed var(--border-color)',
                    borderRadius: 'var(--radius)',
                    padding: '2rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s, background 0.2s',
                    background: importFile ? 'rgba(34,197,94,0.04)' : 'var(--bg-secondary)'
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--primary)'; }}
                  onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                  onDrop={e => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    const f = e.dataTransfer.files[0];
                    if (f) {
                      if (fileInputRef.current) fileInputRef.current.files = e.dataTransfer.files;
                      handleFileChange({ target: { files: [f] } });
                    }
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                    id="import-file-input"
                  />
                  {importFile ? (
                    <>
                      <FileSpreadsheet size={36} style={{ color: '#22c55e', margin: '0 auto 0.5rem' }} />
                      <p style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{importFile}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>Click to choose a different file</p>
                    </>
                  ) : (
                    <>
                      <Upload size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 0.5rem' }} />
                      <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Click to select or drag & drop your file</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>.xlsx, .xls, .csv supported</p>
                    </>
                  )}
                </div>
              )}

              {/* Parse error */}
              {importParseError && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', padding: '0.75rem 1rem', background: 'var(--danger-light)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: '0.85rem', marginTop: '0.75rem' }}>
                  <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                  {importParseError}
                </div>
              )}

              {/* Preview table */}
              {importRows.length > 0 && !importProgress && (
                <div style={{ marginTop: '1rem' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Preview — {importRows.length} row{importRows.length !== 1 ? 's' : ''} ready to import
                    {importRows.length > 8 ? ` (showing first 8)` : ''}
                  </p>
                  <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', maxHeight: '220px', overflowY: 'auto' }}>
                    <table className="table" style={{ marginBottom: 0, fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Category Name</th>
                          <th>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importRows.slice(0, 8).map((row, i) => (
                          <tr key={i}>
                            <td style={{ color: 'var(--text-muted)', width: 36 }}>{i + 1}</td>
                            <td style={{ fontWeight: 600 }}>{row.name}</td>
                            <td style={{ color: 'var(--text-secondary)' }}>{row.description || '—'}</td>
                          </tr>
                        ))}
                        {importRows.length > 8 && (
                          <tr>
                            <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem' }}>
                              … and {importRows.length - 8} more row{importRows.length - 8 !== 1 ? 's' : ''}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Progress bar */}
              {importProgress && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {importDone ? 'Import complete' : `Importing… ${importProgress.done} / ${importProgress.total}`}
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: importDone ? 'var(--success)' : 'var(--primary)' }}>
                      {progressPct}%
                    </span>
                  </div>
                  {/* Bar */}
                  <div style={{ height: 10, background: 'var(--bg-secondary)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 99,
                      width: `${progressPct}%`,
                      background: importDone && importProgress.errors.length === 0
                        ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                        : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>

                  {/* Summary */}
                  {importDone && (
                    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontWeight: 600 }}>
                        <CheckCircle size={16} /> {successCount} categor{successCount !== 1 ? 'ies' : 'y'} imported successfully
                      </div>
                      {importProgress.errors.length > 0 && (
                        <div style={{ background: 'var(--danger-light)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', marginTop: '0.25rem' }}>
                          <p style={{ color: 'var(--danger)', fontWeight: 700, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <AlertTriangle size={14} /> {importProgress.errors.length} row{importProgress.errors.length !== 1 ? 's' : ''} failed:
                          </p>
                          <ul style={{ paddingLeft: '1.25rem', fontSize: '0.82rem', color: 'var(--danger)', lineHeight: 1.8 }}>
                            {importProgress.errors.map((e, i) => (
                              <li key={i}><strong>{e.name}</strong> — {e.reason}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setImportOpen(false); resetImport(); }}
                disabled={importProgress && !importDone}
              >
                {importDone ? 'Close' : 'Cancel'}
              </button>

              {!importProgress && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={importRows.length === 0}
                  onClick={handleImport}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Upload size={15} />
                  Import {importRows.length > 0 ? `${importRows.length} Row${importRows.length !== 1 ? 's' : ''}` : ''}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
