import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 12000,
  headers: { 'Content-Type': 'application/json' },
})

const cleanParams = (values) => Object.fromEntries(
  Object.entries(values).filter(([, value]) => value !== '' && value !== null && value !== undefined)
)

export const listBooks = async (filters = {}) => (await api.get('/books', { params: cleanParams(filters) })).data
export const getBook = async (id) => (await api.get(`/books/${id}`)).data
export const createBook = async (data) => (await api.post('/books', data)).data
export const replaceBook = async (id, data) => (await api.put(`/books/${id}`, data)).data
export const updateBook = async (id, data) => (await api.patch(`/books/${id}`, data)).data
export const deleteBook = async (id) => api.delete(`/books/${id}`)

export const getErrorMessage = (error) => {
  const detail = error?.response?.data?.detail
  if (Array.isArray(detail)) return detail.map((item) => item.msg).join('. ')
  if (typeof detail === 'string') return detail
  if (error?.code === 'ECONNABORTED') return 'The request timed out. Please try again.'
  if (!error?.response) return 'Could not reach the library server. Check that FastAPI is running.'
  return 'Something went wrong. Please try again.'
}

export default api

