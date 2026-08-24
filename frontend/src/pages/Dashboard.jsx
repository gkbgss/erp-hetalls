import { useState, useEffect, useRef, useMemo } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import {
  DollarSign, ShoppingCart, Package, AlertTriangle,
  TrendingUp, TrendingDown, Users, FileText, AlertCircle, Layers, X, Calendar, Clock, List
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, ComposedChart,
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

const ProgressChartTooltip = ({ active, payload, label, data }) => {
  if (!active || !payload?.length) return null
  const currentDataIndex = data?.findIndex(d => d.month === label) ?? -1
  const previousData = currentDataIndex > 0 ? data[currentDataIndex - 1] : null
  
  const portalItems = payload.filter(p => p.name !== 'Sales Count')
  const salesCountItem = payload.find(p => p.name === 'Sales Count')
  const total = portalItems.reduce((sum, p) => sum + (Number(p.value) || 0), 0)

  const getPercentageStr = (prev, curr) => {
    if (prev > 0) {
      const pct = ((curr - prev) / prev) * 100
      const sign = pct > 0 ? "+" : ""
      const color = pct >= 0 ? "var(--success)" : "var(--danger)"
      return ` <span style="color:${color}; font-size:11px; margin-left:4px">(${sign}${pct.toFixed(1)}%)</span>`
    } else if (curr > 0 && prev === 0) {
      return ` <span style="color:var(--success); font-size:11px; margin-left:4px">(+100.0%)</span>`
    }
    return ""
  }

  return (
    <div style={{
      background: '#0f172a', border: '1px solid var(--border)',
      borderRadius: '12px', padding: '12px 14px', fontSize: 13,
      boxShadow: 'var(--shadow), var(--glass-shine)',
      backdropFilter: 'blur(32px) saturate(200%)',
      WebkitBackdropFilter: 'blur(32px) saturate(200%)'
    }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{label}</p>
      {[...portalItems].sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0)).map((p, i) => {
        let percentageStr = ""
        if (previousData) {
          percentageStr = getPercentageStr(Number(previousData[p.dataKey]) || 0, Number(p.value) || 0)
        }
        return (
          <div key={i} style={{ color: p.color, fontWeight: 600, display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '4px' }} dangerouslySetInnerHTML={{
            __html: `<span>${p.name}:</span> <span>$${Number(p.value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}${percentageStr}</span>`
          }} />
        )
      })}
      <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--border)', color: 'var(--text-primary)', fontWeight: 700, display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
        <span>Total:</span> <span>${total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
      </div>
      {salesCountItem && (() => {
        let percentageStr = ""
        if (previousData) {
          percentageStr = getPercentageStr(Number(previousData[salesCountItem.dataKey]) || 0, Number(salesCountItem.value) || 0)
        }
        return (
          <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px dashed var(--border)', color: '#ef4444', fontWeight: 700, display: 'flex', justifyContent: 'space-between', gap: '16px' }} dangerouslySetInnerHTML={{
            __html: `<span>Sales Count:</span> <span>${salesCountItem.value}${percentageStr}</span>`
          }} />
        )
      })()}
    </div>
  )
}

const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{ background: '#0f172a', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px', color: 'white', boxShadow: 'var(--shadow)' }}>
        <div style={{ fontWeight: 600, marginBottom: '4px' }}>{data.name}</div>
        <div style={{ fontSize: '13px', marginBottom: '2px' }}>Revenue: <span style={{ fontWeight: 500 }}>${Number(data.value).toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
        {data.order_count !== undefined && <div style={{ fontSize: '13px' }}>Orders Today: <span style={{ fontWeight: 500 }}>{data.order_count}</span></div>}
      </div>
    );
  }
  return null;
};

