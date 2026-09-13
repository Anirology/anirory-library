import { useEffect, useState } from 'react'
import { ArrowRight, BookCheck, BookOpen, CircleDollarSign, RotateCcw, Search, UserPlus, Users } from 'lucide-react'
import { getErrorMessage, listBooks } from '../services/api.js'

const circulation = [42, 57, 49, 71, 65, 84, 61]
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function Dashboard({ onNavigate, onAddMember, onReturn, catalogVersion }) {
  const [catalog, setCatalog] = useState({ items: [], total: 0 })
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    listBooks({ page: 1, page_size: 5, sort: 'newest' }).then((data) => active && setCatalog(data)).catch((e) => active && setError(getErrorMessage(e)))
    return () => { active = false }
  }, [catalogVersion])
  const stats = [
    ['Catalog titles', catalog.total.toLocaleString(), BookOpen, 78],
    ['Registered members', '1,284', Users, 64],
    ['Currently on loan', '217', BookCheck, 52],
    ['Fees collected', 'LKR 86.4K', CircleDollarSign, 71],
  ]
  return <div className="page dashboard-page page-enter">
    <header className="page-header"><div><span className="eyebrow">Saturday, 12 September</span><h1>Good morning, Administrator</h1><p>Here’s the library at a glance.</p></div><button className="button primary ripple" onClick={() => onNavigate('books')}><Search aria-hidden="true" />Find a book</button></header>
    {error && <div className="inline-error" role="alert">{error}</div>}
    <section className="stats-grid" aria-label="Library statistics">{stats.map(([label, value, Icon, progress]) => <article className="stat-card glass" key={label}><span className="stat-icon floating"><Icon aria-hidden="true" /></span><div><p>{label}</p><strong>{value}</strong></div><div className="stat-bar"><i style={{ '--bar-width': `${progress}%` }} /></div></article>)}</section>
    <div className="dashboard-grid">
      <section className="panel glass circulation-chart"><div className="section-heading"><div><span className="eyebrow">Last 7 days</span><h2>Circulation activity</h2></div><button className="text-button" onClick={() => onNavigate('circulation')}>View circulation <ArrowRight aria-hidden="true" /></button></div><div className="chart" aria-label="Seven-day circulation bar chart">{circulation.map((value, i) => <div className="chart-column" key={days[i]}><span className="chart-value">{value}</span><i style={{ '--height': `${value}%` }} /><small>{days[i]}</small></div>)}</div></section>
      <section className="panel glass quick-panel"><div className="section-heading"><div><span className="eyebrow">Frequent workflows</span><h2>Quick actions</h2></div></div><button className="quick-action ripple" onClick={() => onNavigate('books')}><Search aria-hidden="true" /><span><b>Find a book</b><small>Search the live catalog</small></span><ArrowRight aria-hidden="true" /></button><button className="quick-action ripple" onClick={onAddMember}><UserPlus aria-hidden="true" /><span><b>Register member</b><small>Create a library account</small></span><ArrowRight aria-hidden="true" /></button><button className="quick-action ripple" onClick={onReturn}><RotateCcw aria-hidden="true" /><span><b>Process return</b><small>Check in a borrowed item</small></span><ArrowRight aria-hidden="true" /></button></section>
    </div>
    <section className="panel glass recent-section"><div className="section-heading"><div><span className="eyebrow">Fresh to the catalog</span><h2>Recently added</h2></div><button className="text-button" onClick={() => onNavigate('books')}>See all <ArrowRight aria-hidden="true" /></button></div><div className="recent-list">{catalog.items.map((book) => <button className="recent-item" key={book.id} onClick={() => onNavigate('books', { detailId: book.id })}><span className="mini-cover"><BookOpen aria-hidden="true" /></span><span><b>{book.title}</b><small>{book.author} · {book.category}</small></span><span className={`status ${book.available ? 'available' : 'loaned'}`}>{book.available ? 'Available' : 'On loan'}</span></button>)}{!catalog.items.length && !error && [...Array(3)].map((_, i) => <div className="recent-item skeleton" key={i} />)}</div></section>
  </div>
}

