import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import { api } from './api'
import { Protected, useAuth } from './auth'
import { CatalogFilters, MovieGrid } from './components/Catalog'
import { MovieDetails } from './components/MovieDetails'
import { MovieForm } from './components/MovieForm'
import { ReviewForm } from './components/ReviewForm'
import { Loading, Pagination, Rating } from './components/shared'
import type { MovieInput, ReviewInput } from './types'

function Layout({ children }: { children: ReactNode }) {
  const { username, logout } = useAuth()
  const navigate = useNavigate()
  return (
    <>
      <a className="skip-link" href="#main">
        Pular para o conteúdo
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" to="/" aria-label="Plano, início">
            <span className="brand-icon" aria-hidden="true">
              ◒
            </span>{' '}
            plano<span className="brand-dot">.</span>
          </Link>
          <nav className="main-nav" aria-label="Navegação principal">
            <Link to="/">Explorar filmes</Link>
            {username && <Link to="/filmes/novo">+ Novo filme</Link>}
          </nav>
          <div className="header-actions">
            {username ? (
              <button
                className="button secondary small"
                onClick={() => {
                  logout()
                  navigate('/')
                }}
              >
                Sair <span aria-hidden="true">↗</span>
              </button>
            ) : (
              <Link className="button secondary small" to="/entrar">
                Área admin <span aria-hidden="true">↗</span>
              </Link>
            )}
          </div>
        </div>
      </header>
      <main id="main" className="container">
        {children}
      </main>
      <footer className="site-footer">
        <Link className="brand" to="/">
          plano.
        </Link>
        <span>Histórias que merecem outro olhar.</span>
        <small>ROCKETLAB · 2026.2</small>
      </footer>
    </>
  )
}

function useDebounced(value: string) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), 300)
    return () => clearTimeout(timer)
  }, [value])
  return debounced
}

export function CatalogPage() {
  const [params, setParams] = useSearchParams()
  const queryParams = new URLSearchParams(params)
  queryParams.set('page_size', '12')
  const query = useDebounced(queryParams.toString())
  const catalog = useQuery({
    queryKey: ['movies', 'list', query],
    queryFn: ({ signal }) => api.movies(query, signal),
    placeholderData: keepPreviousData,
  })
  const filters = useQuery({
    queryKey: ['movies', 'filters'],
    queryFn: ({ signal }) => api.filters(signal),
  })
  const page = Math.max(1, Number(params.get('page')) || 1)
  const active = ['q', 'genero', 'ano', 'produtora', 'nota_min'].some((key) => params.has(key))
  function change(key: string, value: string) {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        if (value) next.set(key, value)
        else next.delete(key)
        if (key !== 'page') next.delete('page')
        return next
      },
      { replace: key === 'q' },
    )
  }
  return (
    <>
      <section className="catalog-hero">
        <div>
          <p className="eyebrow">
            <span className="live-dot" /> UM ESPAÇO PARA QUEM VIVE CINEMA
          </p>
          <h1>
            Todo filme abre
            <br />
            um <em>novo olhar.</em>
          </h1>
          <p className="hero-copy">
            Descubra histórias. Reencontre favoritos.
            <br />E dê a cada filme a sua perspectiva.
          </p>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="art-frame">
            <span>PLANO / 001</span>
            <div className="art-sun" />
            <div className="art-horizon" />
            <small>
              O CINEMA ACONTECE
              <br />
              NO ENCONTRO.
            </small>
          </div>
          <span className="art-caption">UMA HISTÓRIA. INFINITOS OLHARES. ↗</span>
        </div>
      </section>
      <section className="catalog-section" aria-labelledby="catalog-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ENCONTRE SUA PRÓXIMA HISTÓRIA</p>
            <h2 id="catalog-title">
              Explore o catálogo<span className="count">{catalog.data?.total ?? '—'}</span>
            </h2>
          </div>
          <span className="section-note">O próximo favorito pode estar aqui.</span>
        </div>
        <div className="search-row">
          <label className="search-field">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              aria-label="Buscar filmes"
              placeholder="Qual filme você quer descobrir?"
              value={params.get('q') || ''}
              onChange={(e) => change('q', e.target.value)}
            />
          </label>
        </div>
        <CatalogFilters filters={filters.data} params={params} onChange={change} />
        <div className="results-bar">
          <p aria-live="polite">
            {catalog.isFetching
              ? 'Buscando histórias…'
              : `${catalog.data?.total ?? 0} filmes para explorar`}
          </p>
          {active && (
            <button className="text-button" onClick={() => setParams({})}>
              Limpar filtros ×
            </button>
          )}
        </div>
        {catalog.isPending ? (
          <Loading />
        ) : catalog.isError ? (
          <div className="empty"><p>Não foi possível carregar os filmes.</p></div>
        ) : (
          <div aria-busy={catalog.isFetching}>
            <MovieGrid movies={catalog.data.items} />
            <Pagination
              page={page}
              pages={catalog.data.pages}
              onChange={(p) => change('page', String(p))}
            />
          </div>
        )}
      </section>
    </>
  )
}

