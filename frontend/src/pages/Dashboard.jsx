import { useState, useEffect, useRef, useMemo } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import {
  DollarSign, ShoppingCart, Package, AlertTriangle,
  TrendingUp, TrendingDown, Users, FileText, AlertCircle, Layers, X, Calendar, Clock, List
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

// ── Custom Tooltip ────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const total = payload.reduce((sum, p) => sum + (Number(p.value) || 0), 0)
  return (
    <div style={{
      background: '#0f172a', border: '1px solid var(--border)',
      borderRadius: '12px', padding: '12px 14px', fontSize: 13,
      boxShadow: 'var(--shadow), var(--glass-shine)',
      backdropFilter: 'blur(32px) saturate(200%)',
      WebkitBackdropFilter: 'blur(32px) saturate(200%)'
    }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{label}</p>
      {[...payload].sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0)).map((p, i) => (
        <p key={i} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: ${Number(p.value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
        </p>
      ))}
      <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--border)', color: 'var(--text-primary)', fontWeight: 700 }}>
        Total: ${total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
      </div>
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────
function KPICard({ icon: Icon, label, value, sub, colorClass, prefix = '', format = 'number', className = '', style = {} }) {
  let display = value
  if (format === 'currency') display = `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 0 })}`
  else if (format === 'number') display = Number(value).toLocaleString()
  
  return (
    <div className={`kpi-card ${className}`} style={style}>
      <div className="kpi-header">
        <span className="kpi-label">{label}</span>
        <div className={`kpi-icon ${colorClass}`}><Icon size={18} /></div>
      </div>
      <div className="kpi-value">{display}</div>
      <div className="kpi-sub">{sub}</div>
    </div>
  )
}

const PortalGrowthCard = ({ revenueChart, style = {} }) => {
  const [spinCount, setSpinCount] = useState(0);
  
  const portals = useMemo(() => {
    if (!revenueChart || revenueChart.length < 2) return [];
    const latest = revenueChart[revenueChart.length - 1];
    const keySet = new Set(["AMAZON", "CASAVANI WEBSITE", "EBAY-RUGSFOREVER", "ETSY-CASAVANI", "ETSY-RUGSFOREVER", "JAYPOR", "MIRRAW", "PEPPERFRY", "WALMART"]);
    revenueChart.forEach(item => {
      if (item && typeof item === 'object') {
        Object.keys(item).forEach(k => {
          if (k !== 'month' && k !== 'total' && k !== '_dt') keySet.add(k);
        });
      }
    });
    const keys = Array.from(keySet);
    
    return keys.map(key => {
      const currentVal = Number(latest[key]) || 0;
      const prevVal = Number(prev[key]) || 0;
      
      if (currentVal === 0 && prevVal === 0) return null;

      let growth = 0;
      if (prevVal > 0) {
        growth = ((currentVal - prevVal) / prevVal) * 100;
      } else if (currentVal > 0 && prevVal === 0) {
        growth = 100;
      }
      
      if (isNaN(growth) || !isFinite(growth)) growth = 0;
      return { name: key.replace('-', ' '), growth };
    }).filter(Boolean).sort((a, b) => b.growth - a.growth);
  }, [revenueChart]);

  if (!portals || portals.length === 0) return (
    <KPICard icon={TrendingUp} label="Portal Growth" value="N/A" sub="Not enough data" colorClass="success" style={style} />
  );

  const getPortalForFace = (i) => {
    let k = spinCount - (spinCount % 3) + i;
    if (k < spinCount - 1) k += 3;
    return portals[k % portals.length];
  };

  return (
    <div 
      className="cube-container" 
      onClick={(e) => { if (e && e.preventDefault) e.preventDefault(); setSpinCount(c => c + 1); }}
      style={{ cursor: 'pointer', userSelect: 'none', ...style }}
    >
      <div 
        className="cube" 
        style={{ 
          transform: `translateZ(-140px) rotateY(${spinCount * -120}deg)`, 
          transition: 'transform 0.4s ease-out' 
        }}
      >
        {[0, 1, 2].map(i => {
          const p = getPortalForFace(i);
          const isUp = p.growth >= 0;
          return (
            <div key={i} className="cube-face">
              <div style={{ width: '100%', height: '100%' }}>
                <KPICard 
                  icon={isUp ? TrendingUp : TrendingDown} 
                  label={p.name} 
                  value={`${isUp ? '+' : ''}${p.growth.toFixed(1)}%`} 
                  sub="Growth vs Last Month" 
                  colorClass={isUp ? "success" : "danger"} 
                  format="text"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const RevenueSpinningCard = ({ kpis, companiesRev, style = {} }) => {
  const [spinCount, setSpinCount] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  
  const faces = [
    { key: 'today', label: "Today's Revenue", value: kpis?.today_revenue || 0, sub: "Today only", icon: DollarSign, colorClass: 'gold' },
    { key: 'month', label: "This Month Revenue", value: kpis?.this_month_revenue || 0, sub: "Month to date", icon: DollarSign, colorClass: 'gold' },
    { key: 'year', label: "This Year Revenue", value: kpis?.this_year_revenue || 0, sub: "Financial year", icon: DollarSign, colorClass: 'gold' },
  ];

  const getFace = (i) => {
    let k = spinCount - (spinCount % 3) + i;
    if (k < spinCount - 1) k += 3;
    return faces[k % faces.length];
  };

  const currentFace = faces[spinCount % 3];

  return (
    <div 
      style={{ position: 'relative', ...style }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className="cube-container" 
        onClick={(e) => { 
          if (e && e.preventDefault) e.preventDefault(); 
          setSpinCount(c => c + 1); 
        }}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        <div 
          className="cube" 
          style={{ 
            transform: `translateZ(-140px) rotateY(${spinCount * -120}deg)`, 
            transition: 'transform 0.4s ease-out' 
          }}
        >
          {[0, 1, 2].map(i => {
            const f = getFace(i);
            return (
              <div key={i} className="cube-face">
                <div style={{ width: '100%', height: '100%' }}>
                  <KPICard 
                    icon={f.icon} 
                    label={f.label + " (Click)"} 
                    value={f.value} 
                    sub={f.sub} 
                    colorClass={f.colorClass} 
                    format="currency"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {isHovered && companiesRev && companiesRev[currentFace.key] && (
        <div style={{
          position: 'absolute', top: '105%', left: 0, width: '100%', zIndex: 999,
          background: '#0f172a', border: '1px solid var(--border)', borderRadius: '12px',
          padding: '12px', boxShadow: 'var(--shadow), var(--glass-shine)',
          backdropFilter: 'blur(32px) saturate(200%)',
          WebkitBackdropFilter: 'blur(32px) saturate(200%)'
        }}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text)' }}>
            Companies Revenue ({currentFace.key}):
          </div>
          {companiesRev[currentFace.key].map(c => (
            <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
              <span style={{ color: c.color }}>{c.name}</span>
              <span style={{ fontWeight: 'bold', color: 'var(--text)' }}>${c.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Status Badge ──────────────────────────────────────────────────────
function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>
}


function PlatformPill({ platform }) {
  return <span className={`platform-pill ${platform}`}>{platform === 'amazon' ? '📦 Amazon' : '🛍 Etsy'}</span>
}

// ── Dashboard Page ────────────────────────────────────────────────────
export default function Dashboard() {
  const { API } = useAuth()
  const [kpis, setKpis] = useState(null)
  const [revenueChart, setRevenueChart] = useState(null)
  const [recentOrders, setRecentOrders] = useState([])
  const [todayOrders, setTodayOrders] = useState([])
  const [companiesRev, setCompaniesRev] = useState(null)
  const [loading, setLoading] = useState(true)
  const [shiftOffset,  setShiftOffset]  = useState(0)
  const isPartyActiveRef = useRef(false)
  const shiftOffsetRef = useRef(0)
  const cubeRef = useRef(null)
  const angleRef = useRef(0)
  const timeoutRef = useRef(null)
  const animationRef = useRef(null)
  const holdStartTimeRef = useRef(0)

  useEffect(() => {
    const triggerParty = () => {
      isPartyActiveRef.current = !isPartyActiveRef.current;
      const names = ['kpi-rev', 'kpi-orders', 'kpi-emp', 'kpi-break', 'kpi-portal'];
      
      const resetStyles = () => {
        document.documentElement.style.removeProperty('--party-duration');
        names.forEach(n => document.documentElement.style.removeProperty(`--z-${n}`));
      };

      if (isPartyActiveRef.current) {
        let currentSpeed = 1000;
        
        const loop = async () => {
          if (!isPartyActiveRef.current) {
            resetStyles();
            return;
          }
          
          document.documentElement.style.setProperty('--party-duration', `${currentSpeed}ms`);
          
          // Calculate the exact item that wraps around and push it behind the others
          const nextShift = (shiftOffsetRef.current + 1) % 5;
          shiftOffsetRef.current = nextShift;
          const wrappingName = names[(0 - nextShift + 5) % 5];
          names.forEach(name => {
            document.documentElement.style.setProperty(`--z-${name}`, name === wrappingName ? '1' : '10');
          });
          
          if (document.startViewTransition) {
            const transition = document.startViewTransition(() => {
              setShiftOffset(nextShift);
            });
            try {
              await transition.finished;
            } catch (e) {
              await new Promise(r => setTimeout(r, currentSpeed));
            }
          } else {
            setShiftOffset(nextShift);
            await new Promise(r => setTimeout(r, currentSpeed));
          }
          
          currentSpeed = Math.max(10, currentSpeed * 0.90);
          
          if (isPartyActiveRef.current) {
            requestAnimationFrame(loop);
          }
        };
        
        loop();
      } else {
        resetStyles();
      }
    };
    
    window.addEventListener('trigger-party-mode', triggerParty);
    return () => window.removeEventListener('trigger-party-mode', triggerParty);
  }, []);

  const startSpin = (e) => {
    if (animationRef.current || timeoutRef.current) return;
    
    holdStartTimeRef.current = Date.now();
    
    const spinLoop = () => {
      const heldTime = Date.now() - holdStartTimeRef.current;
      let speed = 2; // base speed
      if (heldTime > 5000) {
        speed += (heldTime - 5000) * 0.01; // gradually increase speed after 5s
        if (speed > 50) speed = 50; // max speed limit
      }
      
      angleRef.current -= speed;
      if (cubeRef.current) {
        cubeRef.current.style.transition = 'none';
        cubeRef.current.style.transform = `translateZ(-140px) rotateY(${angleRef.current}deg)`;
      }
      animationRef.current = requestAnimationFrame(spinLoop);
    };
    
    timeoutRef.current = setTimeout(() => {
      animationRef.current = requestAnimationFrame(spinLoop);
    }, 150);
  };

  const stopSpin = (e) => {
    if (holdStartTimeRef.current === 0) return;
    const heldTime = Date.now() - holdStartTimeRef.current;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (heldTime < 150) {
      angleRef.current -= 120;
    }
    // Snap to nearest 120 degree boundary
    angleRef.current = Math.round(angleRef.current / 120) * 120;
    
    if (cubeRef.current) {
      cubeRef.current.style.transition = 'transform 0.4s ease-out';
      cubeRef.current.style.transform = `translateZ(-140px) rotateY(${angleRef.current}deg)`;
    }
    holdStartTimeRef.current = 0;
  };

  const [showBreakdown, setShowBreakdown] = useState(false)
  const [bdTab,        setBdTab]        = useState('all')
  const [bdCustomDate, setBdCustomDate] = useState('')
  const [bdCustomEndDate, setBdCustomEndDate] = useState('')
  const [bdData,       setBdData]       = useState(null)
  const [bdLoading,    setBdLoading]    = useState(false)

  useEffect(() => {
    let interval;
    if (showBreakdown) {
      interval = setInterval(() => {
        let url = bdTab;
        if (bdTab === 'custom') {
          url = bdCustomDate;
          if (bdCustomEndDate) url += `|${bdCustomEndDate}`;
        }
        axios.get(`${API}/api/breakdown/daily-sales?date=${url}&_=${Date.now()}`)
          .then(res => setBdData(res.data))
          .catch(console.error);
      }, 15000); // Poll every 15 seconds
    }
    return () => clearInterval(interval);
  }, [showBreakdown, bdTab, bdCustomDate, bdCustomEndDate, API])

  const fetchBreakdown = (dateParam) => {
    setBdLoading(true)
    axios.get(`${API}/api/breakdown/daily-sales?date=${dateParam}`)
      .then(res => setBdData(res.data))
      .catch(console.error)
      .finally(() => setBdLoading(false))
  }

  const openBreakdown = () => {
    setShowBreakdown(true)
    setBdTab('all')
    fetchBreakdown('all')
  }

  const handleBdTab = (tab) => {
    setBdTab(tab)
    fetchBreakdown(tab)
  }

  const handleBdCustom = () => {
    if (bdCustomDate) {
      setBdTab('custom')
      let url = bdCustomDate
      if (bdCustomEndDate) url += `|${bdCustomEndDate}`
      fetchBreakdown(url)
    }
  }

  const getLast3Months = () => {
    const months = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push({
        label: d.toLocaleString('en-US', { month: 'short' }) + ' ' + d.getFullYear(),
        value: `month|${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      });
    }
    return months;
  }
  const last3Months = getLast3Months();

  const calculateBdTotal = () => {
    if (!bdData || !bdData.rows || bdData.rows.length === 0) return 0;
    return bdData.rows.reduce((sum, row) => {
      const val = String(row[1] || '').replace(/,/g, '').replace(/\$/g, '').trim();
      return sum + (Number(val) || 0);
    }, 0);
  }

  const getGroupedData = () => {
    if (!bdData?.headers || !bdData?.sub_headers) return []
    const groups = []; let cur = null
    for (let i = 1; i < bdData.sub_headers.length; i++) {
      const h = bdData.headers[i] || '', s = bdData.sub_headers[i] || ''
      if (!cur || cur.header !== h) { cur = { header: h, columns: [] }; groups.push(cur) }
      cur.columns.push({ subHeader: s, colIndex: i })
    }
    return groups
  }

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/api/dashboard/kpis`),
      axios.get(`${API}/api/dashboard/revenue-chart`),
      axios.get(`${API}/api/dashboard/recent-orders`),
      axios.get(`${API}/api/dashboard/today-orders`),
      axios.get(`${API}/api/dashboard/companies-revenue`),
    ]).then(([k, r, o, t, c]) => {
      setKpis(k.data)
      setRevenueChart(r.data)
      setRecentOrders(o.data)
      setTodayOrders(t.data)
      setCompaniesRev(c.data)
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [API])

  if (loading) return (
    <div className="page-loading">
      <div className="big-spinner" />
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading dashboard…</p>
    </div>
  )

  const kpiElements = [
    <RevenueSpinningCard key="rev" kpis={kpis} companiesRev={companiesRev} style={{ viewTransitionName: 'kpi-rev' }} />,
    <div 
      key="orders"
      className="cube-container" 
      onMouseDown={startSpin}
      onMouseUp={stopSpin}
      onMouseLeave={stopSpin}
      onTouchStart={startSpin}
      onTouchEnd={stopSpin}
      onDragStart={(e) => e.preventDefault()}
      style={{ cursor: 'pointer', userSelect: 'none', viewTransitionName: 'kpi-orders' }}
    >
      <div 
        className="cube" 
        ref={cubeRef}
        style={{ 
          transform: `translateZ(-140px) rotateY(${angleRef.current}deg)`, 
          transition: 'transform 0.4s ease-out' 
        }}
      >
        <div className="cube-face"><div style={{ width: '100%', height: '100%' }}><KPICard icon={AlertCircle} label="Orders Today" value={kpis?.today_orders} sub="Hold to spin or Click" colorClass="danger" /></div></div>
        <div className="cube-face"><div style={{ width: '100%', height: '100%' }}><KPICard icon={TrendingUp} label="Orders This Month" value={kpis?.this_month_orders} sub="Month to date" colorClass="warning" /></div></div>
        <div className="cube-face"><div style={{ width: '100%', height: '100%' }}><KPICard icon={TrendingUp} label="Orders This Year" value={kpis?.this_year_orders} sub="Year to date" colorClass="success" /></div></div>
      </div>
    </div>,
    <KPICard key="emp" icon={Users} label="Active Employees" value={kpis?.total_employees ?? 0} sub="Across all departments" colorClass="green" style={{ viewTransitionName: 'kpi-emp' }} />,

    <div key="breakdown" onClick={openBreakdown} style={{ cursor: 'pointer', height: '100%', viewTransitionName: 'kpi-break' }}>
      <KPICard icon={Layers} label="Detailed Breakdown" value="Breakdown" sub="Daily Sale Brands & Portal" colorClass="blue" format="text" className="h-full" />
    </div>,

    <PortalGrowthCard key="portal" revenueChart={revenueChart} style={{ viewTransitionName: 'kpi-portal' }} />
  ];

  const shiftedElements = [];
  for (let i = 0; i < 5; i++) {
    shiftedElements.push(kpiElements[(i - shiftOffset + 5) % 5]);
  }

  const allChartPortals = useMemo(() => {
    const portalSet = new Set(["AMAZON", "CASAVANI WEBSITE", "EBAY-RUGSFOREVER", "ETSY-CASAVANI", "ETSY-RUGSFOREVER", "JAYPOR", "MIRRAW", "PEPPERFRY", "WALMART"]);
    if (Array.isArray(revenueChart)) {
      revenueChart.forEach(item => {
        if (item && typeof item === 'object') {
          Object.keys(item).forEach(key => {
            if (key !== "month" && key !== "total" && key !== "_dt") {
              portalSet.add(key);
            }
          });
        }
      });
    }
    return Array.from(portalSet).sort();
  }, [revenueChart]);

  const portalColorsMap = {
    "AMAZON": "#f59e0b",
    "CASAVANI WEBSITE": "#10b981",
    "EBAY-RUGSFOREVER": "#8b5cf6",
    "ETSY-CASAVANI": "#f87171",
    "ETSY-RUGSFOREVER": "#fb923c",
    "JAYPOR": "#ec4899",
    "MIRRAW": "#06b6d4",
    "PEPPERFRY": "#ef4444",
    "WALMART": "#3b82f6"
  };
  const fallbackColors = ["#6366f1", "#14b8a6", "#f43f5e", "#84cc16", "#d946ef", "#eab308", "#0ea5e9", "#f97316", "#a855f7"];
  const getPortalColor = (portal, index) => {
    return portalColorsMap[portal] || fallbackColors[index % fallbackColors.length];
  };
  const formatPortalName = (portal) => {
    if (!portal) return "";
    return portal.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ').replace('Ebay-rugsforever', 'Ebay-Rugsforever').replace('Etsy-casavani', 'Etsy-Casavani').replace('Etsy-rugsforever', 'Etsy-Rugsforever');
  };

  return (
    <div>
      {/* KPI Grid */}
      <div className="kpi-grid">
        {shiftedElements}
      </div>

      {/* Breakdown Modal */}
      {showBreakdown && (
        <div className="breakdown-overlay" onClick={() => setShowBreakdown(false)}>
          <div className="breakdown-modal" onClick={e => e.stopPropagation()}>
            <div className="breakdown-modal-header">
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Daily Sale Brands & Portal</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {bdTab === 'all' && 'All Data'}
                  {bdTab.startsWith('month|') && `Month — ${bdTab.split('|')[1]}`}
                  {bdTab === 'custom' && `Custom — ${bdCustomDate} ${bdCustomEndDate ? 'to ' + bdCustomEndDate : ''}`}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                {!bdLoading && bdData && bdData.total_rows > 0 && (
                  <div style={{ textAlign: 'right', background: 'rgba(245, 158, 11, 0.1)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Sales</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#f59e0b' }}>
                      ${calculateBdTotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                )}
                <button onClick={() => setShowBreakdown(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
              </div>
            </div>
            <div className="breakdown-tabs">
              <button className={`breakdown-tab ${bdTab === 'all' ? 'active' : ''}`} onClick={() => handleBdTab('all')}><List size={14} /> All</button>
              {last3Months.map(m => (
                <button key={m.value} className={`breakdown-tab ${bdTab === m.value ? 'active' : ''}`} onClick={() => handleBdTab(m.value)}>
                  <Calendar size={14} /> {m.label}
                </button>
              ))}
              <div className="breakdown-tab-custom">
                <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>From:</span>
                <input type="date" value={bdCustomDate} onChange={e => setBdCustomDate(e.target.value)} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', color: 'var(--text-primary)', fontSize: '12px' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>To:</span>
                <input type="date" value={bdCustomEndDate} onChange={e => setBdCustomEndDate(e.target.value)} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', color: 'var(--text-primary)', fontSize: '12px' }} />
                <button className={`breakdown-tab ${bdTab === 'custom' ? 'active' : ''}`} onClick={handleBdCustom}>Go</button>
              </div>
            </div>
            <div className="breakdown-content">
              {bdLoading ? (
                <div className="page-loading" style={{ height: '200px' }}><div className="big-spinner" /><p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Fetching data…</p></div>
              ) : !bdData || bdData.total_rows === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                  <p style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>No data found</p>
                  <p style={{ fontSize: '13px' }}>Try selecting a different date or view all data.</p>
                </div>
              ) : (
                <div className="breakdown-table-wrapper">
                  <table className="breakdown-table">
                    <thead>
                      <tr>
                        <th rowSpan={2} className="sticky-col" style={{ verticalAlign: 'bottom' }}>Date</th>
                        {getGroupedData().map((group, idx) => (
                          <th key={idx} colSpan={group.columns.length} className="main-header">
                            {group.header}
                          </th>
                        ))}
                      </tr>
                      <tr>
                        {getGroupedData().flatMap(group => 
                          group.columns.map(col => (
                            <th key={col.colIndex}>{col.subHeader}</th>
                          ))
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {bdData.rows.map((row, rIdx) => (
                        <tr key={rIdx}>
                          <td>{row[0] || `Row ${rIdx + 1}`}</td>
                          {getGroupedData().flatMap(group => 
                            group.columns.map(col => (
                              <td key={col.colIndex}>{row[col.colIndex] || '-'}</td>
                            ))
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className={`chart-grid ${revenueChart.length >= 7 ? 'stacked' : 'side-by-side'}`}>
        {/* Revenue Area Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Monthly Revenue Trend</div>
              <div className="card-subtitle">All Companies — Monthly Brands</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={revenueChart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v/1000}k`} />
              <Tooltip content={<ChartTooltip />} itemSorter={(item) => -Number(item.value || 0)} />
              <Legend align="center" wrapperStyle={{ fontSize: 12 }} />
              
              {allChartPortals.map((portal, idx) => (
                <Bar key={portal} dataKey={portal} name={formatPortalName(portal)} fill={getPortalColor(portal, idx)} stackId="a" />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Portal Progress Line Chart */}
        <div className="card" style={{ marginTop: '0px' }}>
          <div className="card-header">
            <div>
              <div className="card-title">Portal Growth Progress</div>
              <div className="card-subtitle">Monthly revenue progression per portal</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={revenueChart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v/1000}k`} />
              <Tooltip content={<ChartTooltip />} itemSorter={(item) => -Number(item.value || 0)} />
              <Legend align="center" wrapperStyle={{ fontSize: 12 }} />
              
              {allChartPortals.map((portal, idx) => (
                <Line key={portal} type="monotone" dataKey={portal} name={formatPortalName(portal)} stroke={getPortalColor(portal, idx)} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>


    </div>
  )
}
