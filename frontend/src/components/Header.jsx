import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const PAGE_TITLES = {
  '/dashboard': { title: 'Dashboard',   sub: 'Welcome back — here\'s your business overview' },
  '/ecommerce': { title: 'E-Commerce',  sub: 'Amazon FBA & Etsy orders management' },
  '/inventory': { title: 'Inventory',   sub: 'Product catalog & stock management' },
  '/accounts':  { title: 'Accounts',    sub: 'Invoices, expenses & financial overview' },
  '/hr':        { title: 'HR',          sub: 'Employee management & payroll' },
  '/reports':   { title: 'Reports',     sub: 'Analytics & business intelligence' },
  '/settings':  { title: 'Settings',    sub: 'System configuration & user management' },
}

export default function Header() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const page = PAGE_TITLES[pathname] || { title: 'ERP', sub: '' }
  const now  = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <header className="header">
      <div className="header-left">
        <h2>{page.title}</h2>
        <p>{page.sub}</p>
      </div>
      <div className="header-right">
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{now}</span>
        <span 
          className="header-badge" 
          style={{ cursor: 'pointer' }}
          onClick={(e) => {
            const count = (parseInt(e.target.dataset.clicks || '0') + 1);
            e.target.dataset.clicks = count;
            if (count === 7) {
              window.dispatchEvent(new Event('trigger-party-mode'));
              e.target.dataset.clicks = 0;
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
