import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { Building, ArrowLeft, FileText, ExternalLink, Printer, Search, Layers, Activity, Filter, Globe, ShoppingCart, Trash2 } from 'lucide-react'

// ── Spin-On-Hold Interactive Helper ───────────────────────────────────
function SpinOnHold({ children, style, className }) {
  const [holding, setHolding] = useState(false)
  const [speed, setSpeed] = useState(1.2)

  useEffect(() => {
    let timerId;
    if (holding) {
      const startTime = Date.now()
      timerId = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000
        if (elapsed > 5) {
          const extra = elapsed - 5
          const newDuration = Math.max(0.1, 1 - extra * 0.15)
          setSpeed(newDuration)
        } else {
          setSpeed(1.2 - (elapsed / 5) * 0.4)
        }
      }, 100)
    } else {
      setSpeed(1.2)
    }
    return () => clearInterval(timerId)
  }, [holding])

  return (
    <div
      onMouseDown={() => setHolding(true)}
      onMouseUp={() => setHolding(false)}
      onMouseLeave={() => setHolding(false)}
      onTouchStart={() => setHolding(true)}
      onTouchEnd={() => setHolding(false)}
      className={className}
      style={{
        ...style,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'grab',
        animation: holding ? `spinSpeedup ${speed}s linear infinite` : 'none',
        transition: 'transform 0.1s ease',
        userSelect: 'none'
      }}
      title="Click & hold to spin (gradually increases speed after 5 seconds!)"
    >
      {children}
    </div>
  )
}

