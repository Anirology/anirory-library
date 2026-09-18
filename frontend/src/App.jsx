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
import SignIn from './pages/SignIn.jsx'
import { getCurrentUser, logout, createMember, getErrorMessage } from './services/api.js'

const readPreferences = () => {
  try { return { compact: false, ...JSON.parse(localStorage.getItem('anirory-preferences') || '{}') } }
  catch { return { compact: false } }
}

export default function App() {
  const [user, setUser] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [memberBusy, setMemberBusy] = useState(false)
  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => setUser(null)).finally(() => setCheckingSession(false))
    const signedOut = () => { setUser(null); setProfileOpen(false); setMemberOpen(false); setPage('dashboard'); setAddSignal(0); setDetailSignal(null) }
    window.addEventListener('anirory-signed-out', signedOut)
    return () => window.removeEventListener('anirory-signed-out', signedOut)
  }, [])
  const [page, setPage] = useState('dashboard')
  const [themeChoice, setThemeChoice] = useState(localStorage.getItem('anirory-theme') || 'system')
  const [systemDark, setSystemDark] = useState(window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [preferences, setPreferences] = useState(readPreferences)
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
    if (['members', 'circulation'].includes(next) && !['admin', 'librarian'].includes(user?.role)) return
    setPage(next)
    setDetailSignal(options.detailId ? { id: options.detailId, nonce: Date.now() } : null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const addBook = () => { if (!['admin', 'librarian'].includes(user?.role)) { notify('Staff access required', 'error'); return } setPage('books'); setAddSignal((value) => value + 1) }
  const processReturn = () => { setPage('circulation'); setReturnSignal((value) => value + 1) }
  const pages = useMemo(() => ({
    dashboard: <Dashboard user={user} onNavigate={navigate} onAddMember={() => !['admin', 'librarian'].includes(user?.role) ? notify('Staff access required', 'error') : setMemberOpen(true)} onReturn={processReturn} catalogVersion={catalogVersion} />,
    books: <Books canEdit={['admin', 'librarian'].includes(user?.role)} addSignal={addSignal} onAddHandled={() => setAddSignal(0)} detailSignal={detailSignal} compact={preferences.compact} notify={notify} onCatalogChange={() => setCatalogVersion((v) => v + 1)} />,
    members: <Members canEdit={['admin', 'librarian'].includes(user?.role)} onAdd={() => setMemberOpen(true)} notify={notify} catalogVersion={catalogVersion} />,
    circulation: <Circulation canEdit={['admin', 'librarian'].includes(user?.role)} notify={notify} returnSignal={returnSignal} />,
    settings: <Settings user={user} preferences={preferences} onChange={setPreferences} theme={themeChoice} onTheme={setThemeChoice} notify={notify} />,
  }), [page, addSignal, detailSignal, preferences, catalogVersion, returnSignal, themeChoice, user])

  const registerMember = async (event) => {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    setMemberBusy(true)
    try {
      await createMember(Object.fromEntries(values))
      setMemberOpen(false); setCatalogVersion((v) => v + 1); notify('Member registered.')
    } catch (e) { notify(getErrorMessage(e), 'error') }
    finally { setMemberBusy(false) }
  }
  if (checkingSession) return <main className="page" role="status">Checking session...</main>
  if (!user) return <SignIn onSignIn={setUser} />
  return <div className="app-shell">
    <CursorFollower />
    <Navbar canEdit={['admin', 'librarian'].includes(user.role)} page={page} onNavigate={navigate} onAddBook={addBook} theme={theme} onThemeToggle={() => setThemeChoice(theme === 'dark' ? 'light' : 'dark')} onProfile={() => setProfileOpen(true)} />
    <main id="main-content">{pages[page]}</main>
    <Notification notification={notification} onClose={() => setNotification(null)} />
    {profileOpen && <ModalShell title="Account profile" onClose={() => setProfileOpen(false)} className="profile-modal"><div className="profile-content"><span className="profile-avatar"><CircleUserRound aria-hidden="true" /></span><h3>{user.name}</h3><p>Catalog and circulation access</p><dl><div><dt>Role</dt><dd>{user.role}</dd></div><div><dt>Session</dt><dd>Active</dd></div></dl></div><div className="modal-actions"><button className="button secondary ripple" onClick={() => setProfileOpen(false)}>Close profile</button><button className="button primary" onClick={async () => { try { await logout() } catch (e) { notify(getErrorMessage(e), 'error') } finally { window.dispatchEvent(new Event('anirory-signed-out')) } }}>Sign out</button></div></ModalShell>}
    {memberOpen && <ModalShell title="Register a member" onClose={() => setMemberOpen(false)}><form className="book-form" onSubmit={registerMember}><label>Full name<input required name="name" minLength="2" autoComplete="name" /></label><label>Email address<input required name="email" type="email" autoComplete="email" /></label><label>Member type<select name="type" defaultValue="Adult"><option>Adult</option><option>Student</option><option>Researcher</option><option>Senior</option></select></label><div className="modal-actions"><button type="button" className="button secondary ripple" onClick={() => setMemberOpen(false)}>Cancel</button><button className="button primary ripple" type="submit" disabled={memberBusy}><UserPlus aria-hidden="true" />Register member</button></div></form></ModalShell>}
  </div>
}
