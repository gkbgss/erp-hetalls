import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useMessages } from '../context/MessagesContext'
import {
  LayoutDashboard, ShoppingCart, Package, DollarSign,
  Users, BarChart2, Settings, LogOut, Layers, MessageSquare
} from 'lucide-react'

const NAV = [
  { label: 'Main', items: [
    { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard',   permission: 'dashboard' },
  ]},
  { label: 'Finance & People', items: [
    { to: '/accounts',   icon: DollarSign,      label: 'Accounts',    permission: 'accounts' },
    { to: '/hr',         icon: Users,           label: 'HR',          permission: 'hr' },
    { to: '/hr/messages', icon: MessageSquare,   label: 'Messages',    permission: 'hr' },
  ]},
  { label: 'Intelligence', items: [
    { to: '/reports',    icon: BarChart2,       label: 'Reports',     permission: 'reports' },
  ]},
  { label: 'System', items: [
    { to: '/settings',   icon: Settings,        label: 'Settings',    role: 'admin' },
  ]},
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const { unreadCount } = useMessages()
  const navigate = useNavigate()

  const canSee = (item) => {
    const uRole = (user?.role || '').toLowerCase()
    const uPerms = (user?.permissions || []).map(p => p.toLowerCase())
    if (uRole === 'admin') return true
    if (item.role && uRole === item.role.toLowerCase()) return true
    if (item.permission && uPerms.includes(item.permission.toLowerCase())) return true
    return false
  }

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">
          <div className="logo-icon">R</div>
          <div className="logo-text">
            <h1>Hetalls ERP</h1>
            <span>Management System</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(section => {
          const visible = section.items.filter(i => canSee(i))
          if (!visible.length) return null
          return (
            <div key={section.label}>
              <div className="nav-section-label">{section.label}</div>
              {visible.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                >
                  <item.icon size={17} />
                  {item.label}
                  {item.label === 'Messages' && unreadCount > 0 && (
                    <span style={{
                      marginLeft: 'auto',
                      backgroundColor: 'var(--danger)',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      borderRadius: '10px',
                      padding: '2px 6px',
                      minWidth: '18px',
                      textAlign: 'center'
                    }}>
                      {unreadCount}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          )
        })}
      </nav>

      <div className="sidebar-user">
        <div className="user-avatar">{initials}</div>
        <div className="user-info">
          <div className="name">{user?.name}</div>
          <div className="role">{user?.role}</div>
        </div>
        <button
          className="logout-btn"
          title="Logout"
          onClick={() => { logout(); navigate('/login') }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  )
}
