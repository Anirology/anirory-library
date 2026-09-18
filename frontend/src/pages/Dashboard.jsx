import { useEffect, useState } from 'react'
import { ArrowRight, BookCheck, BookOpen, TriangleAlert, RotateCcw, Search, UserPlus, Users } from 'lucide-react'
import { getErrorMessage, listBooks, getDashboard } from '../services/api.js'

export default function Dashboard({ onNavigate, onAddMember, onReturn, catalogVersion, user }) {
  const canEdit = ['admin', 'librarian'].includes(user.role)
  const [catalog, setCatalog] = useState({ items: [], total: 0 })
  const [error, setError] = useState('')
  const [summary, setSummary] = useState({ activity: [] })
  const circulation = summary.activity.map((item) => item.count)
  const days = summary.activity.map((item) => new Date(item.day + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' }))
  useEffect(() => {
    let active = true
    setError('')
    Promise.all([listBooks({ page: 1, page_size: 5, sort: 'newest' }), getDashboard()]).then(([data, stats]) => { if (active) { setCatalog(data); setSummary(stats) } }).catch((e) => active && setError(getErrorMessage(e)))
    return () => { active = false }
  }, [catalogVersion])
  const stats = [
    ['Catalog titles', catalog.total.toLocaleString(), BookOpen],
    ['Registered members', (summary.members ?? 0).toLocaleString(), Users],
    ['Currently on loan', (summary.active_loans ?? 0).toLocaleString(), BookCheck],
    ['Overdue loans', (summary.overdue ?? 0).toLocaleString(), TriangleAlert],
  ]
  return <div className="page dashboard-page page-enter">
    <header className="page-header"><div><span className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</span><h1>Welcome back, {user.name}</h1><p>{user.role === 'admin' ? 'Admin: manage the library and user accounts.' : user.role === 'librarian' ? 'Librarian: manage books, members, and circulation.' : 'User: browse the catalog and manage your password.'}</p><p>Here’s the library at a glance.</p></div><button className="button primary ripple" onClick={() => onNavigate('books')}><Search aria-hidden="true" />Find a book</button></header>
    {error && <div className="inline-error" role="alert">{error}</div>}
    <section className="stats-grid" aria-label="Library statistics">{stats.map(([label, value, Icon]) => <article className="stat-card glass" key={label}><span className="stat-icon floating"><Icon aria-hidden="true" /></span><div><p>{label}</p><strong>{value}</strong></div></article>)}</section>
    <div className="dashboard-grid">
      <section className="panel glass circulation-chart"><div className="section-heading"><div><span className="eyebrow">Last 7 days</span><h2>Circulation activity</h2></div>{canEdit && <button className="text-button" onClick={() => onNavigate('circulation')}>View circulation <ArrowRight aria-hidden="true" /></button>}</div><div className="chart" aria-label="Seven-day circulation bar chart">{circulation.map((value, i) => <div className="chart-column" key={days[i]}><span className="chart-value">{value}</span><i style={{ '--height': `${value / Math.max(1, ...circulation) * 100}%` }} /><small>{days[i]}</small></div>)}</div></section>
      <section className="panel glass quick-panel"><div className="section-heading"><div><span className="eyebrow">Frequent workflows</span><h2>Quick actions</h2></div></div><button className="quick-action ripple" onClick={() => onNavigate('books')}><Search aria-hidden="true" /><span><b>Find a book</b><small>Search the live catalog</small></span><ArrowRight aria-hidden="true" /></button>{canEdit && <><button className="quick-action ripple" onClick={onAddMember}><UserPlus aria-hidden="true" /><span><b>Register member</b><small>Create a library account</small></span><ArrowRight aria-hidden="true" /></button><button className="quick-action ripple" onClick={onReturn}><RotateCcw aria-hidden="true" /><span><b>Process return</b><small>Check in a borrowed item</small></span><ArrowRight aria-hidden="true" /></button></>}</section>
    </div>
    <section className="panel glass recent-section"><div className="section-heading"><div><span className="eyebrow">Fresh to the catalog</span><h2>Recently added</h2></div><button className="text-button" onClick={() => onNavigate('books')}>See all <ArrowRight aria-hidden="true" /></button></div><div className="recent-list">{catalog.items.map((book) => <button className="recent-item" key={book.id} onClick={() => onNavigate('books', { detailId: book.id })}><span className="mini-cover"><BookOpen aria-hidden="true" /></span><span><b>{book.title}</b><small>{book.author} · {book.category}</small></span><span className={`status ${book.available ? 'available' : 'loaned'}`}>{book.available ? 'Available' : 'On loan'}</span></button>)}{!catalog.items.length && !error && [...Array(3)].map((_, i) => <div className="recent-item skeleton" key={i} />)}</div></section>
  </div>
}

