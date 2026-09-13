import { BookOpen, CircleUserRound, Gauge, LibraryBig, Plus, RefreshCw, Settings, Users } from 'lucide-react'
import ThemeToggle from './ThemeToggle.jsx'

const items = [
  ['dashboard', 'Dashboard', Gauge],
  ['books', 'Books', LibraryBig],
  ['members', 'Members', Users],
  ['circulation', 'Circulation', RefreshCw],
  ['settings', 'Settings', Settings],
]

export default function Navbar({ page, onNavigate, onAddBook, theme, onThemeToggle, onProfile }) {
  const activeIndex = Math.max(0, items.findIndex(([id]) => id === page))
  return (
    <aside className="nav-shell glass" aria-label="Primary navigation">
      <button className="brand ripple" onClick={() => onNavigate('dashboard')} aria-label="Anirory dashboard">
        <span className="brand-mark"><BookOpen aria-hidden="true" /></span>
        <span className="brand-copy"><b>Anirory</b><small>Library OS</small></span>
      </button>
      <nav className="nav-list" style={{ '--active-index': activeIndex }}>
        <span className="liquid-indicator" aria-hidden="true" />
        {items.map(([id, label, Icon]) => (
          <button key={id} type="button" className={`nav-item ripple ${page === id ? 'active' : ''}`} onClick={() => onNavigate(id)} aria-current={page === id ? 'page' : undefined}>
            <Icon aria-hidden="true" /><span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="nav-actions">
        <button className="icon-button accent ripple add-nav" type="button" onClick={onAddBook} aria-label="Add book"><Plus aria-hidden="true" /></button>
        <ThemeToggle theme={theme} onToggle={onThemeToggle} />
        <button className="icon-button ripple" type="button" onClick={onProfile} aria-label="Administrator profile"><CircleUserRound aria-hidden="true" /></button>
      </div>
    </aside>
  )
}
