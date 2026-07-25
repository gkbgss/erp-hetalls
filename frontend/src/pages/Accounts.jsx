import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { DollarSign, FileText, TrendingUp, TrendingDown, X } from 'lucide-react'

export default function Accounts() {
  const { API } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [expenses, setExpenses] = useState([])
  const [billsLinks, setBillsLinks] = useState(null)
  const [companyAlerts, setCompanyAlerts] = useState([])
  const [closedAlerts, setClosedAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/api/accounts/invoices`),
      axios.get(`${API}/api/accounts/expenses`),
      axios.get(`${API}/api/accounts/bills-links`),
      axios.get(`${API}/api/accounts/company-alerts`).catch(() => ({ data: [] }))
    ]).then(([invRes, expRes, billsRes, alertsRes]) => {
      setInvoices(invRes.data)
      setExpenses(expRes.data)
      setBillsLinks(billsRes.data)
      setCompanyAlerts(alertsRes.data || [])
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [API])

  const getInvoiceBadge = (status) => {
    return <span className={`badge badge-${status}`}>{status}</span>
  }

  const totalInvoices = invoices.reduce((acc, inv) => acc + inv.total, 0)
  const totalExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0)
  const netIncome = totalInvoices - totalExpenses

  return (
    <div>
      <div className="chart-grid">
        {/* Company Bills */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header">
            <div>
              <div className="card-title">Company Bills</div>
              <div className="card-subtitle">Auto-synced from Google Sheets</div>
            </div>
            <FileText size={20} className="text-muted" />
          </div>
          <div className="card-body" style={{ padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {loading ? <div className="spinner" /> : (
              <>
                {billsLinks?.HG && (
                  <a href={billsLinks.HG} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ flex: '1 1 calc(25% - 1rem)', textAlign: 'center' }}>
                    HG Bill
                  </a>
                )}
                {billsLinks?.MMC && (
                  <a href={billsLinks.MMC} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ flex: '1 1 calc(25% - 1rem)', textAlign: 'center' }}>
                    MMC Bill
                  </a>
                )}
                {billsLinks?.HO && (
                  <a href={billsLinks.HO} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ flex: '1 1 calc(25% - 1rem)', textAlign: 'center' }}>
                    HO Bill
                  </a>
                )}
                {billsLinks?.MKM && (
                  <a href={billsLinks.MKM} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ flex: '1 1 calc(25% - 1rem)', textAlign: 'center' }}>
                    MKM Bill
                  </a>
                )}
                {(!billsLinks?.HG && !billsLinks?.MMC && !billsLinks?.HO && !billsLinks?.MKM) && (
                  <p className="text-muted">No links found or failed to load.</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Company Alerts Popups */}
      {companyAlerts.length > 0 && (
        <div className="alerts-container">
          {Array.from(new Set(companyAlerts.map(a => a.company))).map(company => {
            if (closedAlerts.includes(company)) return null;
            const alerts = companyAlerts.filter(a => a.company === company);
            return (
              <div key={company} className="hg-alerts-popup">
                <div className="hg-alerts-header">
                  <div>
                    <span className="hg-alerts-title">{company} Bill Alerts</span>
                    <span className="hg-alerts-subtitle">3-Star Entries Action Required</span>
                  </div>
                  <button className="hg-alerts-close" onClick={() => setClosedAlerts(prev => [...prev, company])}><X size={14} /></button>
                </div>
                <div className="hg-alerts-content" style={{ maxHeight: '250px' }}>
                  {alerts.map(alert => (
                    <div key={alert.id} className="hg-alert-item">
                      <div className="hg-alert-top">
                        <span className="hg-alert-party">{alert.party}</span>
                        <span className="hg-alert-amt">₹{alert.bill_amt.toLocaleString()}</span>
                      </div>
                      <div className="hg-alert-bottom">
                        <span className="hg-alert-reg">{alert.bill_reg_no}</span>
                        <span className="hg-alert-date">{alert.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