const REPORTS_CUSTOM_CSS = `
@keyframes spinSpeedup {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes pulseDot {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}

@keyframes shimmerSweep {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes cardCascade {
  from { opacity: 0; transform: translateY(20px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes floatGlow {
  0%, 100% { box-shadow: 0 4px 20px rgba(0,0,0,0.2), 0 0 0 1px rgba(212,175,55,0.15); }
  50% { box-shadow: 0 10px 30px rgba(212,175,55,0.25), 0 0 15px rgba(212,175,55,0.2) inset, 0 0 0 1px rgba(212,175,55,0.4); }
}

.report-cyber-card {
  position: relative;
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.75) 0%, rgba(15, 23, 42, 0.92) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  height: 100%;
  width: 100%;
  text-decoration: none;
  color: var(--text);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
  backdrop-filter: blur(16px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  opacity: 0;
  animation: cardCascade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.report-cyber-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; height: 3px;
  background: linear-gradient(90deg, transparent, var(--gold), transparent);
  opacity: 0;
  transition: opacity 0.35s ease;
}

.report-cyber-card:hover {
  transform: translateY(-6px) scale(1.02);
  border-color: rgba(212, 175, 55, 0.5);
  box-shadow: 0 16px 36px rgba(0,0,0,0.4), 0 0 20px rgba(212,175,55,0.15), 0 0 0 1px rgba(212,175,55,0.3);
  background: linear-gradient(135deg, rgba(35, 48, 68, 0.85) 0%, rgba(20, 30, 50, 0.95) 100%);
}

.report-cyber-card:hover::before {
  opacity: 1;
}

.report-cyber-card .action-icon {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), color 0.3s ease;
}

.report-cyber-card:hover .action-icon {
  transform: translateX(5px) scale(1.1);
  color: #fff !important;
}

.report-cyber-card .card-badge {
  font-family: 'JetBrains Mono', monospace, sans-serif;
  font-size: 11px;
  font-weight: 700;
  color: rgba(212, 175, 55, 0.7);
  background: rgba(212, 175, 55, 0.1);
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid rgba(212, 175, 55, 0.2);
  transition: all 0.3s ease;
}

.report-cyber-card:hover .card-badge {
  background: var(--gold);
  color: #0f172a;
  box-shadow: 0 0 10px rgba(212, 175, 55, 0.4);
}

.live-pulse-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #10b981;
  display: inline-block;
  animation: pulseDot 2s infinite;
}

.search-input-glow:focus {
  outline: none;
  border-color: var(--gold) !important;
  box-shadow: 0 0 15px rgba(212,175,55,0.25) !important;
}
`;

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
  const [selectedPrintUrls, setSelectedPrintUrls] = useState(new Set())

  const [reportSearch, setReportSearch] = useState("")
  const [reportCategory, setReportCategory] = useState("ALL")
  const [deleteMode, setDeleteMode] = useState(false)

  const togglePrintUrl = (url) => {
    const next = new Set(selectedPrintUrls)
    if (next.has(url)) next.delete(url)
    else next.add(url)
    setSelectedPrintUrls(next)
  }

  const toggleCompanyPrintUrls = (items) => {
    const allSelected = items.length > 0 && items.every(r => selectedPrintUrls.has(r.url))
    const next = new Set(selectedPrintUrls)
    items.forEach(r => {
      if (allSelected) next.delete(r.url)
      else next.add(r.url)
    })
    setSelectedPrintUrls(next)
  }

  const toggleAllPrintUrls = () => {
    if (printReportsList.length > 0 && selectedPrintUrls.size === printReportsList.length) {
      setSelectedPrintUrls(new Set())
    } else {
      setSelectedPrintUrls(new Set(printReportsList.map(r => r.url)))
    }
  }

  const openPrintCenter = (compFilter = "all", title = "All Companies") => {
    setPrintModalTitle(title)
    setShowPrintModal(true)
    setLoadingPrintReports(true)
    setSelectedPrintUrls(new Set())
    axios.get(`${API}/api/reports/google-sheet-links`, { params: { company: compFilter } })
      .then(res => {
        const list = res.data || []
        setPrintReportsList(list)
      })
      .catch(err => {
        console.error("Error fetching print reports:", err)
        setPrintReportsList([])
      })
      .finally(() => setLoadingPrintReports(false))
  }

  const handleAutoPrintReport = (url) => {
    const win = window.open(url, '_blank')
    if (win) {
      setTimeout(() => {
        try {
          win.focus()
          win.print()
        } catch (e) {
          console.warn("Cross-origin security prevented direct print(), window opened ready for printing:", e)
        }
      }, 3500)
    }
  }

  const triggerPrintAll = (list) => {
    if (!list || list.length === 0) return
    if (window.confirm(`This will open ${list.length} report tabs in your browser and automatically trigger printing once loaded. Please allow pop-ups. Continue?`)) {
      list.forEach((report, idx) => {
        setTimeout(() => {
          handleAutoPrintReport(report.url)
        }, idx * 1000)
      })
    }
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
    axios.get(`${API}/api/reports/google-sheet-links`, { params: { company: selectedCompany } })
      .then(res => setSheetLinks(res.data || []))
      .catch(err => {
        console.error(err)
        setSheetLinks([])
      })
      .finally(() => setLoading(false))
  }, [API, selectedCompany])

  const filteredLinks = sheetLinks.filter(item => {
    const matchesSearch = !reportSearch || item.title.toLowerCase().includes(reportSearch.toLowerCase())
    if (!matchesSearch) return false
    if (reportCategory === 'ALL') return true
    const t = item.title.toLowerCase()
    if (reportCategory === 'ORDERS') return t.includes('order') || t.includes('po') || t.includes('sales') || t.includes('whatsapp') || t.includes('amazon') || t.includes('dhurrie')
    if (reportCategory === 'BILLS') return t.includes('bill') || t.includes('challan') || t.includes('bank') || t.includes('debit') || t.includes('calc') || t.includes('statement')
    if (reportCategory === 'JOB') return t.includes('job') || t.includes('rcv') || t.includes('production') || t.includes('floor') || t.includes('salary') || t.includes('issue') || t.includes('quantity')
    return true
  })

  return (
    <div>
      <style>{REPORTS_CUSTOM_CSS}</style>
      {!selectedCompany ? (
        <div style={{ maxWidth: 1150, margin: '40px auto' }}>
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
            <SpinOnHold><Printer size={18} /></SpinOnHold> Print All Reports (All Companies)
          </button>
        </div>
        
        <div className="reports-company-grid">
          {COMPANIES.map(co => (
            <div 
              key={co.name}
              onClick={() => { setSelectedCompany(co.name); setDeleteMode(false); }}
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
                <SpinOnHold><Building size={32} /></SpinOnHold>
              </div>
              <h3 style={{ fontSize: 18, margin: 0 }}>{co.name}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>View Reports &rarr;</p>
            </div>
          ))}
        </div>
      </div>
      ) : (
        /* ── View 2: Company Reports Dashboard ── */
        <div>

      {/* ── Dashboard Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button 
            onClick={() => { setSelectedCompany(null); setReportSearch(""); setReportCategory("ALL"); }}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(-3px)'; e.currentTarget.style.borderColor = 'var(--gold)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="live-pulse-dot" />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', color: '#10b981', fontFamily: 'monospace', textTransform: 'uppercase' }}>
                Live Feed Active • Direct Spreadsheet Sync
              </span>
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: '6px 0 4px 0', background: 'linear-gradient(135deg, #fff 0%, var(--gold) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'flex', alignItems: 'center', gap: 12 }}>
              <SpinOnHold><Building size={26} color="var(--gold)" style={{ flexShrink: 0 }} /></SpinOnHold>
              {selectedCompany} Command Center
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={() => setDeleteMode(!deleteMode)}
            className="btn"
            style={{
              background: deleteMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${deleteMode ? '#ef4444' : 'rgba(255,255,255,0.15)'}`,
              color: deleteMode ? '#ef4444' : 'var(--text)',
              padding: '10px 18px',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Trash2 size={16} color={deleteMode ? '#ef4444' : 'var(--text-muted)'} />
            {deleteMode ? 'Done Removing' : 'Remove Links'}
          </button>

          <a
            href="https://docs.google.com/spreadsheets/d/1pMyWyI6J2YM7DzlYJ9__M8bZNaGPyrgTVAItoSiYYNg/edit?gid=2023338778#gid=2023338778"
            target="_blank"
            rel="noreferrer"
            className="btn"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'var(--text)',
              padding: '10px 18px',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'var(--gold)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
          >
            <SpinOnHold><Globe size={16} color="var(--gold)" /></SpinOnHold> Master Google Sheet
          </a>

          <button
            onClick={() => openPrintCenter(selectedCompany, selectedCompany)}
            className="btn"
            style={{
              background: 'linear-gradient(135deg, var(--gold) 0%, #b89728 100%)',
              color: '#0f172a',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(212,175,55,0.3)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
          >
            <SpinOnHold><Printer size={16} /></SpinOnHold> Print Reports ({selectedCompany})
          </button>
        </div>
      </div>

      {/* ─── Ultra-Advanced Live Google Reports Section ─────────── */}
      <div style={{
        background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.7) 100%)',
        border: '1px solid rgba(212, 175, 55, 0.2)',
        borderRadius: 20,
        padding: '28px',
        boxShadow: '0 24px 50px rgba(0, 0, 0, 0.3), 0 0 40px rgba(212, 175, 55, 0.05) inset',
        backdropFilter: 'blur(16px)',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 40
      }}>
        {/* Animated Glow Accent Top Bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 4,
          background: 'linear-gradient(90deg, #3b82f6, var(--gold), #10b981, var(--gold), #3b82f6)',
          backgroundSize: '200% 100%',
          animation: 'shimmerSweep 8s linear infinite'
        }} />

        {/* Section Header & Filter Control Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 28,
          flexWrap: 'wrap',
          gap: 20,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: 22
        }}>
          {/* Search & Category Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', width: '100%', justifyContent: 'space-between' }}>
            <div style={{ position: 'relative', minWidth: 240, flex: '1 1 240px', maxWidth: 320 }}>
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder=""
                value={reportSearch}
                onChange={e => setReportSearch(e.target.value)}
                className="search-input-glow"
                style={{
                  width: '100%',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 10,
                  padding: '10px 14px 10px 38px',
                  color: '#fff',
                  fontSize: 13,
                  transition: 'all 0.3s ease'
                }}
              />
              {reportSearch && (
                <button onClick={() => setReportSearch("")} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>×</button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, background: 'rgba(15, 23, 42, 0.6)', padding: 5, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap' }}>
              {[
                { id: 'ALL', label: `🌟 All (${sheetLinks.length})` },
                { id: 'ORDERS', label: '📦 Orders & Sales' },
                { id: 'BILLS', label: '🧾 Bills & Challans' },
                { id: 'JOB', label: '⚙️ Job & Production' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setReportCategory(tab.id)}
                  style={{
                    background: reportCategory === tab.id ? 'var(--gold)' : 'transparent',
                    color: reportCategory === tab.id ? '#0f172a' : 'var(--text-muted)',
                    fontWeight: reportCategory === tab.id ? 700 : 600,
                    border: 'none',
                    padding: '7px 14px',
                    borderRadius: 8,
                    fontSize: 12,
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    boxShadow: reportCategory === tab.id ? '0 2px 10px rgba(212,175,55,0.3)' : 'none'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Report Cards Grid */}
        {sheetLinks.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(15, 23, 42, 0.5)', borderRadius: 14, border: '1px dashed rgba(255,255,255,0.15)' }}>
            <Activity size={40} color="var(--gold)" style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
            <h3 style={{ fontSize: 16, color: '#fff', margin: '0 0 6px 0' }}>No live report feeds found</h3>
            <p style={{ fontSize: 13, margin: 0 }}>Spreadsheet report columns for {selectedCompany} appear to be empty or loading.</p>
          </div>
        ) : filteredLinks.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(15, 23, 42, 0.5)', borderRadius: 14, border: '1px dashed rgba(255,255,255,0.15)' }}>
            <Filter size={40} color="var(--gold)" style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
            <h3 style={{ fontSize: 16, color: '#fff', margin: '0 0 6px 0' }}>No matching reports</h3>
            <p style={{ fontSize: 13, margin: '0 0 16px 0' }}>No reports match your current filter criteria "{reportSearch || reportCategory}".</p>
            <button onClick={() => { setReportSearch(""); setReportCategory("ALL"); }} className="btn" style={{ background: 'var(--gold)', color: '#0f172a', padding: '8px 16px', borderRadius: 8, fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer' }}>Reset Filters</button>
          </div>
        ) : (
          <div className="reports-items-grid">
            {filteredLinks.map((linkItem, idx) => {
              const t = linkItem.title.toLowerCase()
              let IconComp = Activity
              let iconColor = "#38bdf8"
              let iconBg = "rgba(56, 189, 248, 0.1)"
              if (t.includes('order') || t.includes('po') || t.includes('sales') || t.includes('amazon') || t.includes('dhurrie')) {
                IconComp = ShoppingCart
                iconColor = "#f59e0b"
                iconBg = "rgba(245, 158, 11, 0.1)"
              } else if (t.includes('bill') || t.includes('challan') || t.includes('bank') || t.includes('debit') || t.includes('statement') || t.includes('calc')) {
                IconComp = FileText
                iconColor = "#10b981"
                iconBg = "rgba(16, 185, 129, 0.1)"
              } else if (t.includes('job') || t.includes('rcv') || t.includes('production') || t.includes('floor') || t.includes('salary') || t.includes('issue')) {
                IconComp = Layers
                iconColor = "#a855f7"
                iconBg = "rgba(168, 85, 247, 0.1)"
              }

              return (
                <a
                  key={idx}
                  href={deleteMode ? undefined : linkItem.url}
                  onClick={(e) => {
                    if (deleteMode) {
                      e.preventDefault()
                      setSheetLinks(prev => prev.filter(l => l.url !== linkItem.url))
                    }
                  }}
                  target={deleteMode ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  className="report-cyber-card"
                  style={{ animationDelay: `${(idx % 12) * 0.04}s`, cursor: 'pointer', border: deleteMode ? '1px dashed #ef4444' : undefined }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                    {deleteMode ? (
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setSheetLinks(prev => prev.filter(l => l.url !== linkItem.url))
                        }}
                        style={{
                          background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6,
                          padding: '3px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                        }}
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    ) : (
                      <span className="card-badge">
                        #{String(idx + 1).padStart(2, '0')}
                      </span>
                    )}
                  </div>

                  <div style={{ 
                    fontWeight: 700, 
                    fontSize: 13, 
                    color: '#f8fafc', 
                    margin: '2px 0 0 0', 
                    lineHeight: 1.35, 
                    letterSpacing: '0.2px',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {linkItem.title}
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </div>
      </div>
      )}

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
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: printReportsList.length ? 'pointer' : 'default', fontSize: 13, color: 'var(--text)', userSelect: 'none', fontWeight: 600 }}>
                  <input 
                    type="checkbox" 
                    disabled={printReportsList.length === 0}
                    checked={printReportsList.length > 0 && selectedPrintUrls.size === printReportsList.length}
                    onChange={toggleAllPrintUrls}
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--gold)' }}
                  />
                  Select All ({printReportsList.length})
                </label>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {selectedPrintUrls.size > 0 ? (
                    <span>Selected <strong>{selectedPrintUrls.size}</strong> to print</span>
                  ) : (
                    <span>Found <strong>{printReportsList.length}</strong> reports ready for printing.</span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  disabled={printReportsList.length === 0}
                  onClick={() => {
                    const toPrint = selectedPrintUrls.size > 0 
                      ? printReportsList.filter(r => selectedPrintUrls.has(r.url))
                      : printReportsList;
                    triggerPrintAll(toPrint);
                  }}
                  className="btn"
                  style={{
                    background: 'linear-gradient(135deg, var(--gold) 0%, #b89728 100%)',
                    color: '#0f172a', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                    borderRadius: 6, border: 'none', cursor: printReportsList.length ? 'pointer' : 'not-allowed', fontSize: 13
                  }}
                >
                  <Printer size={15} /> {selectedPrintUrls.size > 0 ? `Print Selected (${selectedPrintUrls.size})` : `Open All to Print (${printReportsList.length})`}
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
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                          <input 
                            type="checkbox" 
                            checked={items.length > 0 && items.every(r => selectedPrintUrls.has(r.url))}
                            onChange={() => toggleCompanyPrintUrls(items)}
                            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--gold)' }}
                          />
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)' }} />
                          {companyName}
                        </label>
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden', flex: 1 }}>
                              <input 
                                type="checkbox" 
                                checked={selectedPrintUrls.has(item.url)}
                                onChange={() => togglePrintUrl(item.url)}
                                style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--gold)', flexShrink: 0 }}
                              />
                              <div style={{ overflow: 'hidden' }}>
                                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>
                                  {item.title}
                                </div>
                                <a href={item.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--text-muted)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                                  {item.url}
                                </a>
                              </div>
                            </div>
                            <button
                              onClick={() => handleAutoPrintReport(item.url)}
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
