import { act, render, screen, waitFor, fireEvent } from '@testing-library/react'
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
  vi.resetAllMocks()
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

it.each(['criação', 'edição'])('salva %s, atualiza o cache e abre a ficha', async (mode) => {
  const editing = mode === 'edição'
  let finish!: (value: typeof movie) => void
  const pending = new Promise<typeof movie>((resolve) => {
    finish = resolve
  })
  vi.mocked(api.create).mockReturnValue(pending)
  vi.mocked(api.update).mockReturnValue(pending)
  const client = app(editing ? `/filmes/${movie.sk_movie_id}/editar` : '/filmes/novo')
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  await login()
  const title = await screen.findByLabelText('Título *')
  expect(title).toHaveValue(editing ? movie.titulo : '')
  fireEvent.change(title, { target: { value: ' Novo título ' } })
  fireEvent.change(screen.getByLabelText('Direção *'), { target: { value: ' Ana, Ana, Bia ' } })
  fireEvent.change(screen.getByLabelText('Gêneros *'), { target: { value: 'Drama, Drama' } })
  fireEvent.change(screen.getByLabelText('Ano de lançamento *'), { target: { value: '2026' } })
  await userEvent.click(
    screen.getByRole('button', { name: editing ? /salvar alterações/i : /cadastrar filme/i }),
  )
  const payload = expect.objectContaining({
    titulo: 'Novo título',
    diretores: ['Ana', 'Bia'],
    generos: ['Drama'],
    ano_lancamento: 2026,
  })
  if (editing) expect(api.update).toHaveBeenCalledWith(movie.sk_movie_id, payload)
  else expect(api.create).toHaveBeenCalledWith(payload)
  expect(screen.getByRole('button', { name: /salvando/i })).toBeDisabled()
  expect(title).toBeDisabled()
  await act(async () => finish(movie))
  expect(await screen.findByRole('heading', { name: movie.titulo })).toBeVisible()
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['movies'] })
})

it('retorna ao editor após a sessão expirar e um novo login', async () => {
  app(`/filmes/${movie.sk_movie_id}/editar`)
  await login()
  await screen.findByLabelText('Título *')
  act(() => window.dispatchEvent(new Event('auth-expired')))
  expect(await screen.findByLabelText('Usuário')).toBeVisible()
  expect(setToken).toHaveBeenLastCalledWith(null)
  expect(screen.queryByLabelText('Título *')).not.toBeInTheDocument()
  await login()
  expect(await screen.findByLabelText('Título *')).toHaveValue(movie.titulo)
})

it('mantém a confirmação bloqueada enquanto a exclusão está em andamento', async () => {
  let finish!: () => void
  vi.mocked(api.remove).mockReturnValue(
    new Promise<void>((resolve) => {
      finish = resolve
    }),
  )
  const client = app(`/filmes/${movie.sk_movie_id}`)
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  await userEvent.click(await screen.findByRole('link', { name: /entrar para avaliar/i }))
  await login()
  await userEvent.click(await screen.findByRole('button', { name: /^remover$/i }))
  await userEvent.click(screen.getByRole('button', { name: 'Remover filme' }))
  expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
  expect(screen.getByRole('button', { name: /removendo/i })).toBeDisabled()
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))
  expect(screen.getByRole('dialog')).toBeVisible()
  await act(async () => finish())
  expect(await screen.findByRole('heading', { name: /explore o catálogo/i })).toBeVisible()
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['movies'] })
})

it('mostra carregamento e depois o catálogo vazio', async () => {
  let finish!: (value: Awaited<ReturnType<typeof api.movies>>) => void
  vi.mocked(api.movies).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve
    }),
  )
  app()
  expect(screen.getByText('Carregando cinema…')).toBeVisible()
  await act(async () => finish({ items: [], total: 0, page: 1, page_size: 12, pages: 0 }))
  expect(await screen.findByRole('heading', { name: /nenhum filme/i })).toBeVisible()
})

it.each([
  ['/', 'movies', 'Não foi possível carregar os filmes.'],
  [`/filmes/${movie.sk_movie_id}`, 'movie', 'Não foi possível carregar o filme.'],
  [`/filmes/${movie.sk_movie_id}`, 'reviews', 'Não foi possível carregar as avaliações.'],
] as const)('exibe falha de consulta em %s (%s)', async (path, endpoint, message) => {
  vi.mocked(api[endpoint]).mockRejectedValue(new Error('Falha de consulta'))
  app(path)
  expect(await screen.findByText(message)).toBeVisible()
})

it('pagina avaliações e apresenta notas zero e decimais', async () => {
  vi.mocked(api.reviews)
    .mockResolvedValueOnce({
      items: [{ ...review, nota: 0 }],
      total: 11,
      page: 1,
      page_size: 10,
      pages: 2,
    })
    .mockResolvedValue({
      items: [{ ...review, nota: 7.5, comentario: 'Outra perspectiva' }],
      total: 11,
      page: 2,
      page_size: 10,
      pages: 2,
    })
  app(`/filmes/${movie.sk_movie_id}`)
  expect(await screen.findByText('0.0')).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: /próxima/i }))
  expect(await screen.findByText('7.5')).toBeVisible()
  expect(api.reviews).toHaveBeenLastCalledWith(movie.sk_movie_id, 2, expect.any(AbortSignal))
})

it('mostra o convite à primeira avaliação quando não há resenhas', async () => {
  vi.mocked(api.reviews).mockResolvedValue({
    items: [],
    total: 0,
    page: 1,
    page_size: 10,
    pages: 0,
  })
  app(`/filmes/${movie.sk_movie_id}`)
  expect(await screen.findByText('Este filme ainda não recebeu avaliações.')).toBeVisible()
})
