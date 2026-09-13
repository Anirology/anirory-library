import { useState } from 'react'
import { CheckCircle2, Clock3, RotateCcw, TriangleAlert } from 'lucide-react'

const START_LOANS = [
  { id: 'LN-5801', book: 'The Glass Harbor', member: 'Nadeesha Perera', due: '14 Sep 2026', status: 'Due soon' },
  { id: 'LN-5792', book: 'Networks of Trust', member: 'Imani Fernando', due: '10 Sep 2026', status: 'Overdue' },
  { id: 'LN-5788', book: 'Gardens After Rain', member: 'Kavindu Silva', due: '18 Sep 2026', status: 'Active' },
]

export default function Circulation({ notify, returnSignal }) {
  const [loans, setLoans] = useState(START_LOANS)
  const process = (loan) => { setLoans((current) => current.filter((item) => item.id !== loan.id)); notify(`Return processed for “${loan.book}”.`) }
  return <div className="page page-enter"><header className="page-header"><div><span className="eyebrow">Loans & returns</span><h1>Circulation</h1><p>Keep today’s lending activity moving.</p></div><button className="button primary ripple" onClick={() => document.getElementById('active-loans')?.scrollIntoView({ behavior: 'smooth' })}><RotateCcw aria-hidden="true" />Process return</button></header>
    <section className="stats-grid three"><article className="stat-card glass"><span className="stat-icon"><Clock3 /></span><div><p>Due this week</p><strong>38</strong></div></article><article className="stat-card glass"><span className="stat-icon warning"><TriangleAlert /></span><div><p>Overdue items</p><strong>12</strong></div></article><article className="stat-card glass"><span className="stat-icon"><CheckCircle2 /></span><div><p>Returns today</p><strong>{27 + START_LOANS.length - loans.length}</strong></div></article></section>
    <section className={`table-panel glass ${returnSignal ? 'attention' : ''}`} id="active-loans"><div className="section-heading"><div><span className="eyebrow">Live queue</span><h2>Active loans</h2></div></div><div className="responsive-table"><table><thead><tr><th>Loan</th><th>Book</th><th>Member</th><th>Due date</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{loans.map((loan) => <tr key={loan.id}><td>{loan.id}</td><td><b>{loan.book}</b></td><td>{loan.member}</td><td>{loan.due}</td><td><span className={`status ${loan.status === 'Overdue' ? 'warning' : loan.status === 'Active' ? 'available' : 'loaned'}`}>{loan.status}</span></td><td><button className="button secondary small ripple" onClick={() => process(loan)}><RotateCcw aria-hidden="true" />Process return</button></td></tr>)}</tbody></table>{!loans.length && <div className="empty-table"><CheckCircle2 />All displayed returns have been processed.</div>}</div></section>
  </div>
}