// ── KPI Card ──────────────────────────────────────────────────────────
function KPICard({ icon: Icon, label, value, sub, colorClass, prefix = '', format = 'number', className = '', style = {}, valueColor = null, trend = null }) {
  let display = value
  if (format === 'currency') display = `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
  else if (format === 'number') display = Number(value || 0).toLocaleString()
  
  return (
    <div className={`kpi-card ${className}`} style={style}>
      <div className="kpi-header">
        <span className="kpi-label">{label}</span>
        <div className={`kpi-icon ${colorClass}`}><Icon size={18} /></div>
      </div>
      <div className="kpi-value" style={valueColor ? { color: valueColor, fontWeight: 'bold', textShadow: `0 0 12px ${valueColor}40`, display: 'flex', alignItems: 'center', gap: '6px' } : { display: 'flex', alignItems: 'center', gap: '6px' }}>
        {trend === 'up' && <span style={{ color: '#10b981', fontSize: '16px' }}>▲</span>}
        {trend === 'down' && <span style={{ color: '#ef4444', fontSize: '16px' }}>▼</span>}
        {display}
      </div>
      <div className="kpi-sub" style={valueColor ? { color: valueColor, fontWeight: '500' } : {}}>{sub}</div>
    </div>
  )
}

const PortalGrowthCard = ({ revenueChart, style = {} }) => {
  const [spinCount, setSpinCount] = useState(0);
  const touchStartX = useRef(0);
  
  const portals = useMemo(() => {
    if (!revenueChart || revenueChart.length < 2) return [];
    const latest = revenueChart[revenueChart.length - 1];
    const prev = revenueChart[revenueChart.length - 2];
    const keySet = new Set(["AMAZON", "CASAVANI WEBSITE", "EBAY-RUGSFOREVER", "ETSY-CASAVANI", "ETSY-RUGSFOREVER", "JAYPOR", "MIRRAW", "PEPPERFRY", "WALMART"]);
    revenueChart.forEach(item => {
      if (item && typeof item === 'object') {
        Object.keys(item).forEach(k => {
          if (k !== 'month' && k !== 'total' && k !== '_dt' && k !== 'order_count') keySet.add(k);
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
    }).filter(p => p !== null).sort((a, b) => b.growth - a.growth);
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
      onClick={(e) => { 
        if (e && e.preventDefault) e.preventDefault(); 
        const rect = e.currentTarget.getBoundingClientRect();
        const isRight = (e.clientX - rect.left) > rect.width / 2;
        setSpinCount(c => isRight ? c + 1 : (c - 1 + 300) % 300); 
      }}
      onTouchStart={(e) => touchStartX.current = e.touches[0].clientX}
      onTouchEnd={(e) => {
        const diff = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(diff) > 30) {
          setSpinCount(c => diff > 0 ? (c - 1 + 300) % 300 : c + 1);
        }
      }}
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
                  colorClass={isUp ? "green" : "red"} 
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
  const touchStartX = useRef(0);
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
      style={{ position: 'relative', zIndex: isHovered ? 9999 : 1, ...style }}
      onMouseEnter={() => { if (window.matchMedia('(hover: hover)').matches) setIsHovered(true); }}
      onMouseLeave={() => { if (window.matchMedia('(hover: hover)').matches) setIsHovered(false); }}
    >
      <div 
        className="cube-container" 
        onClick={(e) => { 
          if (e && e.preventDefault) e.preventDefault(); 
          const rect = e.currentTarget.getBoundingClientRect();
          let clientX = e.clientX;
          if ((clientX === undefined || clientX === 0) && e.nativeEvent?.changedTouches?.length > 0) {
            clientX = e.nativeEvent.changedTouches[0].clientX;
          }
          const isRight = (clientX - rect.left) > rect.width / 2;
          setSpinCount(c => isRight ? c + 1 : (c - 1 + 300) % 300); 
          setIsHovered(true);
        }}
        onTouchStart={(e) => touchStartX.current = e.touches[0].clientX}
        onTouchEnd={(e) => {
          const diff = e.changedTouches[0].clientX - touchStartX.current;
          if (Math.abs(diff) > 30) {
            setSpinCount(c => diff > 0 ? (c - 1 + 300) % 300 : c + 1);
          }
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
                    label={f.label} 
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
        <div 
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', top: '105%', left: 0, width: '100%', minWidth: '250px', zIndex: 9999,
            background: '#070b16', border: '1px solid var(--border-accent)', borderRadius: '12px',
            padding: '14px', boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), var(--glass-shine)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--gold)' }}>
              Companies Revenue ({currentFace.key}):
            </span>
            <button 
              onClick={(e) => { e.stopPropagation(); setIsHovered(false); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px 6px', fontSize: '14px', fontWeight: 'bold' }}
              title="Close"
            >
              ✕
            </button>
          </div>
          <div style={{ maxHeight: '220px', overflowY: 'auto', paddingRight: '4px' }}>
            {companiesRev[currentFace.key].map(c => (
              <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '12px' }}>
                <span style={{ color: c.color, fontWeight: 500 }}>{c.name}</span>
                <span style={{ fontWeight: 'bold', color: 'var(--text)' }}>${c.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
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

    if (heldTime < 250) {
      const rect = e.currentTarget.getBoundingClientRect();
      const isRight = (e.clientX - rect.left) > rect.width / 2;
      angleRef.current += isRight ? -120 : 120;
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

  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  useEffect(() => {
    let isMounted = true;
    let isServerDown = false;
    const fetchAll = (isInitial = false) => {
      if (isInitial) setLoading(true);
      const t = Date.now();
      Promise.all([
        axios.get(`${API}/api/dashboard/kpis?_t=${t}`),
        axios.get(`${API}/api/dashboard/revenue-chart?_t=${t}`),
        axios.get(`${API}/api/dashboard/recent-orders?_t=${t}`),
        axios.get(`${API}/api/dashboard/today-orders?_t=${t}`),
        axios.get(`${API}/api/dashboard/companies-revenue?_t=${t}`),
      ]).then(([k, r, o, tData, c]) => {
        if (!isMounted) return;
        if (isServerDown) {
          window.location.reload();
          return;
        }
        setKpis(k.data);
        setRevenueChart(r.data);
        setRecentOrders(o.data);
        setTodayOrders(tData.data);
        setCompaniesRev(c.data);
        setLastRefreshed(new Date());
      }).catch((err) => {
        console.error(err);
        isServerDown = true;
      })
        .finally(() => {
          if (isMounted && isInitial) setLoading(false);
        });
    };

    fetchAll(true);
    const interval = setInterval(() => fetchAll(false), 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [API]);

  // Must be above ANY early return — hooks can never be called conditionally
  const allChartPortals = useMemo(() => {
    const portalSet = new Set(["AMAZON", "CASAVANI WEBSITE", "EBAY-RUGSFOREVER", "ETSY-CASAVANI", "ETSY-RUGSFOREVER", "JAYPOR", "MIRRAW", "PEPPERFRY", "WALMART"]);
    if (Array.isArray(revenueChart)) {
      revenueChart.forEach(item => {
        if (item && typeof item === 'object') {
          Object.keys(item).forEach(key => {
            if (key !== "month" && key !== "total" && key !== "_dt" && key !== "order_count") {
              portalSet.add(key);
            }
          });
        }
      });
    }
    return Array.from(portalSet).sort();
  }, [revenueChart]);


  if (loading) return (
    <div className="page-loading">
      <div className="big-spinner" />
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading dashboard…</p>
    </div>
  )

  const isOrdersUp = (kpis?.today_orders ?? 0) >= (kpis?.yesterday_orders ?? 0);

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
        <div className="cube-face"><div style={{ width: '100%', height: '100%' }}><KPICard icon={isOrdersUp ? TrendingUp : TrendingDown} label="Orders Today" value={kpis?.today_orders} sub="Today only" colorClass={isOrdersUp ? "success" : "danger"} /></div></div>
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

  const portalColorsMap = {
    "AMAZON": "#f59e0b",
    "CASAVANI WEBSITE": "#10b981",
    "EBAY-RUGSFOREVER": "#8b5cf6",
    "ETSY-CASAVANI": "#f43f5e",
    "ETSY-RUGSFOREVER": "#3b82f6",
    "JAYPOR": "#d946ef",
    "MIRRAW": "#06b6d4",
    "PEPPERFRY": "#84cc16",
    "WALMART": "#14b8a6"
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
            <div className="breakdown-modal-header" style={{ position: 'relative', paddingRight: '44px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Daily Sale Brands & Portal</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  {bdTab === 'all' && 'All Data'}
                  {bdTab.startsWith('month|') && `Month — ${bdTab.split('|')[1]}`}
                  {bdTab === 'custom' && `Custom — ${bdCustomDate} ${bdCustomEndDate ? 'to ' + bdCustomEndDate : ''}`}
                </p>
              </div>
              <button 
                onClick={() => setShowBreakdown(false)} 
                style={{ position: 'absolute', top: 0, right: 0, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', borderRadius: '6px' }}
                title="Close"
              >
                <X size={22} />
              </button>
              {!bdLoading && bdData && bdData.total_rows > 0 && (
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Sales</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#f59e0b' }}>
                    ${calculateBdTotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              )}
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
                        <th rowSpan={2} className="date-header-col" style={{ verticalAlign: 'middle', textAlign: 'left', paddingLeft: '14px' }}>Date</th>
                        {getGroupedData().map((group, idx) => {
                          const isSingleEmptySub = group.columns.length === 1 && !group.columns[0].subHeader?.trim();
                          return (
                            <th 
                              key={idx} 
                              colSpan={isSingleEmptySub ? 1 : group.columns.length} 
                              rowSpan={isSingleEmptySub ? 2 : 1}
                              className="main-header"
                              style={{ verticalAlign: 'middle', padding: '10px 14px' }}
                            >
                              {group.header || group.columns[0]?.subHeader || `Col ${idx + 1}`}
                            </th>
                          );
                        })}
                      </tr>
                      <tr>
                        {getGroupedData().flatMap(group => {
                          const isSingleEmptySub = group.columns.length === 1 && !group.columns[0].subHeader?.trim();
                          if (isSingleEmptySub) return [];
                          return group.columns.map(col => (
                            <th key={col.colIndex} style={{ verticalAlign: 'middle', padding: '8px 12px' }}>
                              {col.subHeader || '—'}
                            </th>
                          ));
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {bdData.rows.map((row, rIdx) => (
                        <tr key={rIdx}>
                          <td style={{ whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--text-primary)', paddingLeft: '14px' }}>{row[0] || `Row ${rIdx + 1}`}</td>
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
      <div className={`chart-grid ${(revenueChart?.length || 0) >= 7 ? 'stacked' : 'side-by-side'}`}>
        
        {/* Today's Sales Pie Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Today's Sales Distribution</div>
              <div className="card-subtitle">Revenue breakdown by portal for today</div>
            </div>
          </div>
          {companiesRev?.today && companiesRev.today.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Pie
                  data={companiesRev.today}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={5}
                  stroke="none"
                >
                  {companiesRev.today.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getPortalColor(entry.name, index)} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend align="center" wrapperStyle={{ fontSize: 12, paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '320px', width: '100%', color: 'var(--text-muted)' }}>
              No sales data for today yet.
            </div>
          )}
        </div>

        {/* Revenue Area Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Monthly Revenue Trend</div>
              <div className="card-subtitle">All Companies — Monthly Brands</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={revenueChart || []} margin={{ top: 15, right: 20, left: 0, bottom: 0 }} maxBarSize={45}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v/1000}k`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#ef4444', fontSize: 11 }} axisLine={false} tickLine={false} label={{ value: 'Sales Count', angle: -90, position: 'right', fill: '#ef4444', fontSize: 11, fontWeight: 600, offset: 5 }} />
              <Tooltip content={<ProgressChartTooltip data={revenueChart} />} itemSorter={(item) => -Number(item.value || 0)} cursor={false} />
              <Legend align="center" wrapperStyle={{ fontSize: 12 }} />
              
              {allChartPortals.map((portal, idx) => (
                <Bar yAxisId="left" key={portal} dataKey={portal} name={formatPortalName(portal)} fill={getPortalColor(portal, idx)} stackId="a" />
              ))}
              <Line yAxisId="right" type="linear" dataKey="order_count" name="Sales Count" legendType="none" stroke="#ef4444" strokeWidth={1} label={{ position: 'top', offset: 12, fill: '#ef4444', fontSize: 12, fontWeight: 500 }} dot={{ r: 4, fill: '#ef4444', stroke: '#fff', strokeWidth: 1.5 }} activeDot={{ r: 6, fill: '#ef4444', stroke: '#fff' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>


    </div>
  )
}
