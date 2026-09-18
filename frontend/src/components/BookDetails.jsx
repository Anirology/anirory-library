import { CalendarDays, Edit3, Hash, Trash2 } from 'lucide-react'
import ModalShell from './ModalShell.jsx'

export default function BookDetails({ book, loading, onClose, onEdit, onDelete, canEdit = true }) {
  return (
    <ModalShell title="Book details" onClose={onClose} className="details-modal">
      {loading ? <div className="details-skeleton skeleton" /> : book && <>
        <div className="detail-hero"><span className={`status ${book.available ? 'available' : 'loaned'}`}>{book.available ? 'Available' : 'On loan'}</span><h3>{book.title}</h3><p>{book.author}</p></div>
        <dl className="detail-grid"><div><dt><Hash aria-hidden="true" />Book ID</dt><dd>{book.id}</dd></div><div><dt>Category</dt><dd>{book.category}</dd></div><div><dt>Replacement price</dt><dd>LKR {Number(book.price).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</dd></div><div><dt><CalendarDays aria-hidden="true" />Cataloged</dt><dd>{new Date(book.created_at).toLocaleDateString()}</dd></div></dl>
        {canEdit && <div className="modal-actions"><button className="button danger ripple" onClick={() => onDelete(book)}><Trash2 aria-hidden="true" />Delete</button><button className="button primary ripple" onClick={() => onEdit(book)}><Edit3 aria-hidden="true" />Edit record</button></div>}
      </>}
    </ModalShell>
  )
}
