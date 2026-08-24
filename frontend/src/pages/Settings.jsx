import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { Shield, User, Building2, Plus, Trash2, Edit2, Check, X, GitCommit, RefreshCw } from 'lucide-react'

const ROLES = ['admin', 'accountant', 'ecommerce', 'warehouse', 'hr', 'analyst', 'viewer']
const DEPARTMENTS = ['IT', 'Accounts', 'E-Commerce', 'HR', 'Inventory', 'Marketing', 'General']
const AVAILABLE_PERMISSIONS = ['dashboard', 'ecommerce', 'inventory', 'accounts', 'hr', 'reports']
const ROLE_COLORS = {
  admin:      'var(--danger)',
  accountant: 'var(--info)',
  ecommerce:  'var(--gold)',
  warehouse:  'var(--success)',
  hr:         '#ec4899',
  analyst:    '#8b5cf6',
  viewer:     'var(--text-muted)',
}

export default function Settings() {
  const { API, user: me } = useAuth()
  const [users, setUsers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  
  const handleSync = async () => {
    try {
      const res = await axios.get(`${API}/api/hr/trigger-sync`);
      alert(res.data.message || "Database synchronization complete!");
      fetchUsers();
    } catch (e) {
      alert("Failed to sync database.");
      console.error(e);
    }
  };
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'viewer', department: 'General' })
  const [msg, setMsg] = useState(null)

  const fetchUsers = () => {
    setLoading(true)
    axios.get(`${API}/api/users/`)
      .then(r => setUsers(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }
  
  // Easter Egg State
  const [clicks, setClicks] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [commits, setCommits] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const handleSecretClick = (value) => {
    const newClicks = [...clicks, value].slice(-6)
    setClicks(newClicks)
    
    const target = ['Hetalls Inc.', 'Hetalls Inc.', 'Hetalls Inc.', 'Hetalls Inc.', 'USD ($)', 'Python FastAPI']
    if (JSON.stringify(newClicks) === JSON.stringify(target)) {
      setClicks([])
      setTimeout(() => {
        const pwd = window.prompt("Enter access password:")
        if (pwd === '@#$@#$') {
          setShowHistory(true)
          if (commits.length === 0) {
            setLoadingHistory(true)
            axios.get(`${API}/api/audit`)
              .then(res => setCommits(res.data))
              .catch(console.error)
              .finally(() => setLoadingHistory(false))
          }
        } else if (pwd !== null) {
          alert("Access Denied.")
        }
      }, 50)
    }
  }
  useEffect(() => { fetchUsers() }, [API])

  const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 4000) }

  const handleAddUser = async (e) => {
    e.preventDefault()
    try {
      await axios.post(`${API}/api/auth/register`, newUser)
      showMsg('success', `User "${newUser.name}" created successfully.`)
      setNewUser({ name: '', email: '', password: '', role: 'viewer', department: 'General' })
      setShowAdd(false)
      fetchUsers()
    } catch (err) {
      showMsg('error', err.response?.data?.detail || 'Failed to create user.')
    }
  }

  const handleEdit = (u) => { setEditId(u.id); setEditForm({ name: u.name, email: u.email, role: u.role, department: u.department, permissions: u.permissions || [] }) }

  const handleSaveEdit = async (id) => {
    try {
      await axios.put(`${API}/api/users/${id}`, editForm)
      showMsg('success', 'User updated.')
      setEditId(null)
      fetchUsers()
    } catch (err) {
      showMsg('error', 'Failed to update user.')
    }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove ${name} from the system?`)) return
    try {
      await axios.delete(`${API}/api/users/${id}`)
      showMsg('success', `${name} removed.`)
      fetchUsers()
    } catch (err) {
      showMsg('error', 'Failed to delete user.')
    }
  }

  const isAdmin = me?.role === 'admin'
  const filteredUsers = users.filter(u => 
    (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (u.role || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.department || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div>
      {/* Company Info Card */}
      <div className="card mb-6">
        <div className="card-header">
          <div>
            <div className="card-title">Company Profile</div>
            <div className="card-subtitle">System-wide configuration</div>
          </div>
          <Building2 size={20} style={{ color: 'var(--text-muted)' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {[
            { label: 'Company Name',   value: 'Hetalls Inc.' },
            { label: 'Currency',       value: 'USD ($)' },
            { label: 'Platforms',      value: 'Amazon FBA, Etsy' },
            { label: 'ERP Version',    value: '1.0.0 — Phase 4' },
            { label: 'Database',       value: 'SQLite (Dev)' },
            { label: 'Backend',        value: 'Python FastAPI' },
          ].map(item => (
            <div 
              key={item.label} 
              onClick={() => handleSecretClick(item.value)}
              style={{ background: 'var(--bg-surface)', borderRadius: 8, padding: '12px 16px', cursor: 'pointer', userSelect: 'none' }}
            >
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* History / Changes Popup */}
      {showHistory && (
        <div className="breakdown-overlay" onClick={() => setShowHistory(false)}>
          <div className="breakdown-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700, padding: 24 }}>
            <div className="breakdown-modal-header" style={{ marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <GitCommit size={20} color="var(--gold)" /> ERP System Changelog
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Recent codebase edits and updates</p>
              </div>
              <button onClick={() => setShowHistory(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 10 }}>
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading history...</div>
              ) : commits.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No audit logs found.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {commits.map((c, i) => (
                    <div key={i} style={{ background: 'var(--bg-surface)', padding: 16, borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>
                          {c.action} on <span style={{color: 'var(--primary)'}}>{c.table}</span> (ID: {c.record_id})
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(c.timestamp).toLocaleString()}</span>
                      </div>
                      
                      <div style={{ fontSize: 13, background: 'var(--bg-base)', padding: 10, borderRadius: 6, fontFamily: 'monospace', border: '1px solid var(--border)' }}>
                        {Object.entries(c.changes || {}).map(([field, vals]) => (
                          <div key={field} style={{ marginBottom: 4 }}>
                            <strong style={{ color: 'var(--gold)' }}>{field}:</strong> 
                            {vals.old !== undefined ? (
                              <>
                                <span style={{ color: 'var(--danger)', textDecoration: 'line-through', margin: '0 6px' }}>{String(vals.old)}</span>
                                <span style={{ color: 'var(--text-muted)' }}>→</span>
                                <span style={{ color: 'var(--success)', margin: '0 6px' }}>{String(vals.new)}</span>
                              </>
                            ) : (
                              <span style={{ color: 'var(--success)', margin: '0 6px' }}>{JSON.stringify(vals)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <User size={12} /> {c.user}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Flash Message */}
      {msg && (
        <div style={{
          background: msg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${msg.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
          color: msg.type === 'success' ? 'var(--success)' : 'var(--danger)',
          borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, marginBottom: 16
        }}>
          {msg.text}
        </div>
      )}

      {/* User Management Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">User Management</div>
            <div className="card-subtitle">{users.length} registered users — manage roles and departments</div>
          </div>
          {isAdmin && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search users..."
                className="form-input"
                style={{ width: '200px', padding: '8px 12px', fontSize: '13px' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                onClick={handleSync}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                <RefreshCw size={16} /> Sync Directory
              </button>
              <button
                onClick={() => setShowAdd(!showAdd)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--gold-glow)', border: '1px solid var(--border-accent)', color: 'var(--gold)', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                <Plus size={16} /> Add User
              </button>
            </div>
          )}
        </div>

        {/* Add User Form */}
        {showAdd && isAdmin && (
          <form onSubmit={handleAddUser} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            <div>
              <label className="form-label">Full Name</label>
              <input className="form-input" placeholder="Jane Smith" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} required />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="jane@hetalls.com" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required />
            </div>
            <div>
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="••••••••" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required />
            </div>
            <div>
              <label className="form-label">Role</label>
              <select className="form-input" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Department</label>
              <select className="form-input" value={newUser.department} onChange={e => setNewUser({...newUser, department: e.target.value})}>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '10px 20px' }}>Create</button>
              <button type="button" onClick={() => setShowAdd(false)} style={{ padding: '10px 16px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        )}

        {/* Users Table */}
        <div className="table-wrapper">
          {loading ? <div className="page-loading" style={{ height: 100 }}><div className="spinner" /></div> : (
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Permissions</th>
                  <th>Department</th>
                  <th>Status</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id}>
                    <td onDoubleClick={() => isAdmin && handleEdit(u)} style={{ cursor: isAdmin && editId !== u.id ? 'pointer' : 'default' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="user-avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                          {u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        {editId === u.id ? (
                          <input className="form-input" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} style={{width: 140, padding: '4px 8px'}} onClick={e => e.stopPropagation()} />
                        ) : (
                          <span style={{ fontWeight: 600 }} title="Double click to edit">{u.name}</span>
                        )}
                        {u.id === me?.id && <span style={{ fontSize: 10, color: 'var(--gold)', background: 'var(--gold-glow)', padding: '1px 6px', borderRadius: 10 }}>YOU</span>}
                      </div>
                    </td>
                    <td style={{ fontSize: 13, cursor: isAdmin && editId !== u.id ? 'pointer' : 'default' }} onDoubleClick={() => isAdmin && handleEdit(u)}>
                      {editId === u.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <input className="form-input" value={editForm.email || ''} onChange={e => setEditForm({...editForm, email: e.target.value})} style={{width: 160, padding: '4px 8px'}} onClick={e => e.stopPropagation()} />
                          <input className="form-input" type="password" placeholder="New Password..." value={editForm.password || ''} onChange={e => setEditForm({...editForm, password: e.target.value})} style={{width: 160, padding: '4px 8px'}} title="Leave blank to keep current password" onClick={e => e.stopPropagation()} />
                        </div>
                      ) : (
                        <span title="Double click to edit">{u.email}</span>
                      )}
                    </td>
                    <td>
                      {editId === u.id ? (
                        <select className="form-input" style={{ padding: '4px 8px', fontSize: 12 }}
                          value={editForm.role}
                          onChange={e => setEditForm({...editForm, role: e.target.value})}>
                          {ROLES.map(r => <option key={r}>{r}</option>)}
                        </select>
                      ) : (
                        <span className="badge" style={{ background: `${ROLE_COLORS[u.role] || '#888'}22`, color: ROLE_COLORS[u.role] || '#888' }}>
                          <Shield size={10} /> {u.role}
                        </span>
                      )}
                    </td>
                    <td>
                      {editId === u.id ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {AVAILABLE_PERMISSIONS.map(p => (
                            <label key={p} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                              <input 
                                type="checkbox" 
                                checked={editForm.permissions?.includes(p)} 
                                onChange={(e) => {
                                  const nextPerms = e.target.checked 
                                    ? [...(editForm.permissions || []), p] 
                                    : (editForm.permissions || []).filter(x => x !== p)
                                  setEditForm({ ...editForm, permissions: nextPerms })
                                }} 
                                style={{ width: 12, height: 12 }} 
                              />
                              {p}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {u.permissions?.map(p => (
                            <span key={p} className="badge" style={{ fontSize: 9, padding: '2px 4px', background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                              {p}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      {editId === u.id ? (
                        <select className="form-input" style={{ padding: '4px 8px', fontSize: 12 }}
                          value={editForm.department}
                          onChange={e => setEditForm({...editForm, department: e.target.value})}>
                          {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                        </select>
                      ) : (
                        <span style={{ fontSize: 13 }}>{u.department}</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge-paid' : 'badge-returned'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {editId === u.id ? (
                            <>
                              <button onClick={() => handleSaveEdit(u.id)} style={{ background: 'none', color: 'var(--success)', padding: 4 }}><Check size={16} /></button>
                              <button onClick={() => setEditId(null)} style={{ background: 'none', color: 'var(--danger)', padding: 4 }}><X size={16} /></button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => handleEdit(u)} style={{ background: 'none', color: 'var(--gold)', padding: 4 }}><Edit2 size={15} /></button>
                              {u.id !== me?.id && (
                                <button onClick={() => handleDelete(u.id, u.name)} style={{ background: 'none', color: 'var(--danger)', padding: 4 }}><Trash2 size={15} /></button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
