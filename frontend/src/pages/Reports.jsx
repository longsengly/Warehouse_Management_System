import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { FileSpreadsheet, FileText, Download, X, Search, ChevronRight, BarChart2 } from 'lucide-react';

const Reports = () => {
  const [reportType, setReportType] = useState('inventory'); // 'inventory', 'stock_in', 'stock_out'
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [downloadLoading, setDownloadLoading] = useState({});

  const fetchReportPreview = async (type) => {
    setLoading(true);
    setError('');
    setData([]);
    try {
      if (type === 'inventory') {
        const res = await api.get('/inventory');
        setData(res);
      } else if (type === 'stock_in') {
        const res = await api.get('/transactions/stock-ins');
        setData(res);
      } else if (type === 'stock_out') {
        const res = await api.get('/transactions/stock-outs');
        setData(res);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch report preview data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportPreview(reportType);
  }, [reportType]);

  const handleDownload = async (format, type) => {
    const loadingKey = `${type}-${format}`;
    setError('');
    setDownloadLoading(prev => ({ ...prev, [loadingKey]: true }));
    
    try {
      const token = localStorage.getItem('token');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`http://localhost:8000/api/reports/export/${format}?type=${type}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        const txt = await response.text();
        throw new Error(txt || `Failed to export ${format} report.`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const extension = format === 'excel' ? 'xlsx' : 'pdf';
      const formattedDate = new Date().toISOString().slice(0, 10);
      a.download = `${type}_report_${formattedDate}.${extension}`;
      
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || 'Error exporting report file');
    } finally {
      setDownloadLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  // Filter logic based on type
  const getFilteredData = () => {
    const searchLower = search.toLowerCase();
    if (reportType === 'inventory') {
      return data.filter(item => 
        item.product_name.toLowerCase().includes(searchLower) ||
        item.sku.toLowerCase().includes(searchLower) ||
        item.warehouse_name.toLowerCase().includes(searchLower)
      );
    } else if (reportType === 'stock_in') {
      return data.filter(item => 
        item.transaction_no.toLowerCase().includes(searchLower) ||
        item.supplier_name.toLowerCase().includes(searchLower) ||
        item.username.toLowerCase().includes(searchLower)
      );
    } else if (reportType === 'stock_out') {
      return data.filter(item => 
        item.transaction_no.toLowerCase().includes(searchLower) ||
        item.customer_name.toLowerCase().includes(searchLower) ||
        item.username.toLowerCase().includes(searchLower)
      );
    }
    return data;
  };

  const filtered = getFilteredData();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Messages */}
      {error && (
        <div className="card" style={{ borderLeft: '4px solid var(--danger)', padding: '0.75rem 1.25rem', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}>
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}><X size={16} /></button>
        </div>
      )}

      {/* Tabs Selection & Export buttons */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: 0 }}>
        {/* Toggle Report Type */}
        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'var(--bg-primary)', padding: '4px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
          <button
            onClick={() => setReportType('inventory')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-xs)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.875rem',
              backgroundColor: reportType === 'inventory' ? 'var(--primary)' : 'transparent',
              color: reportType === 'inventory' ? '#ffffff' : 'var(--text-secondary)',
              transition: 'all 0.15s ease'
            }}
          >
            Inventory Stock
          </button>
          <button
            onClick={() => setReportType('stock_in')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-xs)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.875rem',
              backgroundColor: reportType === 'stock_in' ? 'var(--primary)' : 'transparent',
              color: reportType === 'stock_in' ? '#ffffff' : 'var(--text-secondary)',
              transition: 'all 0.15s ease'
            }}
          >
            Stock In Logs
          </button>
          <button
            onClick={() => setReportType('stock_out')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-xs)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.875rem',
              backgroundColor: reportType === 'stock_out' ? 'var(--primary)' : 'transparent',
              color: reportType === 'stock_out' ? '#ffffff' : 'var(--text-secondary)',
              transition: 'all 0.15s ease'
            }}
          >
            Stock Out Logs
          </button>
        </div>

        {/* Download Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={() => handleDownload('excel', reportType)}
            disabled={downloadLoading[`${reportType}-excel`] || loading}
          >
            <FileSpreadsheet size={16} />
            {downloadLoading[`${reportType}-excel`] ? 'Generating...' : 'Export Excel'}
          </button>
          
          <button
            className="btn btn-primary"
            onClick={() => handleDownload('pdf', reportType)}
            disabled={downloadLoading[`${reportType}-pdf`] || loading}
          >
            <FileText size={16} />
            {downloadLoading[`${reportType}-pdf`] ? 'Generating...' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* Filter and Preview List */}
      <div className="card" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>
            Report Data Preview
          </h3>
          <div style={{ position: 'relative', width: '300px', maxWidth: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '38px' }}
              placeholder={`Search in preview...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading && <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>Loading preview dataset...</div>}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            No records matched the filter criteria in the preview
          </div>
        )}

        {/* Tables */}
        {!loading && filtered.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            {reportType === 'inventory' && (
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                    <th style={{ padding: '0.75rem' }}>SKU</th>
                    <th style={{ padding: '0.75rem' }}>Product Name</th>
                    <th style={{ padding: '0.75rem' }}>Warehouse</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Current Stock</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Reserved Stock</th>
                    <th style={{ padding: '0.75rem' }}>Unit</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Cost Price</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Total Value</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 700 }}>{item.sku}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-primary)' }}>{item.product_name}</td>
                      <td style={{ padding: '0.75rem' }}>{item.warehouse_name}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700 }}>{item.current_stock.toLocaleString()}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-muted)' }}>{item.reserved_stock.toLocaleString()}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{item.unit}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>${Number(item.cost_price ?? 0).toFixed(2)}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 800, color: 'var(--success)' }}>
                        ${(item.current_stock * Number(item.cost_price ?? 0)).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reportType === 'stock_in' && (
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                    <th style={{ padding: '0.75rem' }}>Transaction No</th>
                    <th style={{ padding: '0.75rem' }}>Receive Date</th>
                    <th style={{ padding: '0.75rem' }}>Supplier Name</th>
                    <th style={{ padding: '0.75rem' }}>Received By</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Total Amount</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 700 }}>{item.transaction_no}</td>
                      <td style={{ padding: '0.75rem' }}>{new Date(item.receive_date).toLocaleString()}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-primary)' }}>{item.supplier_name}</td>
                      <td style={{ padding: '0.75rem' }}>@{item.username}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 800 }}>${Number(item.total_amount).toFixed(2)}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>{item.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reportType === 'stock_out' && (
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                    <th style={{ padding: '0.75rem' }}>Transaction No</th>
                    <th style={{ padding: '0.75rem' }}>Issue Date</th>
                    <th style={{ padding: '0.75rem' }}>Customer Name</th>
                    <th style={{ padding: '0.75rem' }}>Issued By</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Total Amount</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 700 }}>{item.transaction_no}</td>
                      <td style={{ padding: '0.75rem' }}>{new Date(item.issue_date).toLocaleString()}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-primary)' }}>{item.customer_name}</td>
                      <td style={{ padding: '0.75rem' }}>@{item.username}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 800 }}>${Number(item.total_amount).toFixed(2)}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>{item.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
