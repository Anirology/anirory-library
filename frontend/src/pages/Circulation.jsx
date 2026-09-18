import { useEffect, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { getDashboard, listLoans, issueLoan, returnLoan, getErrorMessage } from '../services/api.js'
import ModalShell from '../components/ModalShell.jsx'

export default function Circulation({ notify, returnSignal, canEdit = true }) {
  const [loans, setLoans] = useState([])
  const [stats, setStats] = useState({})
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState(false)
  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    Promise.all([listLoans({ page, active: !history }), getDashboard()]).then(([items, summary]) => { if (active) { setLoans(items); setStats(summary) } }).catch((e) => { if (active) setError(getErrorMessage(e)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [version, page, history])
  const process = async (loan) => {
    setBusy(true)
    try { await returnLoan(loan.id); setVersion((v) => v + 1); notify(`Return processed for "${loan.book}".`) }
    catch (e) { notify(getErrorMessage(e), 'error') }
    finally { setBusy(false) }
  }
  const issue = async (event) => {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget))
    setBusy(true)
    try { await issueLoan({ ...values, book_id: Number(values.book_id), member_id: Number(values.member_id) }); setOpen(false); setVersion((v) => v + 1); notify('Loan created.') }
    catch (e) { notify(getErrorMessage(e), 'error') }
    finally { setBusy(false) }
  }
  return <div className="page page-enter"><header className="page-header"><div><span className="eyebrow">Loans & returns</span><h1>Circulation</h1><p>Manage lending activity.</p></div>{canEdit && <button className="button primary" onClick={() => setOpen(true)}>Issue a loan</button>}</header>
    {error && <p role="alert" className="inline-error">{error}</p>}
    <section className="stats-grid three">{[['Due this week', stats.due_this_week], ['Overdue items', stats.overdue], ['Returns today', stats.returns_today]].map(([label, value]) => <article className="stat-card glass" key={label}><div><p>{label}</p><strong>{value ?? '—'}</strong></div></article>)}</section>
    <section className={`table-panel glass ${returnSignal ? 'attention' : ''}`}><h2>{history ? 'Loan history' : 'Active loans'}</h2><label><input type="checkbox" checked={history} onChange={(e) => { setHistory(e.target.checked); setPage(1) }} />Include returned loans</label><div className="responsive-table"><table><thead><tr><th>Loan</th><th>Book</th><th>Member</th><th>Due date</th><th>Status</th><th>Actions</th></tr></thead><tbody>{loans.map((loan) => <tr key={loan.id}><td>LN-{loan.id}</td><td>{loan.book}</td><td>{loan.member}</td><td>{loan.due_date}</td><td>{loan.status}</td><td><button className="button secondary small" disabled={busy || !canEdit || Boolean(loan.returned_at)} onClick={() => process(loan)}><RotateCcw />Process return</button></td></tr>)}</tbody></table>{loading ? <p role="status">Loading loans...</p> : !loans.length && <p>No loans to display.</p>}</div><div className="modal-actions"><button className="button secondary" disabled={page === 1 || loading} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page}</span><button className="button secondary" disabled={loans.length < 100 || loading} onClick={() => setPage(page + 1)}>Next</button></div></section>
    {open && <ModalShell title="Issue a loan" onClose={() => setOpen(false)}><form className="book-form" onSubmit={issue}><label>Book ID<input name="book_id" type="number" min="1" required /></label><label>Member ID<input name="member_id" type="number" min="1" required /></label><label>Due date<input name="due_date" type="date" required /></label><button className="button primary" disabled={busy}>Issue loan</button></form></ModalShell>}
  </div>
}
