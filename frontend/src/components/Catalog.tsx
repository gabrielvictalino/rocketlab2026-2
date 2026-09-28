import type { Filters, Movie } from '../types'
import { MovieCard } from './shared'

export function CatalogFilters({
  filters,
  params,
  onChange,
}: {
  filters?: Filters
  params: URLSearchParams
  onChange: (key: string, value: string) => void
}) {
  return (
    <div className="filters">
      <label>
        Gênero
        <select
          value={params.get('genero') || ''}
          onChange={(e) => onChange('genero', e.target.value)}
        >
          <option value="">Todos os gêneros</option>
          {filters?.generos.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
      </label>
      <label>
        Ano
        <select value={params.get('ano') || ''} onChange={(e) => onChange('ano', e.target.value)}>
          <option value="">Todos os anos</option>
          {filters?.anos.map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
      </label>
      <label>
        Produtora
        <select
          value={params.get('produtora') || ''}
          onChange={(e) => onChange('produtora', e.target.value)}
        >
          <option value="">Todas as produtoras</option>
          {filters?.produtoras.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label>
        Nota mínima
        <select
          value={params.get('nota_min') || ''}
          onChange={(e) => onChange('nota_min', e.target.value)}
        >
          <option value="">Qualquer nota</option>
          {[0, 5, 6, 7, 8, 9].map((n) => (
            <option key={n} value={n}>
              {n}+ / 10
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

export function MovieGrid({ movies }: { movies: Movie[] }) {
  if (!movies.length)
    return (
      <div className="empty">
        <span aria-hidden="true">◎</span>
        <h2>Nenhum filme por aqui.</h2>
        <p>Tente outra busca, ajuste os filtros ou cadastre o primeiro filme.</p>
      </div>
    )
  return (
    <div className="movie-grid">
      {movies.map((movie) => (
        <MovieCard key={movie.sk_movie_id} movie={movie} />
      ))}
    </div>
  )
}
