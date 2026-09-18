import { useEffect, useState } from 'react'
import { changePassword, clearSession, createUser, listUsers, updateUser, getErrorMessage } from '../services/api.js'

export default function AccountSettings({ user, notify }) {
  const [users, setUsers] = useState([])
  const [busy, setBusy] = useState(false)
  const [version, setVersion] = useState(0)
  useEffect(() => {
    if (user.role !== 'admin') return
    let active = true
    listUsers().then((data) => { if (active) setUsers(data) }).catch((e) => { if (active) notify(getErrorMessage(e), 'error') })
    return () => { active = false }
  }, [user.role, version])
  const password = async (event) => {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget))
    setBusy(true)
    try { await changePassword(values); clearSession(); window.dispatchEvent(new Event('anirory-signed-out')) }
    catch (e) { notify(getErrorMessage(e), 'error') }
    finally { setBusy(false) }
  }
  const create = async (event) => {
    event.preventDefault()
    const form = event.currentTarget
    const values = Object.fromEntries(new FormData(form))
    setBusy(true)
    try { await createUser(values); form.reset(); setVersion((v) => v + 1); notify('Account created.') }
    catch (e) { notify(getErrorMessage(e), 'error') }
    finally { setBusy(false) }
  }
  const update = async (account, data) => {
    setBusy(true)
    try { await updateUser(account.id, data); setVersion((v) => v + 1); notify('Account updated.') }
    catch (e) { notify(getErrorMessage(e), 'error') }
    finally { setBusy(false) }
  }
  return <section className="panel glass"><h2>Account security</h2><form className="book-form" onSubmit={password}><label>Current password<input name="current_password" type="password" required maxLength={128} autoComplete="current-password" /></label><label>New password<input name="new_password" type="password" required minLength={12} maxLength={128} autoComplete="new-password" /></label><p>Changing your password signs out all your sessions.</p><button className="button primary" disabled={busy}>Change password</button></form>
    {user.role === 'admin' && <><h2>User accounts</h2><div className="responsive-table"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead><tbody>{users.map((account) => <tr key={account.id}><td>{account.name}</td><td>{account.email}</td><td><select aria-label={`Role for ${account.name}`} value={account.role} disabled={busy || account.id === user.id} onChange={(e) => update(account, { role: e.target.value })}>{['admin', 'librarian', 'user'].map((role) => <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>)}</select></td><td><button className="button secondary small" disabled={busy || account.id === user.id} onClick={() => update(account, { active: !account.active })}>{account.active ? 'Deactivate' : 'Activate'}</button></td></tr>)}</tbody></table></div><h3>Create account</h3><form className="book-form" onSubmit={create}><label>Name<input name="name" required minLength={2} maxLength={255} /></label><label>Email<input name="email" type="email" required /></label><label>Initial password<input name="password" type="password" required minLength={12} maxLength={128} autoComplete="new-password" /></label><label>Role<select name="role" defaultValue="user"><option value="user">User</option><option value="librarian">Librarian</option><option value="admin">Admin</option></select></label><button className="button primary" disabled={busy}>Create account</button></form></>}
  </section>
}
