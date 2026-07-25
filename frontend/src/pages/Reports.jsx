import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { TrendingUp, DollarSign, ShoppingCart, Package, Download, Building, ArrowLeft, FileText, ExternalLink, Printer } from 'lucide-react'

// ── Custom Tooltip ────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '10px 14px', fontSize: 13
    }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{label}</p>
      {[...payload].sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0)).map((p, i) => (
        <p key={i} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {p.name.toLowerCase().includes('order') ? p.value : `$${p.value?.toLocaleString()}`}
        </p>
      ))}
    </div>
  )
}

// ── Export CSV Helper ─────────────────────────────────────────────────
function exportCSV(data, filename) {
  if (!data?.length) return
  const headers = Object.keys(data[0]).join(',')
  const rows    = data.map(r => Object.values(r).join(',')).join('\n')
  const blob    = new Blob([`${headers}\n${rows}`], { type: 'text/csv' })
  const url     = URL.createObjectURL(blob)
  const a       = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ── KPI Card ─────────────────────────────────────────────────────────
function KPICard({ icon: Icon, label, value, colorClass, format = 'currency' }) {
  const display = format === 'currency'
    ? `$${Number(value || 0).toLocaleString()}`
    : Number(value || 0).toLocaleString()
  return (
    <div className="kpi-card">
      <div className="kpi-header">
        <span className="kpi-label">{label}</span>
        <div className={`kpi-icon ${colorClass}`}><Icon size={18} /></div>
      </div>
      <div className="kpi-value">{display}</div>
    </div>
  )
}

// ── Reports Page ──────────────────────────────────────────────────────
export default function Reports() {
  const { API } = useAuth()
  const [selectedCompany, setSelectedCompany] = useState(null)

  const [summary,     setSummary]     = useState(null)
  const [monthly,     setMonthly]     = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [platforms,   setPlatforms]   = useState([])
  const [sheetLinks,  setSheetLinks]  = useState([])
  const [loading,     setLoading]     = useState(false)

  const [showPrintModal, setShowPrintModal] = useState(false)
  const [printReportsList, setPrintReportsList] = useState([])
  const [loadingPrintReports, setLoadingPrintReports] = useState(false)
  const [printModalTitle, setPrintModalTitle] = useState("All Companies")

  const openPrintCenter = (compFilter = "all", title = "All Companies") => {
    setPrintModalTitle(title)
    setShowPrintModal(true)
    setLoadingPrintReports(true)
    axios.get(`${API}/api/reports/google-sheet-links`, { params: { company: compFilter } })
      .then(res => setPrintReportsList(res.data || []))
      .catch(err => {
        console.error("Error fetching print reports:", err)
        setPrintReportsList([])
      })
      .finally(() => setLoadingPrintReports(false))
  }

  const COMPANIES = [
    { name: "Hetalls Global",  color: "#3b82f6" },
    { name: "MKM",             color: "#f59e0b" },
    { name: "Hetalls",         color: "#ef4444" },
    { name: "MMC",             color: "#8b5cf6" },
    { name: "Eastern",         color: "#10b981" },
    { name: "Cotton Cheese",   color: "#06b6d4" },
    { name: "MMCO",            color: "#ec4899" },
    { name: "HOMESPUN",        color: "#f97316" }
  ]

  useEffect(() => {
    if (!selectedCompany) return

    setLoading(true)
    const params = { company: selectedCompany }

    Promise.all([
      axios.get(`${API}/api/reports/sales-summary`, { params }),
      axios.get(`${API}/api/reports/monthly-breakdown`, { params }),
      axios.get(`${API}/api/reports/top-products`, { params }),
      axios.get(`${API}/api/reports/platform-comparison`, { params }),
      axios.get(`${API}/api/reports/google-sheet-links`, { params }),
    ]).then(([s, m, t, p, l]) => {
      setSummary(s.data)
      setMonthly(m.data)
      setTopProducts(t.data)
      setPlatforms(p.data)
      setSheetLinks(l.data || [])
    }).catch(err => {
      console.error(err)
      setSheetLinks([])
    })
      .finally(() => setLoading(false))
  }, [API, selectedCompany])

  const PIE_COLORS = ['#f59e0b', '#f87171']

  // ── View 1: Company Selection ──────────────────────────────────────
  if (!selectedCompany) {
    return (
      <div style={{ maxWidth: 900, margin: '40px auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 24, marginBottom: 6, color: 'var(--text)' }}>Select Company</h2>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>Choose a company to view its detailed reports and analytics.</p>
          </div>
          <button
            onClick={() => openPrintCenter("all", "All Companies")}
            className="btn"
            style={{
              background: 'linear-gradient(135deg, var(--gold) 0%, #b89728 100%)',
              color: '#0f172a',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(212,175,55,0.25)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
          >
            <Printer size={18} /> Print All Reports (All Companies)
          </button>
        </div>
        
        <div style={{
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: 20
        }}>
          {COMPANIES.map(co => (
            <div 
              key={co.name}
              onClick={() => setSelectedCompany(co.name)}
              className="card"
              style={{
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '40px 20px',
                transition: 'all 0.2s',
                borderTop: `4px solid ${co.color}`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
              }}
            >
              <div style={{
                background: `${co.color}20`,
                color: co.color,
                padding: 16,
                borderRadius: '50%',
                marginBottom: 16
              }}>
                <Building size={32} />
              </div>
              <h3 style={{ fontSize: 18, margin: 0 }}>{co.name}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>View Reports &rarr;</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── View 2: Company Reports Dashboard ──────────────────────────────
  if (loading) return (
    <div className="page-loading">
      <div className="big-spinner" />
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading reports for {selectedCompany}…</p>
    </div>
  )

  return (
    <div>
      {/* ── Dashboard Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button 
            onClick={() => setSelectedCompany(null)}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text)'
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 style={{ fontSize: 24, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Building size={22} color="var(--gold)" />
              {selectedCompany} Dashboard
            </h2>
            <p style={{ color: 'var(--text-muted)', margin: 0, marginTop: 4 }}>Analytics and financial reports for {selectedCompany}</p>
          </div>
        </div>
      </div>

      {/* ─── Summary KPIs ──────────────────────────────────────── */}
      <div className="kpi-grid">
        <KPICard icon={DollarSign}  label="Total Revenue"    value={summary?.total_revenue}   colorClass="gold" />
        <KPICard icon={TrendingUp}  label="Monthly Revenue"  value={summary?.monthly_revenue} colorClass="green" />
        <KPICard icon={TrendingUp}  label="Weekly Revenue"   value={summary?.weekly_revenue}  colorClass="blue" />
        <KPICard icon={ShoppingCart} label="Total Orders"    value={summary?.total_orders}    colorClass="blue"  format="number" />
        <KPICard icon={DollarSign}  label="Total Expenses"   value={summary?.total_expenses}  colorClass="red" />
        <KPICard icon={DollarSign}  label="Net Profit"       value={summary?.net_profit}      colorClass="gold" />
      </div>

      {/* ─── Live Google Reports (SRK...🧑 Sheet) ───────────────── */}
      <div className="card mb-6" style={{ borderLeft: '4px solid var(--gold)', background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(212,175,55,0.04) 100%)' }}>
        <div className="card-header" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18 }}>
              <FileText size={20} color="var(--gold)" />
              <span>Live Google Reports & Sheets (SRK...🧑)</span>
            </div>
            <div className="card-subtitle">Real-time reports fetched directly from spreadsheet columns for {selectedCompany}</div>
          </div>
          <button
            onClick={() => openPrintCenter(selectedCompany, selectedCompany)}
            className="btn"
            style={{
              background: 'var(--gold)',
              color: '#0f172a',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13
            }}
          >
            <Printer size={16} /> Print Reports ({selectedCompany})
          </button>
        </div>
        {sheetLinks.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg)', borderRadius: '8px', border: '1px dashed var(--border)' }}>
            No spreadsheet report links found for {selectedCompany} in the SRK sheet.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '12px'
          }}>
            {sheetLinks.map((linkItem, idx) => (
              <a
                key={idx}
                href={linkItem.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text)',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '13px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--gold)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(212,175,55,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'var(--gold)' }}>•</span> {linkItem.title}
                </span>
                <ExternalLink size={15} color="var(--gold)" style={{ flexShrink: 0 }} />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* ─── 12-Month Revenue vs Expenses ──────────────────────── */}
      <div className="card mb-6">
        <div className="card-header">
          <div>
            <div className="card-title">12-Month Revenue vs Expenses</div>
            <div className="card-subtitle">Full year overview in USD</div>
          </div>
          <button
            onClick={() => exportCSV(monthly, `${selectedCompany.replace(/\s+/g, '_')}_monthly_report.csv`)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--gold-glow)', border: '1px solid var(--border-accent)', color: 'var(--gold)', padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            <Download size={15} /> Export CSV
          </button>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthly} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v/1000}k`} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="revenue"  name="Revenue"  fill="#f59e0b" radius={[4,4,0,0]} />
            <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ─── Order Trend ────────────────────────────────────────── */}
      <div className="card mb-6">
        <div className="card-header">
          <div>
            <div className="card-title">Monthly Order Volume</div>
            <div className="card-subtitle">Number of orders placed per month</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={monthly} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="ordGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Line type="monotone" dataKey="orders" name="Orders" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-grid">
        {/* ─── Top Products ──────────────────────────────────────── */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Top Products by Revenue</div>
              <div className="card-subtitle">Best-selling rugs for {selectedCompany}</div>
            </div>
            <button
              onClick={() => exportCSV(topProducts, 'top_products.csv')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--gold-glow)', border: '1px solid var(--border-accent)', color: 'var(--gold)', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              <Download size={13} /> CSV
            </button>
          </div>
          <div className="table-wrapper">
            {topProducts.length === 0 ? (
               <p style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>No products sold by this company.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Orders</th>
                    <th>Units</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((p, i) => (
                    <tr key={i}>
                      <td style={{ color: 'var(--text-muted)', fontWeight: 700 }}>{i + 1}</td>
                      <td style={{ maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.product_name}</td>
                      <td style={{ color: 'var(--gold)', fontFamily: 'monospace', fontSize: 12 }}>{p.sku}</td>
                      <td>{p.order_count}</td>
                      <td>{p.units_sold}</td>
                      <td style={{ color: 'var(--success)', fontWeight: 700 }}>${p.total_revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ─── Platform Comparison ──────────────────────────────── */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Platform Comparison</div>
              <div className="card-subtitle">Amazon FBA vs Etsy performance</div>
            </div>
          </div>
          <div className="table-wrapper" style={{ marginBottom: 20 }}>
            <table>
              <thead>
                <tr>
                  <th>Platform</th>
                  <th>Orders</th>
                  <th>Revenue</th>
                  <th>Avg Order</th>
                  <th>Return %</th>
                </tr>
              </thead>
              <tbody>
                {platforms.map(p => (
                  <tr key={p.platform}>
                    <td><span className={`platform-pill ${p.platform}`}>{p.platform === 'amazon' ? '📦 Amazon' : '🛍 Etsy'}</span></td>
                    <td>{p.total_orders}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 700 }}>${p.total_revenue.toLocaleString()}</td>
                    <td>${p.avg_order}</td>
                    <td style={{ color: p.return_rate > 10 ? 'var(--danger)' : 'inherit' }}>{p.return_rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={platforms} dataKey="total_revenue" nameKey="platform" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4}>
                {platforms.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} stroke="none" />)}
              </Pie>
              <Tooltip formatter={(v) => [`$${v.toLocaleString()}`, 'Revenue']} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── Print Center Modal ─────────────────────────────────── */}
      {showPrintModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            width: '100%',
            maxWidth: 850,
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ padding: 10, background: 'rgba(212,175,55,0.1)', borderRadius: 8 }}>
                  <Printer size={24} color="var(--gold)" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, color: 'var(--text)' }}>
                    Print Reports Center — {printModalTitle}
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                    Manage, view, and print live spreadsheet reports across selected companies.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPrintModal(false)}
                style={{
                  background: 'none', border: 'none', color: 'var(--text-muted)',
                  fontSize: 24, cursor: 'pointer', padding: 4
                }}
              >×</button>
            </div>

            {/* Modal Actions Bar */}
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              background: 'rgba(212,175,55,0.03)'
            }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Found <strong>{printReportsList.length}</strong> reports ready for printing.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  disabled={printReportsList.length === 0}
                  onClick={() => {
                    if (window.confirm(`This will open ${printReportsList.length} report tabs in your browser for direct printing. Please ensure pop-ups are allowed. Continue?`)) {
                      printReportsList.forEach((report, idx) => {
                        setTimeout(() => {
                          window.open(report.url, '_blank')
                        }, idx * 350)
                      })
                    }
                  }}
                  className="btn"
                  style={{
                    background: 'linear-gradient(135deg, var(--gold) 0%, #b89728 100%)',
                    color: '#0f172a', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                    borderRadius: 6, border: 'none', cursor: printReportsList.length ? 'pointer' : 'not-allowed', fontSize: 13
                  }}
                >
                  <Printer size={15} /> Open All to Print ({printReportsList.length})
                </button>
              </div>
            </div>

            {/* Modal Body / Report List */}
            <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
              {loadingPrintReports ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12 }}>
                  <div className="spinner" style={{ width: 32, height: 32 }} />
                  <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Fetching latest live reports from SRK sheet...</span>
                </div>
              ) : printReportsList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  No reports found for this selection.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {Object.entries(
                    printReportsList.reduce((acc, r) => {
                      const coName = r.company || "Other Reports"
                      if (!acc[coName]) acc[coName] = []
                      acc[coName].push(r)
                      return acc
                    }, {})
                  ).map(([companyName, items]) => (
                    <div key={companyName} style={{
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        padding: '10px 16px',
                        background: 'var(--bg-card)',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontWeight: 600,
                        fontSize: 14,
                        color: 'var(--text)'
                      }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)' }} />
                          {companyName}
                        </span>
                        <span style={{ fontSize: 12, padding: '2px 8px', background: 'rgba(212,175,55,0.1)', color: 'var(--gold)', borderRadius: 12 }}>
                          {items.length} {items.length === 1 ? 'Report' : 'Reports'}
                        </span>
                      </div>
                      <div style={{ divideY: '1px solid var(--border)' }}>
                        {items.map((item, idx) => (
                          <div key={idx} style={{
                            padding: '12px 16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: idx < items.length - 1 ? '1px solid var(--border)' : 'none',
                            gap: 16
                          }}>
                            <div style={{ overflow: 'hidden' }}>
                              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>
                                {item.title}
                              </div>
                              <a href={item.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--text-muted)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                                {item.url}
                              </a>
                            </div>
                            <button
                              onClick={() => window.open(item.url, '_blank')}
                              className="btn"
                              style={{
                                background: 'transparent',
                                border: '1px solid var(--gold)',
                                color: 'var(--gold)',
                                padding: '6px 12px',
                                borderRadius: 6,
                                cursor: 'pointer',
                                fontSize: 12,
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                flexShrink: 0
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.background = 'var(--gold)'
                                e.currentTarget.style.color = '#0f172a'
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.background = 'transparent'
                                e.currentTarget.style.color = 'var(--gold)'
                              }}
                            >
                              <Printer size={13} /> Print
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'flex-end',
              background: 'var(--bg)'
            }}>
              <button
                onClick={() => setShowPrintModal(false)}
                className="btn"
                style={{
                  padding: '8px 18px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 13
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
