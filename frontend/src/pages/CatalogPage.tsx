import { useEffect, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { CatalogFilters, MovieGrid } from '../components/Catalog'
import { Loading, Pagination } from '../components/shared'

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
