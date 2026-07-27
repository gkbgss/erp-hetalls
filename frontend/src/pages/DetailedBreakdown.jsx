import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { Layers, X, Calendar, Clock, List } from 'lucide-react'

export default function DetailedBreakdown() {
  const { API } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [activeTab, setActiveTab] = useState('today')
  const [customDate, setCustomDate] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchData = (dateParam) => {
    setLoading(true)
    axios.get(`${API}/api/breakdown/daily-sales?date=${dateParam}`)
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (showModal) {
      fetchData('today')
      setActiveTab('today')
    }
  }, [showModal])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    if (tab === 'today') fetchData('today')
    else if (tab === 'all') fetchData('all')
  }

  const handleCustomDate = () => {
    if (customDate) {
      setActiveTab('custom')
      fetchData(customDate)
    }
  }

  // Group columns by their header
  const getGroupedData = () => {
    if (!data || !data.headers || !data.sub_headers || !data.rows) return []

    const groups = []
    let currentGroup = null

    for (let i = 0; i < data.sub_headers.length; i++) {
      const header = data.headers[i] || ''
      const subHeader = data.sub_headers[i] || ''

      if (!currentGroup || currentGroup.header !== header) {
        currentGroup = { header, columns: [] }
        groups.push(currentGroup)
      }

      currentGroup.columns.push({
        subHeader,
        colIndex: i,
      })
    }

    return groups
  }

  return (
    <div>
      <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
        <div style={{ marginBottom: '16px' }}>
          <Layers size={48} style={{ color: 'var(--gold)' }} />
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>Detailed Breakdown</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
          View daily sales data across all brands &amp; portals from your Google Sheet
        </p>
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: '14px 36px',
            background: 'linear-gradient(135deg, var(--gold), var(--gold-dark))',
            color: '#000',
            fontSize: '15px',
            fontWeight: 700,
            borderRadius: '10px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(245,158,11,0.3)',
            transition: 'all 0.2s ease',
          }}
        >
          Open Breakdown
        </button>
      </div>

      {/* Modal Overlay */}
      {showModal && (
        <div className="breakdown-overlay" onClick={() => setShowModal(false)}>
          <div className="breakdown-modal" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="breakdown-modal-header" style={{ position: 'relative', paddingRight: '44px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Daily Sale Brands &amp; Portal</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  {activeTab === 'today' && `Today's Data — ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                  {activeTab === 'all' && 'All Data'}
                  {activeTab === 'custom' && `Custom Date — ${customDate}`}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} style={{
                position: 'absolute', top: 0, right: 0,
                background: 'none', border: 'none', color: 'var(--text-muted)',
                cursor: 'pointer', padding: '6px', borderRadius: '6px',
              }} title="Close">
                <X size={22} />
              </button>
            </div>

            {/* Tabs */}
            <div className="breakdown-tabs">
              <button
                className={`breakdown-tab ${activeTab === 'today' ? 'active' : ''}`}
                onClick={() => handleTabChange('today')}
              >
                <Clock size={14} /> Today
              </button>
              <button
                className={`breakdown-tab ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => handleTabChange('all')}
              >
                <List size={14} /> All
              </button>
              <div className="breakdown-tab-custom">
                <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                <input
                  type="date"
                  value={customDate}
                  onChange={e => setCustomDate(e.target.value)}
                  style={{
                    background: 'var(--bg-surface)', border: '1px solid var(--border)',
                    borderRadius: '6px', padding: '6px 10px', color: 'var(--text-primary)',
                    fontSize: '12px',
                  }}
                />
                <button
                  onClick={handleCustomDate}
                  className={`breakdown-tab ${activeTab === 'custom' ? 'active' : ''}`}
                >
                  Go
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="breakdown-content">
              {loading ? (
                <div className="page-loading" style={{ height: '200px' }}>
                  <div className="big-spinner" />
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Fetching data…</p>
                </div>
              ) : !data || data.total_rows === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                  <p style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>No data found</p>
                  <p style={{ fontSize: '13px' }}>Try selecting a different date or view all data.</p>
                </div>
              ) : (
                data.rows.map((row, rowIdx) => (
                  <div key={rowIdx} className="breakdown-row-card">
                    <div className="breakdown-row-date">
                      {row[0] || `Row ${rowIdx + 1}`}
                    </div>
                    <div className="breakdown-groups">
                      {getGroupedData().map((group, gIdx) => {
                        // Skip empty groups or the date column group
                        const hasValues = group.columns.some(c => row[c.colIndex] && row[c.colIndex].trim())
                        if (!hasValues && gIdx > 0) return null

                        return (
                          <div key={gIdx} className="breakdown-group">
                            <div className="breakdown-group-header">{group.header}</div>
                            <div className="breakdown-group-items">
                              {group.columns.map((col, cIdx) => {
                                const val = row[col.colIndex] || ''
                                if (!val.trim() && gIdx > 0) return null
                                return (
                                  <div key={cIdx} className="breakdown-item">
                                    <span className="breakdown-item-label">{col.subHeader}</span>
                                    <span className="breakdown-item-value">
                                      {val.trim() || '—'}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
