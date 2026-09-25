import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import App from '../App'
import { AuthProvider } from '../auth'
import { api, setToken } from '../api'
import { movie, review } from './fixtures'

vi.mock('../api', () => ({
  setToken: vi.fn(),
  api: {
    movies: vi.fn(),
    movie: vi.fn(),
    filters: vi.fn(),
    reviews: vi.fn(),
    login: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    review: vi.fn(),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  vi.mocked(api.movies).mockResolvedValue({
    items: [movie],
    total: 13,
    page: 1,
    page_size: 12,
    pages: 2,
  })
  vi.mocked(api.filters).mockResolvedValue({
    generos: ['Drama'],
    produtoras: ['Estúdio Horizonte'],
    anos: [2026],
  })
  vi.mocked(api.movie).mockResolvedValue(movie)
  vi.mocked(api.reviews).mockResolvedValue({
    items: [review],
    total: 1,
    page: 1,
    page_size: 10,
    pages: 1,
  })
  vi.mocked(api.login).mockResolvedValue({
    access_token: 'test-token',
    username: 'admin',
    expires_in: 3600,
  })
})

function app(path = '/') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return client
}

async function login() {
  await userEvent.type(screen.getByLabelText('Usuário'), 'admin')
  await userEvent.type(screen.getByLabelText('Senha'), 'test-password')
  await userEvent.click(screen.getByRole('button', { name: /^entrar/i }))
}

it('combina busca, filtros e paginação e reinicia a página ao filtrar', async () => {
  app()
  await screen.findByRole('link', { name: /ver além do horizonte/i })
  await userEvent.click(screen.getByRole('button', { name: /próxima/i }))
  await waitFor(() =>
    expect(api.movies).toHaveBeenLastCalledWith(
      expect.stringContaining('page=2'),
      expect.any(AbortSignal),
    ),
  )
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Horizonte' } })
  await userEvent.selectOptions(screen.getByLabelText('Gênero'), 'Drama')
  await waitFor(() => {
    const query = new URLSearchParams(vi.mocked(api.movies).mock.calls.at(-1)![0])
    expect(query.get('q')).toBe('Horizonte')
    expect(query.get('genero')).toBe('Drama')
    expect(query.get('page')).toBeNull()
  })
})

it('exibe ficha e resenhas para visitante', async () => {
  app(`/filmes/${movie.sk_movie_id}`)
  expect(await screen.findByText(review.comentario)).toBeVisible()
  expect(screen.getByRole('link', { name: /entrar para avaliar/i })).toBeVisible()
  expect(screen.queryByRole('button', { name: /^remover$/i })).not.toBeInTheDocument()
})

it('protege cadastro e retorna ao formulário depois do login', async () => {
  app('/filmes/novo')
  await login()
  expect(await screen.findByRole('heading', { name: 'Mais uma boa história.' })).toBeVisible()
  expect(setToken).toHaveBeenCalledWith('test-token')
})

it('publica avaliação e invalida o cache da ficha e do catálogo', async () => {
  vi.mocked(api.review).mockResolvedValue(review)
  const client = app(`/filmes/${movie.sk_movie_id}`)
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  await userEvent.click(await screen.findByRole('link', { name: /entrar para avaliar/i }))
  await login()
  await screen.findByLabelText('Resenha *')
  await userEvent.type(screen.getByLabelText('Resenha *'), 'Um novo olhar')
  await userEvent.click(screen.getByRole('button', { name: /publicar avaliação/i }))
  expect(await screen.findByText(/avaliação publicada/i)).toBeVisible()
  expect(api.review).toHaveBeenCalledWith(movie.sk_movie_id, {
    nome: 'admin',
    nota: 8,
    comentario: 'Um novo olhar',
  })
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['movies'] })
})

it('confirma a exclusão antes de remover o filme', async () => {
  vi.mocked(api.remove).mockResolvedValue()
  app(`/filmes/${movie.sk_movie_id}`)
  await userEvent.click(await screen.findByRole('link', { name: /entrar para avaliar/i }))
  await login()
  await userEvent.click(await screen.findByRole('button', { name: /^remover$/i }))
  expect(screen.getByRole('dialog')).toBeVisible()
  expect(api.remove).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(api.remove).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: /^remover$/i }))
  await userEvent.click(screen.getByRole('button', { name: 'Remover filme' }))
  await waitFor(() => expect(api.remove).toHaveBeenCalledWith(movie.sk_movie_id))
})
