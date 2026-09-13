import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import ModalShell from './ModalShell.jsx'

const EMPTY = { title: '', author: '', category: '', price: '', available: true }

export default function BookFormModal({ book, onClose, onSubmit, saving }) {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  useEffect(() => setForm(book ? { title: book.title, author: book.author, category: book.category, price: book.price, available: book.available } : EMPTY), [book])
  const change = (event) => {
    const { name, value, checked, type } = event.target
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
    setErrors((current) => ({ ...current, [name]: '' }))
  }
  const submit = async (event) => {
    event.preventDefault()
    const next = {}
    if (form.title.trim().length < 2) next.title = 'Enter at least two characters.'
    if (form.author.trim().length < 2) next.author = 'Enter at least two characters.'
    if (form.category.trim().length < 2) next.category = 'Enter at least two characters.'
    if (!form.price || Number(form.price) <= 0) next.price = 'Enter a price greater than zero.'
    if (Object.keys(next).length) return setErrors(next)
    await onSubmit({ ...form, price: Number(form.price), title: form.title.trim(), author: form.author.trim(), category: form.category.trim() })
  }
  return (
    <ModalShell title={book ? 'Edit book' : 'Add a catalog record'} onClose={onClose}>
      <form className="book-form" onSubmit={submit} noValidate>
        <label>Title<input name="title" value={form.title} onChange={change} aria-invalid={Boolean(errors.title)} autoComplete="off" />{errors.title && <small className="field-error">{errors.title}</small>}</label>
        <label>Author<input name="author" value={form.author} onChange={change} aria-invalid={Boolean(errors.author)} autoComplete="off" />{errors.author && <small className="field-error">{errors.author}</small>}</label>
        <label>Category<input name="category" value={form.category} onChange={change} aria-invalid={Boolean(errors.category)} autoComplete="off" />{errors.category && <small className="field-error">{errors.category}</small>}</label>
        <label>Price (LKR)<input name="price" type="number" min="0.01" step="0.01" value={form.price} onChange={change} aria-invalid={Boolean(errors.price)} />{errors.price && <small className="field-error">{errors.price}</small>}</label>
        <label className="switch-row"><span><b>Available</b><small>Ready for immediate circulation</small></span><input name="available" type="checkbox" checked={form.available} onChange={change} /><span className="switch" aria-hidden="true" /></label>
        <div className="modal-actions"><button type="button" className="button secondary ripple" onClick={onClose}>Cancel</button><button type="submit" className="button primary ripple" disabled={saving}><Save aria-hidden="true" />{saving ? 'Saving…' : 'Save book'}</button></div>
      </form>
    </ModalShell>
  )
}

