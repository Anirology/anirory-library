import { useEffect, useState } from 'react'
import { listMembers, replaceMember, deleteMember, getErrorMessage } from '../services/api.js'
import ModalShell from '../components/ModalShell.jsx'

export default function Members({ onAdd, catalogVersion, canEdit = true, notify }) {
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [members, setMembers] = useState([])
  const [page, setPage] = useState(1)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [busy, setBusy] = useState(false)
  const [version, setVersion] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    listMembers({ search, type, page }).then((data) => { if (active) setMembers(data) }).catch((e) => { if (active) setError(getErrorMessage(e)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [search, type, page, catalogVersion, version])
  const save = async (event) => {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget))
    setBusy(true)
    try { await replaceMember(selected.id, { ...values, active: values.active === 'true' }); setSelected(null); setVersion((v) => v + 1); notify('Member updated.') }
    catch (e) { notify(getErrorMessage(e), 'error') }
    finally { setBusy(false) }
  }
  const remove = async () => {
    setBusy(true)
    try { await deleteMember(selected.id); setSelected(null); setVersion((v) => v + 1); notify('Member deleted.') }
    catch (e) { notify(getErrorMessage(e), 'error') }
    finally { setBusy(false) }
  }
  return <div className="page page-enter"><header className="page-header"><div><span className="eyebrow">Patron services</span><h1>Members</h1><p>Review member activity and account standing.</p></div>{canEdit && <button className="button primary" onClick={onAdd}>Add member</button>}</header>
    <section className="filters-panel glass"><label>Search members<input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Search name or email" /></label><label>Member type<select value={type} onChange={(e) => { setType(e.target.value); setPage(1) }}><option value="">All types</option>{['Adult', 'Student', 'Researcher', 'Senior'].map((t) => <option key={t}>{t}</option>)}</select></label></section>
    {error && <p role="alert" className="inline-error">{error}</p>}
    <section className="table-panel glass"><div className="responsive-table"><table><thead><tr><th>Member</th><th>Type</th><th>Active loans</th><th>Standing</th><th>Actions</th></tr></thead><tbody>{members.map((m) => <tr key={m.id}><td><b>{m.name}</b><small>MB-{m.id}</small></td><td>{m.type}</td><td>{m.loans}</td><td>{m.standing}</td><td><button className="button secondary small" onClick={() => setSelected(m)}>View member</button></td></tr>)}</tbody></table>{loading ? <p role="status">Loading members...</p> : !members.length && <div className="empty-table">No matching members</div>}</div><div className="modal-actions"><button className="button secondary" disabled={page === 1 || loading} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page}</span><button className="button secondary" disabled={members.length < 100 || loading} onClick={() => setPage(page + 1)}>Next</button></div></section>
    {selected && <ModalShell title={selected.name} onClose={() => !busy && setSelected(null)}><p>{selected.type} · {selected.standing} · {selected.loans} active loans</p>{canEdit ? <form className="book-form" onSubmit={save}><label>Name<input name="name" defaultValue={selected.name} required minLength={2} maxLength={255} /></label><label>Email<input name="email" type="email" defaultValue={selected.email} required /></label><label>Type<select name="type" defaultValue={selected.type}>{['Adult', 'Student', 'Researcher', 'Senior'].map((t) => <option key={t}>{t}</option>)}</select></label><label>Account status<select name="active" defaultValue={String(selected.active)}><option value="true">Active</option><option value="false">Inactive</option></select></label><p>Members with loan history can be deactivated. Deletion permanently removes members without history.</p><div className="modal-actions"><button type="button" className="button danger" disabled={busy} onClick={remove}>Delete member</button><button className="button primary" disabled={busy}>Save member</button></div></form> : <p>{selected.email}</p>}</ModalShell>}
  </div>
}
