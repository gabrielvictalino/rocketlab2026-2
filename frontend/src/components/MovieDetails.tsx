import type { Movie } from '../types'
import { Poster, Rating } from './shared'

const labels: Record<string, string> = {
  orcamento_usd: 'Orçamento (USD)',
  receita_usd: 'Receita (USD)',
  lucro_usd: 'Lucro (USD)',
  orcamento_brl: 'Orçamento (BRL)',
  receita_brl: 'Receita (BRL)',
  lucro_brl: 'Lucro (BRL)',
  popularidade: 'Popularidade',
  nota_tmdb: 'Nota TMDB',
  qtd_tmdb: 'Votos TMDB',
  nota_imdb: 'Nota IMDb',
  qtd_imdb: 'Votos IMDb',
}
export function MovieDetails({ movie }: { movie: Movie }) {
  return (
    <section className="detail-hero">
      <Poster movie={movie} large />
      <div className="detail-info">
        <p className="eyebrow">EM CARTAZ NO SEU CATÁLOGO</p>
        <h1>{movie.titulo}</h1>
        <p className="detail-meta">
          {movie.ano_lancamento || 'Ano não informado'}
          {movie.duracao_minutos ? ` · ${movie.duracao_minutos} min` : ''}
          {movie.status_filme ? ` · ${movie.status_filme}` : ''}
        </p>
        <p className="director">
          Direção de <strong>{movie.diretores.join(', ') || 'não informada'}</strong>
        </p>
        <div className="genre-tags">
          {movie.generos.map((g) => (
            <span key={g}>{g}</span>
          ))}
        </div>
        <div className="detail-rating">
          <Rating value={movie.nota_media} count={movie.total_avaliacoes} />
        </div>
        <h2>Uma história para descobrir</h2>
        <p className="synopsis">{movie.sinopse || 'Sinopse ainda não disponível.'}</p>
        <dl className="credits">
          <div>
            <dt>Produtoras</dt>
            <dd>{movie.produtoras.join(', ') || 'Não informadas'}</dd>
          </div>
          {(['Ator', 'Roteirista'] as const).map((role) => (
            <div key={role}>
              <dt>{role === 'Ator' ? 'Elenco' : 'Roteiro'}</dt>
              <dd>
                {movie.pessoas
                  .filter((p) => p.tipo_pessoa === role)
                  .map((p) => p.nome_pessoa)
                  .join(', ') || 'Não informado'}
              </dd>
            </div>
          ))}
          {movie.data_lancamento && (
            <div>
              <dt>Lançamento</dt>
              <dd>{new Date(movie.data_lancamento + 'T12:00:00').toLocaleDateString('pt-BR')}</dd>
            </div>
          )}
        </dl>
        {movie.performance && (
          <details className="performance">
            <summary>Bilheteria e outras métricas</summary>
            <dl className="credits">
              {Object.entries(movie.performance).map(([key, value]) => (
                <div key={key}>
                  <dt>{labels[key] || key}</dt>
                  <dd>
                    {value == null
                      ? '—'
                      : Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                  </dd>
                </div>
              ))}
            </dl>
          </details>
        )}
      </div>
    </section>
  )
}
