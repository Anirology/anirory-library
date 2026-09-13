import { useEffect, useMemo, useState } from 'react'
import { CircleUserRound, UserPlus } from 'lucide-react'
import Navbar from './components/Navbar.jsx'
import CursorFollower from './components/CursorFollower.jsx'
import Notification from './components/Notification.jsx'
import ModalShell from './components/ModalShell.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Books from './pages/Books.jsx'
import Members from './pages/Members.jsx'
import Circulation from './pages/Circulation.jsx'
import Settings from './pages/Settings.jsx'

const saved = JSON.parse(localStorage.getItem('anirory-preferences') || 'null') || { reminders: true, summary: false, compact: false }

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [themeChoice, setThemeChoice] = useState(localStorage.getItem('anirory-theme') || 'system')
  const [systemDark, setSystemDark] = useState(window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [preferences, setPreferences] = useState(saved)
  const [notification, setNotification] = useState(null)
  const [addSignal, setAddSignal] = useState(0)
  const [detailSignal, setDetailSignal] = useState(null)
  const [catalogVersion, setCatalogVersion] = useState(0)
  const [returnSignal, setReturnSignal] = useState(0)
  const [profileOpen, setProfileOpen] = useState(false)
  const [memberOpen, setMemberOpen] = useState(false)
  const theme = themeChoice === 'system' ? (systemDark ? 'dark' : 'light') : themeChoice

  const notify = (message, type = 'success') => {
    setNotification({ message, type, id: Date.now() })
  }
  useEffect(() => {
    if (!notification) return undefined
    const timer = setTimeout(() => setNotification(null), 4800)
    return () => clearTimeout(timer)
  }, [notification])
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
  }, [theme])
  useEffect(() => {
    localStorage.setItem('anirory-theme', themeChoice)
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const update = (event) => setSystemDark(event.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [themeChoice])
  useEffect(() => { localStorage.setItem('anirory-preferences', JSON.stringify(preferences)) }, [preferences])
  useEffect(() => {
    const ripple = (event) => {
      const button = event.target.closest('.ripple')
      if (!button) return
      const rect = button.getBoundingClientRect()
      button.style.setProperty('--ripple-x', `${event.clientX - rect.left}px`)
      button.style.setProperty('--ripple-y', `${event.clientY - rect.top}px`)
      button.classList.remove('rippling'); void button.offsetWidth; button.classList.add('rippling')
    }
    document.addEventListener('pointerdown', ripple)
    return () => document.removeEventListener('pointerdown', ripple)
  }, [])

  const navigate = (next, options = {}) => {
    setPage(next)
    if (options.detailId) setDetailSignal({ id: options.detailId, nonce: Date.now() })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const addBook = () => { setPage('books'); setAddSignal((value) => value + 1) }
  const processReturn = () => { setPage('circulation'); setReturnSignal((value) => value + 1) }
  const pages = useMemo(() => ({
    dashboard: <Dashboard onNavigate={navigate} onAddMember={() => setMemberOpen(true)} onReturn={processReturn} catalogVersion={catalogVersion} />,
    books: <Books addSignal={addSignal} detailSignal={detailSignal} compact={preferences.compact} notify={notify} onCatalogChange={() => setCatalogVersion((v) => v + 1)} />,
    members: <Members onAdd={() => setMemberOpen(true)} notify={notify} />,
    circulation: <Circulation notify={notify} returnSignal={returnSignal} />,
    settings: <Settings preferences={preferences} onChange={setPreferences} theme={themeChoice} onTheme={setThemeChoice} notify={notify} />,
  }), [page, addSignal, detailSignal, preferences, catalogVersion, returnSignal, themeChoice])

  const registerMember = (event) => {
    event.preventDefault(); setMemberOpen(false); notify('Member registration captured for this session.')
  }
  return <div className="app-shell">
    <CursorFollower />
    <Navbar page={page} onNavigate={navigate} onAddBook={addBook} theme={theme} onThemeToggle={() => setThemeChoice(theme === 'dark' ? 'light' : 'dark')} onProfile={() => setProfileOpen(true)} />
    <main id="main-content">{pages[page]}</main>
    <Notification notification={notification} onClose={() => setNotification(null)} />
    {profileOpen && <ModalShell title="Administrator profile" onClose={() => setProfileOpen(false)} className="profile-modal"><div className="profile-content"><span className="profile-avatar"><CircleUserRound aria-hidden="true" /></span><h3>Library Administrator</h3><p>Catalog and circulation access</p><dl><div><dt>Role</dt><dd>System administrator</dd></div><div><dt>Session</dt><dd>Active</dd></div></dl></div><div className="modal-actions"><button className="button secondary ripple" onClick={() => setProfileOpen(false)}>Close profile</button></div></ModalShell>}
    {memberOpen && <ModalShell title="Register a member" onClose={() => setMemberOpen(false)}><form className="book-form" onSubmit={registerMember}><label>Full name<input required minLength="2" autoComplete="name" /></label><label>Email address<input required type="email" autoComplete="email" /></label><label>Member type<select defaultValue="Adult"><option>Adult</option><option>Student</option><option>Researcher</option><option>Senior</option></select></label><div className="modal-note">Member persistence is outside the current catalog scope; this workflow demonstrates the complete administrator interaction.</div><div className="modal-actions"><button type="button" className="button secondary ripple" onClick={() => setMemberOpen(false)}>Cancel</button><button className="button primary ripple" type="submit"><UserPlus aria-hidden="true" />Register member</button></div></form></ModalShell>}
  </div>
}
