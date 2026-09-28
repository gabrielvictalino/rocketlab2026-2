import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { MovieForm } from '../components/MovieForm'
import { Loading } from '../components/shared'
import type { MovieInput } from '../types'

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
