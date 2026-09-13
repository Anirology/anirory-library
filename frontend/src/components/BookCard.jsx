import { BookMarked, ChevronRight } from 'lucide-react'

export default function BookCard({ book, onDetails, compact }) {
  const tilt = (event) => {
    if (window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const card = event.currentTarget
    const rect = card.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5
    card.style.transform = `perspective(900px) rotateX(${-y * 6}deg) rotateY(${x * 8}deg) translateY(-4px)`
  }
  const reset = (event) => { event.currentTarget.style.transform = '' }
  return (
    <article className={`book-card glass ${compact ? 'compact' : ''}`} onPointerMove={tilt} onPointerLeave={reset} onClick={() => onDetails(book.id)} tabIndex="0" onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onDetails(book.id)} aria-label={`View details for ${book.title}`}>
      <div className="glass-reflection" aria-hidden="true" />
      <div className="book-icon floating"><BookMarked aria-hidden="true" /></div>
      <span className="category-chip">{book.category}</span>
      <h3>{book.title}</h3>
      <p className="book-author">{book.author}</p>
      <div className="book-meta"><strong>LKR {Number(book.price).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</strong><span className={`status ${book.available ? 'available' : 'loaned'}`}>{book.available ? 'Available' : 'On loan'}</span></div>
      <button className="text-button ripple" type="button" onClick={(e) => { e.stopPropagation(); onDetails(book.id) }}>Details <ChevronRight aria-hidden="true" /></button>
    </article>
  )
}

