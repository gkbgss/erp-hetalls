import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Users, Calculator, Search } from 'lucide-react'

export default function HR() {
  const { API } = useAuth()
  const navigate = useNavigate()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const fileInputRef = useRef(null)

  const filteredEmployees = employees.filter(emp => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (emp.name && emp.name.toLowerCase().includes(q)) ||
      (emp.email && emp.email.toLowerCase().includes(q)) ||
      (emp.department && emp.department.toLowerCase().includes(q)) ||
      (emp.role && emp.role.toLowerCase().includes(q))
    );
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      setLoading(true)
      await axios.post(`${API}/api/hr/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      // Refresh list
      const res = await axios.get(`${API}/api/hr/employees`)
      setEmployees(res.data)
      alert("Employees uploaded successfully! Old data removed.")
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.detail || "Failed to upload employees. Make sure it's a valid CSV.")
    } finally {
      setLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  useEffect(() => {
    axios.get(`${API}/api/hr/employees`)
      .then(res => setEmployees(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [API])

  const deptColors = {
    'Accounts': 'var(--info)',
    'E-Commerce': 'var(--gold)',
    'IT': '#8b5cf6',
    'HR': '#ec4899',
    'Inventory': 'var(--success)',
    'Marketing': '#f97316'
  }

  return (
    <div>
      <div className="card">
        <div className="card-header hr-directory-header">
          <div>
            <div className="card-title">Employee Directory</div>
            <div className="card-subtitle">{employees.length} active team members</div>
          </div>
          <div className="hr-directory-actions" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input 
              type="file" 
              accept=".csv" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileUpload} 
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', padding: '9px 18px', borderRadius: 9,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Upload CSV
            </button>
            <button
              onClick={() => navigate('/hr/salary-calculator')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'linear-gradient(135deg, var(--gold), var(--gold-dark))',
                color: '#000', padding: '9px 18px', borderRadius: 9,
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(245,158,11,0.3)',
                transition: 'all 0.2s',
              }}
            >
              <Calculator size={16} /> Salary Calculator
            </button>
          </div>
        </div>

        <div className="hr-search-row" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div className="hr-search-box" style={{ position: 'relative', flex: '1 1 auto', minWidth: 280, maxWidth: '100%', height: 'auto' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search employees by name, email, department or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '10px 36px 10px 38px',
                color: '#fff',
                fontSize: 13,
                outline: 'none',
                transition: 'all 0.2s',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer', padding: 0
                }}
              >
                ×
              </button>
            )}
          </div>
          {searchQuery && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Showing {filteredEmployees.length} of {employees.length} employees
            </span>
          )}
        </div>
        
        <div className="table-wrapper">
          {loading ? (
             <div className="page-loading" style={{ height: 100 }}><div className="spinner" /></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Role</th>
                  <th>Monthly Salary</th>
                  <th>Join Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map(emp => (
                  <tr key={emp.id}>
                    <td className="font-bold">
                      <div className="flex items-center gap-3">
                        <div className="user-avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                          {emp.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        {emp.name}
                      </div>
                    </td>
                    <td>{emp.email}</td>
                    <td>
                      <span className="badge" style={{ 
                        background: `${deptColors[emp.department] || 'var(--text-muted)'}22`, 
                        color: deptColors[emp.department] || 'var(--text-primary)' 
                      }}>
                        {emp.department}
                      </span>
                    </td>
                    <td>{emp.role}</td>
                    <td className="font-bold">₹{emp.salary.toLocaleString('en-IN')}</td>
                    <td>{emp.join_date ? new Date(emp.join_date).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
                {filteredEmployees.length === 0 && (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No employees found matching "{searchQuery}".</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
