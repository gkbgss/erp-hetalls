import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { MessagesProvider } from './context/MessagesContext'
import Sidebar from './components/Sidebar'
import Header  from './components/Header'
import Login   from './pages/Login'
import Dashboard from './pages/Dashboard'
import Ecommerce from './pages/Ecommerce'
import Inventory from './pages/Inventory'
import Accounts  from './pages/Accounts'
import HR        from './pages/HR'
import Reports   from './pages/Reports'
import Settings  from './pages/Settings'
import DetailedBreakdown from './pages/DetailedBreakdown'
import SalaryCalculator from './pages/SalaryCalculator'
import Messages from './pages/Messages'
import Placeholder from './components/Placeholder'
import './index.css'

// ── Protected Layout ──────────────────────────────────────────────────
function AppLayout() {
  const { user, loading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (loading) return (
    <div className="page-loading" style={{ height: '100vh' }}>
      <div className="big-spinner" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="app-layout">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="main-content">
        <Header setSidebarOpen={setSidebarOpen} />
        <div className="page-body">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/ecommerce" element={<Ecommerce />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/accounts"  element={<Accounts />} />
            <Route path="/hr"                    element={<HR />} />
            <Route path="/hr/salary-calculator"   element={<SalaryCalculator />} />
            <Route path="/hr/messages"           element={<Messages />} />
            <Route path="/reports"               element={<Reports />} />
            <Route path="/settings"  element={<Settings />} />
            <Route path="/breakdown" element={<DetailedBreakdown />} />
            <Route path="*"          element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

// ── Root App ──────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <MessagesProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginGuard />} />
            <Route path="/*"     element={<AppLayout />} />
          </Routes>
        </BrowserRouter>
      </MessagesProvider>
    </AuthProvider>
  )
}

function LoginGuard() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/dashboard" replace />
  return <Login />
}
