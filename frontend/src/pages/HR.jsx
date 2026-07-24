import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Users, Calculator } from 'lucide-react'

export default function HR() {
  const { API } = useAuth()
  const navigate = useNavigate()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const fileInputRef = useRef(null)

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
        <div className="card-header">
          <div>
            <div className="card-title">Employee Directory</div>
            <div className="card-subtitle">{employees.length} active team members</div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
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
                {employees.map(emp => (
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
                    <td className="font-bold">${emp.salary.toLocaleString()}</td>
                    <td>{emp.join_date ? new Date(emp.join_date).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px' }}>No employees found.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
