import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Menu } from 'lucide-react'

const PAGE_TITLES = {
  '/dashboard': { title: 'Dashboard',   sub: 'Welcome back — here\'s your business overview' },
  '/ecommerce': { title: 'E-Commerce',  sub: 'Amazon FBA & Etsy orders management' },
  '/inventory': { title: 'Inventory',   sub: 'Product catalog & stock management' },
  '/accounts':  { title: 'Accounts',    sub: 'Invoices, expenses & financial overview' },
  '/hr':        { title: 'HR',          sub: 'Employee management & payroll' },
  '/hr/messages': { title: 'Messages',  sub: 'Internal team communication' },
  '/reports':   { title: 'Reports',     sub: 'Analytics & business intelligence' },
  '/settings':  { title: 'Settings',    sub: 'System configuration & user management' },
}

export default function Header({ setSidebarOpen }) {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const page = PAGE_TITLES[pathname] || { title: 'ERP', sub: '' }
  const now  = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button 
          className="mobile-menu-btn"
          onClick={() => setSidebarOpen && setSidebarOpen(true)}
          title="Open Menu"
        >
          <Menu size={22} />
        </button>
        <div className="header-left">
          <h2>{page.title}</h2>
          <p>{page.sub}</p>
        </div>
      </div>
      <div className="header-right">
        <span className="header-date" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{now}</span>
        <span 
          className="header-badge" 
          style={{ cursor: 'pointer' }}
          onClick={(e) => {
            const target = e.currentTarget;
            if (target.dataset.partyActive === 'true') {
              window.dispatchEvent(new Event('trigger-party-mode'));
              target.dataset.partyActive = 'false';
              target.dataset.clicks = 0;
            } else {
              const count = (parseInt(target.dataset.clicks || '0') + 1);
              target.dataset.clicks = count;
              if (count === 7) {
                window.dispatchEvent(new Event('trigger-party-mode'));
                target.dataset.partyActive = 'true';
                target.dataset.clicks = 0;
              }
            }
          }}
          title="Click 7 times!"
        >
          {user?.department}
        </span>
      </div>
    </header>
  )
}
