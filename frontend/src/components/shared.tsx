import { Link } from 'react-router-dom'
import type { Movie } from '../types'

export function Rating({ value, count }: { value: number | null; count?: number }) {
  return (
    <span className="rating">
      <span aria-hidden="true">★</span> {value == null ? 'Sem nota' : value.toFixed(1)}
      {value != null && <small>/ 10</small>}
      {count !== undefined && (
        <small>
          · {count} {count === 1 ? 'avaliação' : 'avaliações'}
        </small>
      )}
    </span>
  )
}

export function Poster({ movie, large = false }: { movie: Movie; large?: boolean }) {
  return (
    <div className={`poster ${large ? 'poster-large' : ''}`}>
      <div className="poster-fallback">
        <span>PLANO / CINEMA</span>
        <span className="poster-orbit" aria-hidden="true" />
        <strong>{movie.titulo}</strong>
        <small>{movie.ano_lancamento || 'ANO NÃO INFORMADO'}</small>
      </div>
    </div>
  )
}

export function MovieCard({ movie }: { movie: Movie }) {
  return (
    <article className="movie-card">
      <Link to={`/filmes/${movie.sk_movie_id}`} aria-label={`Ver ${movie.titulo}`}>
        <Poster movie={movie} />
        <div className="card-meta">
          <span>{movie.ano_lancamento || '—'}</span>
          <Rating value={movie.nota_media} />
        </div>
        <h3>{movie.titulo}</h3>
        <p>{movie.diretores.join(', ') || 'Direção não informada'}</p>
      </Link>
    </article>
  )
}

export function Pagination({
  page,
  pages,
  onChange,
}: {
  page: number
  pages: number
  onChange: (page: number) => void
}) {
  if (pages < 2 && page === 1) return null
  return (
    <nav className="pagination" aria-label="Paginação">
      <button className="button secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ← Anterior
      </button>
      <span>
        Página {page} de {Math.max(1, pages)}
      </span>
      <button
        className="button secondary"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        Próxima →
      </button>
    </nav>
  )
}

export function Loading() {
  return (
    <div role="status" className="loading">
      <span className="spinner" />
      Carregando cinema…
    </div>
  )
}
