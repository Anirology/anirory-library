import axios from 'axios'

const productionApiUrl = 'https://anirory-library-api-anirology.vercel.app'

export const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:8000' : productionApiUrl)
).replace(/\/+$/, '')

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 12000,
  headers: { 'Content-Type': 'application/json' },
})

let accessToken = sessionStorage.getItem('anirory-session') || ''
export const clearSession = () => { accessToken = ''; sessionStorage.removeItem('anirory-session') }
api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})
api.interceptors.response.use((response) => response, (error) => {
  if (error.response?.status === 401 && !error.config.url.endsWith('/auth/login')) {
    clearSession()
    window.dispatchEvent(new Event('anirory-signed-out'))
  }
  return Promise.reject(error)
})
export const login = async (email, password) => {
  const { data } = await api.post('/auth/login', { email, password })
  accessToken = data.access_token
  sessionStorage.setItem('anirory-session', accessToken)
  return data.user
}
export const getCurrentUser = async () => (await api.get('/auth/me')).data
export const logout = async () => { try { await api.post('/auth/logout') } finally { clearSession() } }
export const listMembers = async (filters = {}) => (await api.get('/members', { params: cleanParams(filters) })).data
export const createMember = async (data) => (await api.post('/members', data)).data
export const replaceMember = async (id, data) => (await api.put(`/members/${id}`, data)).data
export const deleteMember = async (id) => api.delete(`/members/${id}`)
export const listLoans = async (filters = {}) => (await api.get('/loans', { params: cleanParams(filters) })).data
export const issueLoan = async (data) => (await api.post('/loans', data)).data
export const returnLoan = async (id) => (await api.post(`/loans/${id}/return`)).data
export const getDashboard = async () => (await api.get('/dashboard')).data
export const changePassword = async (data) => (await api.post('/auth/password', data)).data
export const listUsers = async () => (await api.get('/users')).data
export const createUser = async (data) => (await api.post('/users', data)).data
export const updateUser = async (id, data) => (await api.patch(`/users/${id}`, data)).data

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
