import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { MovieDetails } from '../components/MovieDetails'
import { ReviewForm } from '../components/ReviewForm'
import { Loading, Pagination, Rating } from '../components/shared'
import type { ReviewInput } from '../types'

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
