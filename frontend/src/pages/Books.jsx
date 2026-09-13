import { useCallback, useEffect, useRef, useState } from 'react'
import { FilterX, LibraryBig, Plus, Search, SlidersHorizontal } from 'lucide-react'
import BookCard from '../components/BookCard.jsx'
import BookDetails from '../components/BookDetails.jsx'
import BookFormModal from '../components/BookFormModal.jsx'
import DeleteConfirmation from '../components/DeleteConfirmation.jsx'
import { createBook, deleteBook, getBook, getErrorMessage, listBooks, replaceBook } from '../services/api.js'

const CATEGORIES = ['Arts', 'Biography', 'Business', 'Education', 'Environment', 'Fiction', 'Health', 'History', 'Philosophy', 'Psychology', 'Reference', 'Science', 'Social Sciences', 'Technology', 'Travel']
const DEFAULTS = { search: '', category: '', max_price: '', available: '', sort: 'newest' }

export default function Books({ addSignal, detailSignal, compact, notify, onCatalogChange }) {
  const [filters, setFilters] = useState(DEFAULTS)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [books, setBooks] = useState([])
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [formBook, setFormBook] = useState(undefined)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving] = useState(false)
  const firstAdd = useRef(true)

  useEffect(() => { const timer = setTimeout(() => setDebouncedSearch(filters.search), 350); return () => clearTimeout(timer) }, [filters.search])

  const fetchBooks = useCallback(async (page = 1, append = false) => {
    append ? setLoadingMore(true) : setLoading(true)
    setError('')
    try {
      const data = await listBooks({ ...filters, search: debouncedSearch, page, page_size: 24 })
      setBooks((current) => append ? [...current, ...data.items] : data.items)
      setMeta(data)
    } catch (e) { setError(getErrorMessage(e)) }
    finally { setLoading(false); setLoadingMore(false) }
  }, [filters.category, filters.max_price, filters.available, filters.sort, debouncedSearch])

  useEffect(() => { fetchBooks() }, [fetchBooks])
  useEffect(() => { if (firstAdd.current) { firstAdd.current = false; return } setFormBook(undefined); setFormOpen(true) }, [addSignal])
  useEffect(() => { if (detailSignal?.id) openDetails(detailSignal.id) }, [detailSignal])

  const openDetails = async (id) => {
    setDetail(null); setDetailLoading(true)
    try { setDetail(await getBook(id)) } catch (e) { notify(getErrorMessage(e), 'error'); return }
    finally { setDetailLoading(false) }
  }
  const save = async (data) => {
    setSaving(true)
    try {
      if (formBook) await replaceBook(formBook.id, data)
      else await createBook(data)
      setFormOpen(false); setFormBook(undefined); setDetail(null)
      await fetchBooks(); onCatalogChange(); notify(formBook ? 'Book record updated.' : 'Book added to the catalog.')
    } catch (e) { notify(getErrorMessage(e), 'error') }
    finally { setSaving(false) }
  }
  const remove = async () => {
    setSaving(true)
    try { await deleteBook(deleteTarget.id); setDeleteTarget(null); setDetail(null); await fetchBooks(); onCatalogChange(); notify('Book removed from the catalog.') }
    catch (e) { notify(getErrorMessage(e), 'error') }
    finally { setSaving(false) }
  }
  const reset = () => setFilters(DEFAULTS)
  const update = (event) => setFilters((current) => ({ ...current, [event.target.name]: event.target.value }))
  return <div className="page page-enter">
    <header className="page-header"><div><span className="eyebrow">Catalog operations</span><h1>Books</h1><p>Search, curate and maintain every library record.</p></div><button className="button primary ripple" onClick={() => { setFormBook(undefined); setFormOpen(true) }}><Plus aria-hidden="true" />Add book</button></header>
    <section className="filters-panel glass" aria-label="Catalog filters">
      <label className="search-field"><Search aria-hidden="true" /><span className="sr-only">Search books</span><input name="search" value={filters.search} onChange={update} placeholder="Title, author, category or book ID" /></label>
      <label><span>Category</span><select name="category" value={filters.category} onChange={update}><option value="">All categories</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
      <label><span>Max price</span><input name="max_price" value={filters.max_price} onChange={update} type="number" min="1" placeholder="Any price" /></label>
      <label><span>Availability</span><select name="available" value={filters.available} onChange={update}><option value="">Any status</option><option value="true">Available</option><option value="false">On loan</option></select></label>
      <label><span>Sort</span><select name="sort" value={filters.sort} onChange={update}><option value="newest">Newest</option><option value="title">Title</option><option value="author">Author</option><option value="price">Price</option></select></label>
      <button className="button secondary ripple reset-button" onClick={reset}><FilterX aria-hidden="true" />Reset</button>
    </section>
    <div className="results-head"><p><SlidersHorizontal aria-hidden="true" />{loading ? 'Searching catalog…' : `${meta.total.toLocaleString()} result${meta.total === 1 ? '' : 's'}`}</p></div>
    {error && <div className="state-card glass" role="alert"><LibraryBig aria-hidden="true" /><h2>Catalog unavailable</h2><p>{error}</p><button className="button primary ripple" onClick={() => fetchBooks()}>Try again</button></div>}
    {!error && loading && <div className="books-grid">{[...Array(8)].map((_, i) => <div className="book-card skeleton" key={i} />)}</div>}
    {!error && !loading && books.length === 0 && <div className="state-card glass"><Search aria-hidden="true" /><h2>No books found</h2><p>Try a broader search or clear the active filters.</p><button className="button secondary ripple" onClick={reset}>Reset filters</button></div>}
    {!error && books.length > 0 && <><section className="books-grid" aria-label="Book results">{books.map((book) => <BookCard key={book.id} book={book} compact={compact} onDetails={openDetails} />)}</section>{meta.page < meta.pages && <div className="load-more"><button className="button secondary ripple" disabled={loadingMore} onClick={() => fetchBooks(meta.page + 1, true)}>{loadingMore ? 'Loading…' : `Load more (${books.length} of ${meta.total})`}</button></div>}</>}
    {(detail || detailLoading) && <BookDetails book={detail} loading={detailLoading} onClose={() => setDetail(null)} onEdit={(book) => { setDetail(null); setFormBook(book); setFormOpen(true) }} onDelete={(book) => { setDetail(null); setDeleteTarget(book) }} />}
    {formOpen && <BookFormModal book={formBook} saving={saving} onClose={() => { if (!saving) setFormOpen(false) }} onSubmit={save} />}
    {deleteTarget && <DeleteConfirmation book={deleteTarget} deleting={saving} onClose={() => !saving && setDeleteTarget(null)} onConfirm={remove} />}
  </div>
}