function DeleteDialog({
  title,
  busy,
  onClose,
  onConfirm,
}: {
  title: string
  busy: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    ref.current?.showModal()
  }, [])
  return (
    <dialog
      ref={ref}
      aria-labelledby="delete-title"
      onCancel={(e) => {
        e.preventDefault()
        if (!busy) onClose()
      }}
    >
      <h2 id="delete-title">Remover este filme?</h2>
      <p>“{title}” e suas avaliações serão removidos permanentemente.</p>
      <div className="dialog-actions">
        <button autoFocus className="button secondary" disabled={busy} onClick={onClose}>
          Cancelar
        </button>
        <button className="button danger" disabled={busy} onClick={onConfirm}>
          {busy ? 'Removendo…' : 'Remover filme'}
        </button>
      </div>
    </dialog>
  )
}

export function DetailPage() {
  const { id = '' } = useParams()
  const { username } = useAuth()
  const client = useQueryClient()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [success, setSuccess] = useState(false)
  const movie = useQuery({
    queryKey: ['movies', 'detail', id],
    queryFn: ({ signal }) => api.movie(id, signal),
  })
  const reviews = useQuery({
    queryKey: ['movies', 'reviews', id, page],
    queryFn: ({ signal }) => api.reviews(id, page, signal),
  })
  const remove = useMutation({
    mutationFn: () => api.remove(id),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['movies'] })
      navigate('/')
    },
  })
  const review = useMutation({
    mutationFn: (data: ReviewInput) => api.review(id, data),
    onSuccess: async () => {
      setPage(1)
      setSuccess(true)
      await client.invalidateQueries({ queryKey: ['movies'] })
    },
  })
  if (movie.isPending) return <Loading />
  if (movie.isError) return <div className="empty"><p>Não foi possível carregar o filme.</p></div>
  return (
    <>
      <div className="page-toolbar">
        <Link className="back-link" to="/">
          ← Voltar ao catálogo
        </Link>
        {username && (
          <div className="toolbar-actions">
            <Link className="button secondary" to={`/filmes/${id}/editar`}>
              Editar filme
            </Link>
            <button className="text-button danger-text" onClick={() => setRemoveOpen(true)}>
              Remover
            </button>
          </div>
        )}
      </div>
      <MovieDetails movie={movie.data} />
      <section className="reviews-section">
        <div className="reviews-list">
          <p className="eyebrow">DEPOIS DOS CRÉDITOS</p>
          <h2>
            Outros olhares <span className="count">{movie.data.total_avaliacoes}</span>
          </h2>
          {reviews.isPending ? (
            <Loading />
          ) : reviews.isError ? (
            <div className="empty"><p>Não foi possível carregar as avaliações.</p></div>
          ) : (
            <>
              {reviews.data.items.length ? (
                reviews.data.items.map((item) => (
                  <article className="review-card" key={item.sk_movie_review_id}>
                    <div className="review-header">
                      <div className="avatar" aria-hidden="true">
                        {item.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <strong>{item.nome}</strong>
                        <time dateTime={item.created_at}>
                          {new Date(
                            item.created_at.endsWith('Z') ? item.created_at : item.created_at + 'Z',
                          ).toLocaleDateString('pt-BR')}
                        </time>
                      </div>
                      <Rating value={item.nota} />
                    </div>
                    <p>{item.comentario}</p>
                  </article>
                ))
              ) : (
                <div className="empty compact">
                  <h3>A conversa começa com um olhar.</h3>
                  <p>Este filme ainda não recebeu avaliações.</p>
                </div>
              )}
              <Pagination page={page} pages={reviews.data.pages} onChange={setPage} />
            </>
          )}
        </div>
        <aside className="review-aside">
          {username ? (
            <>
              {success && (
                <p role="status" className="success">
                  Avaliação publicada. Obrigado pelo seu olhar!
                </p>
              )}
              <ReviewForm
                key={review.data?.sk_movie_review_id || 'new'}
                onSubmit={(data) => {
                  setSuccess(false)
                  review.mutate(data)
                }}
                busy={review.isPending}
                name={username}
              />
            </>
          ) : (
            <div className="login-invitation">
              <span aria-hidden="true">✳</span>
              <h3>Qual é a sua perspectiva?</h3>
              <p>Entre como administrador para adicionar uma nota e uma resenha.</p>
              <Link className="button primary" to="/entrar" state={{ from: `/filmes/${id}` }}>
                Entrar para avaliar ↗
              </Link>
            </div>
          )}
        </aside>
      </section>
      {removeOpen && (
        <DeleteDialog
          title={movie.data.titulo}
          busy={remove.isPending}
          onClose={() => {
            setRemoveOpen(false)
            remove.reset()
          }}
          onConfirm={() => remove.mutate()}
        />
      )}
    </>
  )
}

