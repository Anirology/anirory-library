import { useState } from 'react'
import { login, getErrorMessage } from '../services/api.js'

export default function SignIn({ onSignIn }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event) => {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    setBusy(true); setError('')
    try { onSignIn(await login(values.get('email'), values.get('password'))) }
    catch (e) { setError(getErrorMessage(e)) }
    finally { setBusy(false) }
  }
  return <main className="page" style={{ maxWidth: 480, margin: '10vh auto' }}><section className="panel glass"><h1>Anirory Library</h1><p>Sign in as a User, Librarian, or Admin.</p><form className="book-form" onSubmit={submit}><label>Email<input name="email" type="email" required autoComplete="username" /></label><label>Password<input name="password" type="password" required maxLength={128} autoComplete="current-password" /></label>{error && <p role="alert" className="inline-error">{error}</p>}<button className="button primary" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button></form></section></main>
}
