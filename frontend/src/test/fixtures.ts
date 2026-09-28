import type { Movie, Review } from '../types'
export const movie: Movie = {
  sk_movie_id: 'a'.repeat(64),
  id_filme: 'demo-1',
  titulo: 'Além do horizonte',
  ano_lancamento: 2026,
  data_lancamento: '2026-01-15',
  duracao_minutos: 118,
  status_filme: 'Lançado',
  sinopse:
    'Uma cartógrafa retorna à cidade onde nasceu e encontra um mapa que revela caminhos esquecidos.',
  diretores: ['Marina Costa'],
  generos: ['Drama', 'Aventura'],
  produtoras: ['Estúdio Horizonte'],
  pessoas: [{ nome_pessoa: 'Marina Costa', tipo_pessoa: 'Diretor' }],
  url_poster: null,
  url_backdrop: null,
  nota_media: 8,
  total_avaliacoes: 2,
  performance: { receita_usd: 1200000, orcamento_usd: 500000 },
}
export const review: Review = {
  sk_movie_review_id: 'b'.repeat(64),
  sk_movie_id: movie.sk_movie_id,
  nome: 'Ana',
  nota: 8,
  comentario: 'Uma história delicada, com imagens que ficam na memória.',
  created_at: '2026-01-20T12:00:00',
}