export function EditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const client = useQueryClient()
  const movie = useQuery({
    queryKey: ['movies', 'detail', id],
    queryFn: ({ signal }) => api.movie(id!, signal),
    enabled: Boolean(id),
  })
  const save = useMutation({
    mutationFn: (data: MovieInput) => (id ? api.update(id, data) : api.create(data)),
    onSuccess: async (movie) => {
      await client.invalidateQueries({ queryKey: ['movies'] })
      navigate(`/filmes/${movie.sk_movie_id}`)
    },
  })
  if (id && movie.isPending) return <Loading />
  if (id && movie.isError) return <div className="empty"><p>Não foi possível carregar o filme.</p></div>
  return (
    <div className="editor-page">
      <Link className="back-link" to={id ? `/filmes/${id}` : '/'}>
        ← Cancelar e voltar
      </Link>
      <p className="eyebrow">CURADORIA DO CATÁLOGO</p>
      <h1>{id ? 'Um novo corte.' : 'Mais uma boa história.'}</h1>
      <p className="page-description">
        {id ? 'Atualize as informações deste filme.' : 'Adicione um filme ao universo Plano.'}
      </p>
      <MovieForm
        key={id || 'new'}
        initial={id ? movie.data : undefined}
        onSubmit={(data) => save.mutate(data)}
        busy={save.isPending}
      />
    </div>
  )
}

export function LoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const candidate = location.state?.from
  const from =
    typeof candidate === 'string' &&
    candidate.startsWith('/') &&
    !candidate.startsWith('//') &&
    candidate !== '/entrar'
      ? candidate
      : '/'
  const login = useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      api.login(username, password),
    onSuccess: (data) => {
      auth.login(data.access_token, data.username)
      navigate(from, { replace: true })
    },
  })
  if (auth.username) return <Navigate to={from} replace />
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    login.mutate({
      username: String(fields.get('username')),
      password: String(fields.get('password')),
    })
  }
  return (
    <div className="login-page">
      <div className="login-copy">
        <p className="eyebrow">NOS BASTIDORES DO PLANO</p>
        <h1>
          Grandes histórias.
          <br />
          <em>Boas escolhas.</em>
        </h1>
        <p>
          Seu espaço para cuidar do catálogo
          <br />e compartilhar um olhar sobre o cinema.
        </p>
        <span className="login-art" aria-hidden="true">
          ◒
        </span>
      </div>
      <form className="login-form" onSubmit={submit}>
        <p className="eyebrow">ÁREA DO ADMINISTRADOR</p>
        <h2>Bom ter você aqui.</h2>
        <p>Entre para continuar sua curadoria.</p>
        <label>
          Usuário
          <input name="username" autoComplete="username" autoFocus />
        </label>
        <label>
          Senha
          <input
            name="password"
            type="password"
            autoComplete="current-password"
          />
        </label>
        <button className="button primary" disabled={login.isPending}>
          {login.isPending ? 'Entrando…' : 'Entrar'} ↗
        </button>
        <Link className="back-link" to="/">
          ← Explorar sem entrar
        </Link>
      </form>
    </div>
  )
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<CatalogPage />} />
        <Route path="/entrar" element={<LoginPage />} />
        <Route
          path="/filmes/novo"
          element={
            <Protected>
              <EditorPage />
            </Protected>
          }
        />
        <Route
          path="/filmes/:id/editar"
          element={
            <Protected>
              <EditorPage />
            </Protected>
          }
        />
        <Route path="/filmes/:id" element={<DetailPage />} />
        <Route
          path="*"
          element={
            <div className="empty">
              <h1>Cena não encontrada.</h1>
              <Link className="button primary" to="/">
                Voltar ao catálogo
              </Link>
            </div>
          }
        />
      </Routes>
    </Layout>
  )
}
