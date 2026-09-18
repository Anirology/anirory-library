import { CheckCircle2, MonitorCog, Palette, Save } from 'lucide-react'
import { apiBaseUrl } from '../services/api.js'
import AccountSettings from '../components/AccountSettings.jsx'

export default function Settings({ preferences, onChange, theme, onTheme, notify, user }) {
  const toggle = (key) => onChange({ ...preferences, [key]: !preferences[key] })
  return <div className="page page-enter"><header className="page-header"><div><span className="eyebrow">Workspace control</span><h1>Settings</h1><p>Personalize this administrator workstation.</p></div><button className="button primary ripple" onClick={() => notify('Interface preferences saved on this device.')}><Save aria-hidden="true" />Save preferences</button></header>
    <div className="settings-grid"><section className="panel glass"><div className="section-heading"><div><span className="eyebrow">Notifications & layout</span><h2>Interface preferences</h2></div><MonitorCog aria-hidden="true" /></div>
      {[['compact', 'Compact catalog mode', 'Show denser book cards in catalog results.']].map(([key, title, copy]) => <label className="switch-row" key={key}><span><b>{title}</b><small>{copy}</small></span><input type="checkbox" checked={preferences[key]} onChange={() => toggle(key)} /><span className="switch" aria-hidden="true" /></label>)}
      <fieldset className="theme-field"><legend><Palette aria-hidden="true" />Theme selection</legend><div className="segmented"><button className={theme === 'light' ? 'selected' : ''} onClick={() => onTheme('light')}>Light</button><button className={theme === 'dark' ? 'selected' : ''} onClick={() => onTheme('dark')}>Dark</button><button className={theme === 'system' ? 'selected' : ''} onClick={() => onTheme('system')}>System</button></div></fieldset>
    </section><aside className="panel glass system-card"><span className="system-pulse"><CheckCircle2 aria-hidden="true" /></span><span className="eyebrow">System status</span><h2>Library API configured</h2><p>Catalog, members and circulation use the library API.</p><dl><div><dt>Frontend</dt><dd>Signed in</dd></div><div><dt>API endpoint</dt><dd>{apiBaseUrl}</dd></div><div><dt>Preference storage</dt><dd>Local device</dd></div></dl></aside></div><AccountSettings user={user} notify={notify} />
  </div>
}
