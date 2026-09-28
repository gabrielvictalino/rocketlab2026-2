export interface Person {
  nome_pessoa: string
  tipo_pessoa: 'Ator' | 'Diretor' | 'Roteirista'
}

export interface MovieInput {
  titulo: string
  ano_lancamento: number
  diretores: string[]
  generos: string[]
  sinopse: string
  produtoras: string[]
  pessoas: Person[]
  data_lancamento: string | null
  duracao_minutos: number | null
  status_filme: string | null
  url_poster: string | null
  url_backdrop: string | null
}

export interface Movie extends Omit<MovieInput, 'ano_lancamento' | 'sinopse'> {
  sk_movie_id: string
  id_filme: string
  ano_lancamento: number | null
  sinopse: string | null
  nota_media: number | null
  total_avaliacoes: number
  performance?: Record<string, number | string | null> | null
}

export interface ReviewInput {
  nome: string
  nota: number
  comentario: string
}
export interface Review extends ReviewInput {
  sk_movie_review_id: string
  sk_movie_id: string
  created_at: string
}
export interface Page<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  pages: number
}
export interface Filters {
  generos: string[]
  produtoras: string[]
  anos: number[]
}
