import type { Filters, Movie, MovieInput, Page, Review, ReviewInput } from './types'

const base = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').replace(/\/$/, '')
let token: string | null = null
export function setToken(value: string | null) {
  token = value
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(base + path, {
      ...init,
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(
      'Não foi possível conectar à API. Verifique sua conexão e tente novamente.',
      0,
    )
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const detail = body.detail
    const message =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail
              .map(
                (item: { loc: string[]; msg: string }) =>
                  `${item.loc.slice(1).join('.')}: ${item.msg}`,
              )
              .join(' · ')
          : 'Não foi possível concluir esta ação.'
    if (response.status === 401 && token) {
      setToken(null)
      window.dispatchEvent(new Event('auth-expired'))
    }
    throw new ApiError(message, response.status)
  }
  return response.status === 204 ? (undefined as T) : response.json()
}

export const api = {
  movies: (params: string, signal?: AbortSignal) =>
    request<Page<Movie>>(`/movies?${params}`, { signal }),
  movie: (id: string, signal?: AbortSignal) => request<Movie>(`/movies/${id}`, { signal }),
  filters: (signal?: AbortSignal) => request<Filters>('/movies/filters', { signal }),
  reviews: (id: string, page: number, signal?: AbortSignal) =>
    request<Page<Review>>(`/movies/${id}/reviews?page=${page}`, { signal }),
  create: (data: MovieInput) =>
    request<Movie>('/movies', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: MovieInput) =>
    request<Movie>(`/movies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  remove: (id: string) => request<void>(`/movies/${id}`, { method: 'DELETE' }),
  review: (id: string, data: ReviewInput) =>
    request<Review>(`/movies/${id}/reviews`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  login: (username: string, password: string) =>
    request<{ access_token: string; username: string; expires_in: number }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
}
