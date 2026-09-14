import axios from 'axios'

const productionApiUrl = 'https://anirory-library-api-anirology.onrender.com'

export const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:8000' : productionApiUrl)
).replace(/\/+$/, '')

// Kept as a compatibility export for the settings screen. The catalog always
// uses the API; there is no in-browser fallback dataset.
export const isDemoMode = false

const api = axios.create({
  baseURL: apiBaseUrl,
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
  if (!error?.response) return `Could not reach the library server at ${apiBaseUrl}.`
  return 'Something went wrong. Please try again.'
}

export default api
