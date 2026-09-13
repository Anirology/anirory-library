import { Trash2 } from 'lucide-react'
import ModalShell from './ModalShell.jsx'

export default function DeleteConfirmation({ book, onClose, onConfirm, deleting }) {
  return <ModalShell title="Delete catalog record?" onClose={onClose} className="confirm-modal">
    <div className="confirm-copy"><span className="danger-icon"><Trash2 aria-hidden="true" /></span><p><strong>{book.title}</strong> will be permanently removed from the MySQL catalog. This action cannot be undone.</p></div>
    <div className="modal-actions"><button className="button secondary ripple" onClick={onClose}>Keep book</button><button className="button danger ripple" onClick={onConfirm} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete book'}</button></div>
  </ModalShell>
}
