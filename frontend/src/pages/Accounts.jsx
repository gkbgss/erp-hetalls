import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { DollarSign, FileText, TrendingUp, TrendingDown } from 'lucide-react'

export default function Accounts() {
  const { API } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [expenses, setExpenses] = useState([])
  const [billsLinks, setBillsLinks] = useState(null)
  const [hgAlerts, setHgAlerts] = useState([])
  const [showHgAlerts, setShowHgAlerts] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/api/accounts/invoices`),
      axios.get(`${API}/api/accounts/expenses`),
      axios.get(`${API}/api/accounts/bills-links`),
      axios.get(`${API}/api/accounts/hg-alerts`).catch(() => ({ data: [] }))
    ]).then(([invRes, expRes, billsRes, hgRes]) => {
      setInvoices(invRes.data)
      setExpenses(expRes.data)
      setBillsLinks(billsRes.data)
      setHgAlerts(hgRes.data || [])
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
      </div>

      {/* HG Alerts Popup */}
      {hgAlerts.length > 0 && showHgAlerts && (
        <div className="hg-alerts-popup">
          <div className="hg-alerts-header">
            <div>
              <span className="hg-alerts-title">HG Bill Alerts</span>
              <span className="hg-alerts-subtitle">3-Star Entries Action Required</span>
            </div>
            <button className="hg-alerts-close" onClick={() => setShowHgAlerts(false)}>×</button>
          </div>
          <div className="hg-alerts-content">
            {hgAlerts.map(alert => (
              <div key={alert.id} className="hg-alert-item">
                <div className="hg-alert-top">
                  <span className="hg-alert-party">{alert.party}</span>
                  <span className="hg-alert-amt">${alert.bill_amt.toLocaleString()}</span>
                </div>
                <div className="hg-alert-bottom">
                  <span className="hg-alert-reg">{alert.bill_reg_no}</span>
                  <span className="hg-alert-date">{alert.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
