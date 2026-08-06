import React, { useState, useEffect, useCallback, useRef, Fragment } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  BarChart, Bar, PieChart, Pie, Cell, LabelList,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts'
import {
  ArrowLeft, Users, Calendar,
  Calculator, ChevronDown, ChevronUp,
  Edit2, Check, X, Printer, TrendingDown, IndianRupee, Download, Search
} from 'lucide-react'

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
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
          {p.name}: ₹{p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  )
}

const DEPT_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#f97316']

// ─── Live Calculator ───────────────────────────────────────────────────
function LiveCalculator({ API, yearMonth }) {
  const [salary, setSalary] = useState(50000)
  const [absent, setAbsent] = useState(0)
  const [result, setResult] = useState(null)

  useEffect(() => {
    const t = setTimeout(async () => {
      if (salary > 0) {
        try {
          const r = await axios.get(`${API}/api/payroll/calculate`, {
            params: { salary, absent, year_month: yearMonth }
          })
          setResult(r.data)
        } catch (_) {}
      }
    }, 200)
    return () => clearTimeout(t)
  }, [salary, absent, yearMonth, API])

  const pieData = result ? [
    { name: 'Net Pay',          value: result.net_pay,          color: '#10b981' },
    { name: 'Absent Deduction', value: result.absent_deduction, color: '#f59e0b' },
    { name: 'Sunday Penalty',   value: result.sunday_deduction, color: '#ec4899' },
  ].filter(d => d.value > 0) : []

  return (
    <div className="salary-calc-grid">
      <div>
        <div style={{ marginBottom: 16 }}>
          <label className="form-label" style={{ fontSize: 13 }}>Gross Salary (₹)</label>
          <input type="number" min="0" value={salary} onChange={e => setSalary(Number(e.target.value))} className="form-input" style={{ width: '100%', marginTop: 4 }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label className="form-label" style={{ fontSize: 13 }}>Days Absent</label>
          <input type="number" min="0" max={result?.total_days || 31} value={absent} onChange={e => setAbsent(Number(e.target.value))} className="form-input" style={{ width: '100%', marginTop: 4 }} />
        </div>

        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Gross Pay',               value: result.gross,            color: 'var(--text-primary)', bold: true },
              { label: `Absent (${result.absent_days} days)`, value: -result.absent_deduction, color: 'var(--danger)' },
              { label: `Sunday Penalty (${result.sunday_penalty_days})`,value: -result.sunday_deduction, color: 'var(--danger)' },
              { label: 'Total Deductions',        value: -result.total_deductions, color: '#ef4444', bold: true, divider: true },
              { label: 'Net Pay',                 value: result.net_pay,          color: 'var(--success)', bold: true, large: true, bg: 'rgba(16,185,129,0.08)' },
            ].filter(row => row.value !== 0 || row.bold).map((row, i) => (
              <div key={i} className="salary-summary-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', background: row.bg || 'var(--bg-surface)', borderRadius: 8, border: row.large ? '1px solid var(--success)' : '1px solid var(--border)', borderTop: row.divider ? '1px solid var(--border)' : undefined, flexWrap: 'wrap', gap: 6 }}>
                <span style={{ fontSize: row.large ? 14 : 13, fontWeight: row.bold ? 700 : 400, color: 'var(--text-secondary)' }}>{row.label}</span>
                <span style={{ fontSize: row.large ? 18 : 14, fontWeight: row.bold ? 800 : 600, color: row.color, fontFamily: 'monospace' }}>
                  {row.value >= 0 ? '' : '−'} ₹{Math.round(Math.abs(row.value)).toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="salary-calc-chart-col">
        <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)', textAlign: 'center' }}>
          {result?.month} Breakdown ({result?.total_days} Days, {result?.sundays} Sundays)
        </p>
        <div style={{ width: '100%', height: 210, display: 'flex', justifyContent: 'center' }}>
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={84} paddingAngle={3} dataKey="value">
                {pieData.map((e, i) => <Cell key={i} fill={e.color} stroke="none" />)}
              </Pie>
              <Tooltip formatter={v => `₹${Number(v).toLocaleString('en-IN')}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 }}>
          {pieData.map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-secondary)' }}>
              <div style={{ width: 9, height: 9, borderRadius: 2, background: d.color }} />
              {d.name}
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Take-home rate</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--success)' }}>
            {result && result.gross > 0 ? Math.min(100, ((result.net_pay / result.gross) * 100)).toFixed(1) : 0}%
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────
export default function SalaryCalculator() {
  const { API, user: me } = useAuth()
  const navigate = useNavigate()
  
  // Date state (YYYY-MM format)
  const d = new Date()
  const currentYM = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}`
  const [yearMonth, setYearMonth] = useState(currentYM)

  const [summary,     setSummary]     = useState(null)
  const [employees,   setEmployees]   = useState([])
  const [loading,     setLoading]     = useState(true)
  const [expandedId,  setExpandedId]  = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Edit salary state
  const [editId,      setEditId]      = useState(null)
  const [editSalary,  setEditSalary]  = useState('')
  const [saving,      setSaving]      = useState(false)
  const [flashMsg,    setFlashMsg]    = useState(null)
  
  // New input states per employee: { empId: { absent, extraPresent, extraHour, lessHour, adv1, adv2 } }
  const [inputs, setInputs] = useState({})
  
  // Download Modal State
  const [showModal, setShowModal] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split('\n');
      const newInputs = { ...inputs };
      let updated = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(',');
        if (parts.length >= 2) {
          const empName = parts[0].trim().toLowerCase();
          const absentVal = parseFloat(parts[1].trim());
          
          let extraPresentVal = 0;
          if (parts.length >= 3 && parts[2].trim() !== '') {
            extraPresentVal = parseFloat(parts[2].trim());
          }
          
          let adv1Val = 0;
          if (parts.length >= 4 && parts[3].trim() !== '') {
            adv1Val = parseFloat(parts[3].trim());
          }
          
          if (!isNaN(absentVal)) {
            const emp = employees.find(e => e.name.toLowerCase() === empName);
            if (emp) {
              if (!newInputs[emp.id]) {
                newInputs[emp.id] = { absent: 0, extraPresent: 0, extraHour: 0, lessHour: 0, adv1: 0, adv2: 0 };
              }
              newInputs[emp.id].absent = absentVal;
              if (!isNaN(extraPresentVal)) newInputs[emp.id].extraPresent = extraPresentVal;
              if (!isNaN(adv1Val)) newInputs[emp.id].adv1 = adv1Val;
              updated = true;
            }
          }
        }
      }
      if (updated) {
        setInputs(newInputs);
        showFlash('success', 'Absence data loaded from CSV');
      } else {
        showFlash('error', 'No matching employees found in CSV');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };
  const [selectedEmps, setSelectedEmps] = useState(new Set())
  const [isGenerating, setIsGenerating] = useState(false)

  const isAdmin = me?.role === 'admin' || me?.role === 'hr'

  const fetchData = useCallback(() => {
    setLoading(true)
    Promise.all([
      axios.get(`${API}/api/payroll/summary`, { params: { year_month: yearMonth } }),
      axios.get(`${API}/api/payroll/employees`, { params: { year_month: yearMonth } }),
    ]).then(([s, e]) => {
      setSummary(s.data)
      setEmployees(e.data)
      
      const initialInputs = {}
      e.data.forEach(emp => { 
        initialInputs[emp.id] = { absent: 0, extraPresent: 0, extraHour: 0, lessHour: 0, adv1: 0, adv2: 0 }
      })
      setInputs(initialInputs)
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [API, yearMonth])

  useEffect(() => { fetchData() }, [fetchData])

  const showFlash = (type, text) => {
    setFlashMsg({ type, text }); setTimeout(() => setFlashMsg(null), 4000)
  }

  const handleSaveSalary = async (emp) => {
    const newVal = parseFloat(editSalary)
    if (isNaN(newVal) || newVal <= 0) return alert('Enter a valid salary amount')
    setSaving(true)
    try {
      await axios.put(`${API}/api/hr/employees/${emp.id}/salary`, { salary: newVal })
      showFlash('success', `${emp.name}'s salary updated to ₹${newVal.toLocaleString('en-IN')}`)
      setEditId(null)
      fetchData()
    } catch (err) {
      showFlash('error', err.response?.data?.detail || 'Failed to update salary')
    } finally {
      setSaving(false)
    }
  }

  // --- Calculate client-side payroll data based on inputs ---
  const calculatePayroll = (emp) => {
    const input = inputs[emp.id] || { absent: 0, extraPresent: 0, extraHour: 0, lessHour: 0, adv1: 0, adv2: 0 }
    const baseSalary = parseFloat(emp.salary) || 0
    
    const absent = parseFloat(input.absent) || 0
    const extraPresent = parseFloat(input.extraPresent) || 0
    const extraHour = parseFloat(input.extraHour) || 0
    const lessHour = parseFloat(input.lessHour) || 0
    const adv1 = parseFloat(input.adv1) || 0
    const adv2 = parseFloat(input.adv2) || 0
    const totalAdvance = adv1 + adv2

    let daysInMonth = 30; 
    if (yearMonth) {
      const parts = yearMonth.split('-');
      daysInMonth = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10), 0).getDate();
    }
    
    const dailyWage = baseSalary / daysInMonth; 
    const hourlyWage = dailyWage / 8; 
    
    let addedPaidLeave = 0;
    const excludedDepts = ['guard', 'store', 'helper', 'field', 'feild', 'carpet production', 'packing', 'production'];
    const autoCancelPaidLeave = absent > 4;
    const manualCancelPaidLeave = input.cancelPaidLeave === true;
    
    if (!excludedDepts.includes(emp.department.toLowerCase()) && !autoCancelPaidLeave && !manualCancelPaidLeave) {
      addedPaidLeave = dailyWage;
    }
    let addedExtraPresent = extraPresent * dailyWage;
    let addedExtraHour = extraHour * hourlyWage;
    const addedPay = addedPaidLeave + addedExtraPresent + addedExtraHour;
    
    let sundayDeductions = Math.floor(absent / 6);
    let deductedAbsent = absent * dailyWage;
    let deductedPenalty = sundayDeductions * dailyWage;
    
    let deductedLatePay = 0;
    let lateLabel = "";
    if (lessHour > 0) {
      if (lessHour > 12) { deductedLatePay = 2 * dailyWage; lateLabel = "- Late Penalty (>12h)"; }
      else if (lessHour > 8) { deductedLatePay = 1.5 * dailyWage; lateLabel = "- Late Penalty (>8h)"; }
      else if (lessHour > 6) { deductedLatePay = 1 * dailyWage; lateLabel = "- Late Penalty (>6h)"; }
      else if (lessHour > 2.4) { deductedLatePay = 0.5 * dailyWage; lateLabel = "- Late Penalty (>2.4h)"; }
    }
    const deductedPay = deductedAbsent + deductedPenalty + deductedLatePay + totalAdvance;
    let finalSalary = Math.max(0, baseSalary + addedPay - deductedPay);
    
    return {
      baseSalary, addedPaidLeave, addedExtraPresent, addedExtraHour, addedPay,
      sundayDeductions, deductedAbsent, deductedPenalty, deductedLatePay, lateLabel, totalAdvance, deductedPay,
      finalSalary, daysInMonth, absent, extraPresent, extraHour, lessHour
    }
  }

  const handleInputChange = (empId, field, val) => {
    setInputs(prev => ({
      ...prev,
      [empId]: { ...prev[empId], [field]: val }
    }))
  }

  // --- PDF GENERATION LOGIC ---
  const generateSlipHtml = (emp, payroll) => {
    let pdfHtml = `
      <div style="border: 1px solid #000; border-radius: 8px; padding: 12px; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; font-family: Arial, sans-serif; background-color: #fff; color: #000;">
        <div>
          <div style="font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 8px; margin-bottom: 10px; font-size: 1rem; text-align: center; color: #000;">
            ${emp.name} - Detailed Breakdown
          </div>
          <table style="width: 100%; border: none; margin: 0; padding: 0; font-size: 0.85rem; border-collapse: collapse; color: #000;">
            <tr>
              <td style="border: none; text-align: left; padding: 3px 0; font-weight: bold; color: #000;">Base Salary</td>
              <td style="border: none; text-align: right; padding: 3px 0; font-weight: bold; color: #000;">₹${payroll.baseSalary.toFixed(2)}</td>
            </tr>
            <tr><td colspan="2" style="border: none; height: 5px;"></td></tr>
    `;
    if (payroll.addedPaidLeave > 0) pdfHtml += `<tr><td style="border: none; text-align: left; padding: 3px 0; color: #1e7e44;">+ Paid Leave</td><td style="border: none; text-align: right; padding: 3px 0; color: #1e7e44;">₹${payroll.addedPaidLeave.toFixed(2)}</td></tr>`;
    if (payroll.addedExtraPresent > 0) pdfHtml += `<tr><td style="border: none; text-align: left; padding: 3px 0; color: #1e7e44;">+ Extra Present (${payroll.extraPresent}d)</td><td style="border: none; text-align: right; padding: 3px 0; color: #1e7e44;">₹${payroll.addedExtraPresent.toFixed(2)}</td></tr>`;
    if (payroll.addedExtraHour > 0) pdfHtml += `<tr><td style="border: none; text-align: left; padding: 3px 0; color: #1e7e44;">+ Extra Hour (${payroll.extraHour}h)</td><td style="border: none; text-align: right; padding: 3px 0; color: #1e7e44;">₹${payroll.addedExtraHour.toFixed(2)}</td></tr>`;
    
    if (payroll.deductedAbsent > 0) pdfHtml += `<tr><td style="border: none; text-align: left; padding: 3px 0; color: #d32f2f;">- Absent (${payroll.absent}d)</td><td style="border: none; text-align: right; padding: 3px 0; color: #d32f2f;">₹${payroll.deductedAbsent.toFixed(2)}</td></tr>`;
    if (payroll.deductedPenalty > 0) pdfHtml += `<tr><td style="border: none; text-align: left; padding: 3px 0; color: #d32f2f;">- Sunday Deduction (${payroll.sundayDeductions}d)</td><td style="border: none; text-align: right; padding: 3px 0; color: #d32f2f;">₹${payroll.deductedPenalty.toFixed(2)}</td></tr>`;
    if (payroll.deductedLatePay > 0) pdfHtml += `<tr><td style="border: none; text-align: left; padding: 3px 0; color: #d32f2f;">${payroll.lateLabel.trim()}</td><td style="border: none; text-align: right; padding: 3px 0; color: #d32f2f;">₹${payroll.deductedLatePay.toFixed(2)}</td></tr>`;
    if (payroll.totalAdvance > 0) pdfHtml += `<tr><td style="border: none; text-align: left; padding: 3px 0; color: #d32f2f;">- Advance Pay</td><td style="border: none; text-align: right; padding: 3px 0; color: #d32f2f;">₹${payroll.totalAdvance.toFixed(2)}</td></tr>`;
    
    pdfHtml += `
          </table>
        </div>
        <div>
          <div style="border-top: 1px dashed #ccc; margin-top: 10px; padding-top: 8px; margin-bottom: 25px; font-weight: bold; font-size: 1.1rem; display: flex; justify-content: space-between;">
            <span>Net:</span>
            <span>₹${payroll.finalSalary.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: #333; padding: 0 5px;">
            <div style="text-align: center;"><div style="border-top: 1px dashed #333; width: 100px; margin-bottom: 4px;"></div>Employer</div>
            <div style="text-align: center;"><div style="border-top: 1px dashed #333; width: 100px; margin-bottom: 4px;"></div>Employee</div>
          </div>
        </div>
      </div>
    `;
    return pdfHtml;
  }

  const executeDownload = () => {
    if (selectedEmps.size === 0) return alert("Select at least one employee")
    setIsGenerating(true)
    
    const container = document.createElement('div')
    container.style.backgroundColor = '#ffffff'
    
    let currentPage = null
    const selectedArray = Array.from(selectedEmps).map(id => employees.find(e => e.id === id))

    selectedArray.forEach((emp, i) => {
      if (i % 6 === 0) {
        currentPage = document.createElement('div')
        currentPage.style.width = '210mm'
        currentPage.style.height = '295mm' 
        currentPage.style.boxSizing = 'border-box'
        currentPage.style.display = 'flex'
        currentPage.style.flexWrap = 'wrap'
        currentPage.style.justifyContent = 'center'
        currentPage.style.alignContent = 'center'
        currentPage.style.gap = '6mm'
        currentPage.style.backgroundColor = '#ffffff'
        currentPage.style.overflow = 'hidden'
        if (i > 0) currentPage.style.pageBreakBefore = 'always'
        container.appendChild(currentPage)
      }
      
      const payroll = calculatePayroll(emp)
      const wrapper = document.createElement('div')
      wrapper.style.width = '90mm' 
      wrapper.style.height = '90mm' 
      wrapper.innerHTML = generateSlipHtml(emp, payroll)
      currentPage.appendChild(wrapper)
    })

    const opt = {
      margin:       0,
      filename:     `Payroll_Breakdown_${yearMonth}.pdf`,
      image:        { type: 'jpeg', quality: 1.0 },
      html2canvas:  { scale: 2, scrollY: 0, scrollX: 0 }, 
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }

    if (window.html2pdf) {
      window.html2pdf().set(opt).from(container).save().then(() => {
        setIsGenerating(false)
        setShowModal(false)
      }).catch(err => {
        console.error(err)
        alert("Error generating PDF.")
        setIsGenerating(false)
      })
    } else {
      alert("PDF library not loaded yet.")
      setIsGenerating(false)
    }
  }

  const toggleSelectAll = () => {
    if (selectedEmps.size === employees.length) setSelectedEmps(new Set())
    else setSelectedEmps(new Set(employees.map(e => e.id)))
  }
  const toggleSelect = (id) => {
    const next = new Set(selectedEmps)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedEmps(next)
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* ─── Top Bar ──────────────────────────────────────────────── */}
      <div className="salary-top-bar" style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(30, 41, 59, 0.4)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', padding: '0 32px', minHeight: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div className="salary-top-left" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/hr')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <ArrowLeft size={16} /> Back to HR
          </button>
          <div className="salary-top-divider" style={{ width: 1, height: 24, background: 'var(--border)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg, var(--gold), var(--gold-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Calculator size={17} color="#000" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>Salary & Payroll Calculator (INR)</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Advanced Attendance Deduction Rules • Payslip Generation</div>
            </div>
          </div>
        </div>
        <div className="salary-top-right" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-hover)', border: '1px solid var(--border)', padding: '4px 12px', borderRadius: 8 }}>
            <Calendar size={14} style={{ color: 'var(--gold)' }} />
            <input type="month" value={yearMonth} onChange={e => setYearMonth(e.target.value)} 
                   style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: 13, fontWeight: 600, colorScheme: 'dark' }} />
          </div>
          <span style={{ fontSize: 11, color: 'var(--gold)', background: 'var(--gold-glow)', border: '1px solid var(--border-accent)', padding: '4px 10px', borderRadius: 20, fontWeight: 600 }}>HR MODULE</span>
        </div>
      </div>

      <div className="salary-main-content" style={{ padding: '28px 32px' }}>
        {flashMsg && (
          <div style={{ marginBottom: 16, background: flashMsg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${flashMsg.type === 'success' ? 'var(--success)' : 'var(--danger)'}`, color: flashMsg.type === 'success' ? 'var(--success)' : 'var(--danger)', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600 }}>
            {flashMsg.text}
          </div>
        )}

        {loading ? (
          <div className="page-loading"><div className="big-spinner" /></div>
        ) : (
          <>
            {/* ─── KPI Cards ───────────────────────────────────────── */}
            <div className="kpi-grid" style={{ marginBottom: 24 }}>
              {[
                { icon: Users,       label: 'Total Employees',     value: summary?.total_employees, fmt: 'n', color: 'blue' },
                { icon: IndianRupee, label: 'Monthly Gross Payroll',value: summary?.total_gross,    fmt: '₹', color: 'gold' },
                { icon: TrendingDown,label: 'Total Penalties',     value: summary?.total_deductions,fmt: '₹', color: 'red' },
                { icon: IndianRupee, label: 'Net Monthly Payroll', value: summary?.total_net,       fmt: '₹', color: 'green' },
              ].map(c => (
                <div key={c.label} className="kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-label">{c.label}</span>
                    <div className={`kpi-icon ${c.color}`}><c.icon size={18} /></div>
                  </div>
                  <div className="kpi-value">
                    {c.fmt === '₹' ? `₹${Number(c.value).toLocaleString('en-IN')}` : Number(c.value).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            <div className="chart-grid side-by-side" style={{ marginBottom: 24 }}>
              {/* Department Chart */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">Payroll by Department</div>
                    <div className="card-subtitle">Monthly gross spend per department</div>
                  </div>
                </div>
                <div style={{ height: '360px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summary?.dept_breakdown} layout="vertical" margin={{ top: 0, right: 16, left: 16, bottom: 0 }}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v / 1000}k`} />
                      <YAxis type="category" dataKey="department" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} interval={0} axisLine={false} tickLine={false} width={140} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="total" name="Gross Pay" radius={[0, 4, 4, 0]} barSize={12}>
                        {summary?.dept_breakdown?.map((_, i) => <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Live Calculator */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">Attendance Salary Calculator</div>
                    <div className="card-subtitle">Computes Sunday & Leave penalties for {yearMonth}</div>
                  </div>
                  <Calculator size={18} style={{ color: 'var(--gold)' }} />
                </div>
                <LiveCalculator API={API} yearMonth={yearMonth} />
              </div>
            </div>

            {/* ─── Employee Payroll Table ──────────────────────────── */}
            <div className="card">
              <div className="card-header salary-table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                <div>
                  <div className="card-title">Monthly Payroll Generation ({yearMonth})</div>
                  <div className="card-subtitle">
                    Enter deductions and additions to auto-calculate net pay. 
                  </div>
                </div>
                <div className="salary-table-controls" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} id="csv-upload" />
                  <label htmlFor="csv-upload" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    Upload CSV
                  </label>
                  <div className="salary-search-box" style={{ position: 'relative', flex: '1 1 auto', minWidth: 160 }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="text" 
                      placeholder="Search employee..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ 
                        background: 'var(--bg-surface)', border: '1px solid var(--border)', 
                        color: 'var(--text-primary)', padding: '6px 12px 6px 30px', 
                        borderRadius: 6, fontSize: 13, outline: 'none', width: '100%'
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{employees.length} emp</div>
                  <button onClick={() => setShowModal(true)} style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, whiteSpace: 'nowrap' }}>
                    <Download size={15} /> Download PDF
                  </button>
                </div>
              </div>
              
              <div style={{ overflowX: 'auto', width: '100%' }}>
                <table style={{ width: '100%', minWidth: 1000, borderCollapse: 'collapse', border: '1px solid var(--border)' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12 }}>Name & Dept</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12 }}>CTC Salary</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, width: 80 }}>Paid Leave</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, width: 80 }}>Absent</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, width: 80 }}>Extra Present</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, width: 80 }}>Extra Hr</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, width: 80 }}>Less Hr</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, width: 90 }}>Adv 1</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, width: 90 }}>Adv 2</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, width: 120 }}>Net to Pay</th>
                      {isAdmin && <th style={{ padding: '10px 12px', textAlign: 'center', width: 60 }}>Edit</th>}
                      <th style={{ padding: '10px 12px', width: 40 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.filter(emp => emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || emp.department.toLowerCase().includes(searchQuery.toLowerCase())).map((emp, i) => {
                      const d = calculatePayroll(emp)
                      const input = inputs[emp.id] || {}
                      const tdStyle = { padding: '6px 12px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' }
                      const inputStyle = { width: '100%', padding: '6px', fontSize: 13, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, textAlign: 'center', color: 'var(--text-primary)' }
                      
                      return (
                        <React.Fragment key={emp.id}>
                          <tr onClick={() => { if (editId !== emp.id) setExpandedId(ex => ex === emp.id ? null : emp.id) }} style={{ cursor: 'pointer', background: expandedId === emp.id ? 'var(--bg-hover)' : 'var(--bg-base)', transition: 'background 0.2s' }}>
                            <td style={tdStyle}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: 14 }}>{emp.name}</div>
                                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{emp.department} • {emp.role}</div>
                                </div>
                              </div>
                            </td>
                            <td style={tdStyle}>
                              {editId === emp.id ? (
                                <input type="number" min="0" className="form-input" style={{ width: 90, padding: '5px 8px', fontSize: 14 }}
                                  value={editSalary} onChange={e => setEditSalary(e.target.value)} autoFocus onClick={e => e.stopPropagation()} />
                              ) : (
                                <div style={{ fontWeight: 600, fontSize: 14 }}>₹{emp.salary ? Number(emp.salary).toLocaleString('en-IN') : '0'}</div>
                              )}
                            </td>
                            <td style={tdStyle} onClick={e => e.stopPropagation()}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'var(--bg-card)', padding: '6px', borderRadius: 4, border: '1px solid var(--border)' }}>
                                <input 
                                  type="checkbox" 
                                  checked={input.cancelPaidLeave || false}
                                  onChange={e => handleInputChange(emp.id, 'cancelPaidLeave', e.target.checked)}
                                  style={{ cursor: 'pointer', width: 14, height: 14 }}
                                />
                                <span style={{ fontSize: 11, color: input.cancelPaidLeave ? 'var(--danger)' : 'var(--text-muted)', fontWeight: input.cancelPaidLeave ? 600 : 400 }}>Cancel</span>
                              </div>
                            </td>
                            <td style={tdStyle} onClick={e => e.stopPropagation()}>
                              <input type="number" min="0" max="31" value={input.absent === 0 ? '' : input.absent} onChange={e => handleInputChange(emp.id, 'absent', e.target.value)} style={inputStyle} placeholder="0" />
                            </td>
                            <td style={tdStyle} onClick={e => e.stopPropagation()}>
                              <input type="number" min="0" max={31} style={inputStyle} value={input.extraPresent || ''} onChange={e => handleInputChange(emp.id, 'extraPresent', e.target.value)} />
                            </td>
                            <td style={tdStyle} onClick={e => e.stopPropagation()}>
                              <input type="number" min="0" max={300} style={inputStyle} value={input.extraHour || ''} onChange={e => handleInputChange(emp.id, 'extraHour', e.target.value)} />
                            </td>
                            <td style={tdStyle} onClick={e => e.stopPropagation()}>
                              <input type="number" min="0" max={300} style={inputStyle} value={input.lessHour || ''} onChange={e => handleInputChange(emp.id, 'lessHour', e.target.value)} />
                            </td>
                            <td style={tdStyle} onClick={e => e.stopPropagation()}>
                              <input type="number" min="0" step="100" style={inputStyle} value={input.adv1 || ''} onChange={e => handleInputChange(emp.id, 'adv1', e.target.value)} />
                            </td>
                            <td style={tdStyle} onClick={e => e.stopPropagation()}>
                              <input type="number" min="0" step="100" style={inputStyle} value={input.adv2 || ''} onChange={e => handleInputChange(emp.id, 'adv2', e.target.value)} />
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, fontSize: 15, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                              ₹{d.finalSalary.toFixed(0)}
                            </td>
                            {isAdmin && (
                              <td style={tdStyle} onClick={e => e.stopPropagation()}>
                                {editId === emp.id ? (
                                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                    <button onClick={() => handleSaveSalary(emp)} disabled={saving} style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid var(--success)', color: 'var(--success)', borderRadius: 7, padding: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                      {saving ? <span className="spinner" style={{width: 13, height: 13}}/> : <Check size={13} />}
                                    </button>
                                    <button onClick={() => setEditId(null)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: 7, padding: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                      <X size={13} />
                                    </button>
                                  </div>
                                ) : (
                                  <button onClick={() => { setEditId(emp.id); setEditSalary(emp.salary.toString()); setExpandedId(null) }} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 7, padding: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                                    <Edit2 size={13} />
                                  </button>
                                )}
                              </td>
                            )}
                            <td style={{ ...tdStyle, color: 'var(--text-muted)', textAlign: 'center' }}>
                              {expandedId === emp.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </td>
                          </tr>

                          {/* Expanded breakdown row */}
                          {expandedId === emp.id && (
                            <tr key={`${emp.id}-detail`} style={{ background: 'var(--bg-hover)' }}>
                              <td colSpan={isAdmin ? 12 : 11} style={{ padding: '0 24px 20px', borderBottom: '1px solid var(--border)' }}>
                                <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 8, border: '1px solid var(--border)', maxWidth: 500, marginTop: 12 }}>
                                  <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '12px', fontSize: 13, fontWeight: 700 }}>Detailed Breakdown</div>
                                  
                                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                                    <span>Base Salary</span>
                                    <span style={{ fontWeight: 600 }}>₹{d.baseSalary.toFixed(2)}</span>
                                  </div>
                                  
                                  {d.addedPaidLeave > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: 'var(--success)' }}>
                                    <span>+ Paid Leave</span><span>₹{d.addedPaidLeave.toFixed(2)}</span>
                                  </div>}
                                  {d.addedExtraPresent > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: 'var(--success)' }}>
                                    <span>+ Extra Present ({d.extraPresent}d)</span><span>₹{d.addedExtraPresent.toFixed(2)}</span>
                                  </div>}
                                  {d.addedExtraHour > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: 'var(--success)' }}>
                                    <span>+ Extra Hour ({d.extraHour}h)</span><span>₹{d.addedExtraHour.toFixed(2)}</span>
                                  </div>}
                                  
                                  {d.deductedAbsent > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: 'var(--danger)' }}>
                                    <span>- Absent ({d.absent}d)</span><span>₹{d.deductedAbsent.toFixed(2)}</span>
                                  </div>}
                                  {d.deductedPenalty > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: 'var(--danger)' }}>
                                    <span>- Sunday Deduction ({d.sundayDeductions}d)</span><span>₹{d.deductedPenalty.toFixed(2)}</span>
                                  </div>}
                                  {d.deductedLatePay > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: 'var(--danger)' }}>
                                    <span>{d.lateLabel}</span><span>₹{d.deductedLatePay.toFixed(2)}</span>
                                  </div>}
                                  {d.totalAdvance > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: 'var(--danger)' }}>
                                    <span>- Advance Pay</span><span>₹{d.totalAdvance.toFixed(2)}</span>
                                  </div>}
                                  
                                  <div style={{ borderTop: '1px dashed var(--border)', marginTop: '8px', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800 }}>
                                    <span>Net:</span>
                                    <span style={{ color: 'var(--primary)' }}>₹{d.finalSalary.toFixed(2)}</span>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ─── PDF Download Modal ──────────────────────────────────────────────── */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-base)', padding: '24px', borderRadius: 12, width: 400, maxWidth: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Download Payslips (PDF)</div>
            
            <div style={{ marginBottom: 12, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
                <input type="checkbox" checked={selectedEmps.size === employees.length && employees.length > 0} onChange={toggleSelectAll} style={{ width: 16, height: 16 }} />
                Select All Employees
              </label>
            </div>
            
            <div style={{ maxHeight: 250, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {employees.map(emp => (
                <label key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 0' }}>
                  <input type="checkbox" checked={selectedEmps.has(emp.id)} onChange={() => toggleSelect(emp.id)} style={{ width: 16, height: 16 }} />
                  {emp.name} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({emp.department})</span>
                </label>
              ))}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
                Cancel
              </button>
              <button onClick={executeDownload} disabled={isGenerating} style={{ padding: '8px 16px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, opacity: isGenerating ? 0.7 : 1 }}>
                {isGenerating ? <span className="spinner" style={{width: 14, height: 14, borderTopColor: '#fff', borderLeftColor: '#fff', borderBottomColor: 'rgba(255,255,255,0.3)', borderRightColor: 'rgba(255,255,255,0.3)'}} /> : <Download size={16} />}
                {isGenerating ? 'Generating...' : 'Generate PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
