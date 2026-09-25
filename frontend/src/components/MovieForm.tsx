import type { FormEvent } from 'react'
import type { Movie, MovieInput } from '../types'

const split = (text: string) => [
  ...new Set(
    text
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  ),
]
export function MovieForm({
  initial,
  onSubmit,
  busy = false,
}: {
  initial?: Movie
  onSubmit: (data: MovieInput) => void
  busy?: boolean
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const get = (key: string) => String(fields.get(key) || '').trim()
    const data: MovieInput = {
      titulo: get('titulo'),
      ano_lancamento: Number(get('ano')),
      diretores: split(get('diretores')),
      generos: split(get('generos')),
      produtoras: split(get('produtoras')),
      sinopse: get('sinopse'),
      duracao_minutos: get('duracao') ? Number(get('duracao')) : null,
      data_lancamento: get('data') || null,
      status_filme: get('status') || null,
      url_poster: initial?.url_poster || null,
      url_backdrop: initial?.url_backdrop || null,
      pessoas: [
        ...split(get('elenco')).map((nome_pessoa) => ({
          nome_pessoa,
          tipo_pessoa: 'Ator' as const,
        })),
        ...split(get('roteiro')).map((nome_pessoa) => ({
          nome_pessoa,
          tipo_pessoa: 'Roteirista' as const,
        })),
      ],
    }
    onSubmit(data)
  }
  return (
    <form className="movie-form" onSubmit={submit}>
      <fieldset disabled={busy}>
        <legend>Informações do filme</legend>
        <p className="muted">Campos com * são obrigatórios. Separe nomes e gêneros por vírgulas.</p>
        <div className="form-grid">
          <label className="wide">
            Título *<input name="titulo" defaultValue={initial?.titulo} />
          </label>
          <label>
            Direção *
            <input
              name="diretores"
              defaultValue={initial?.diretores.join(', ')}
              placeholder="Nome do diretor"
            />
          </label>
          <label>
            Gêneros *
            <input
              name="generos"
              defaultValue={initial?.generos.join(', ')}
              placeholder="Drama, Ficção científica"
            />
          </label>
          <label>
            Ano de lançamento *
            <input
              name="ano"
              type="number"
              defaultValue={initial?.ano_lancamento ?? ''}
            />
          </label>
          <label>
            Duração (minutos)
            <input
              name="duracao"
              type="number"
              defaultValue={initial?.duracao_minutos ?? ''}
            />
          </label>
          <label>
            Data de lançamento
            <input name="data" type="date" defaultValue={initial?.data_lancamento || ''} />
          </label>
          <label>
            Status
            <input
              name="status"
              defaultValue={initial?.status_filme || ''}
              placeholder="Lançado"
            />
          </label>
          <label className="wide">
            Sinopse *
            <textarea
              name="sinopse"
              rows={5}
              defaultValue={initial?.sinopse || ''}
            />
          </label>
          <label className="wide">
            Produtoras
            <input name="produtoras" defaultValue={initial?.produtoras.join(', ')} />
          </label>
          <label>
            Elenco
            <input
              name="elenco"
              defaultValue={initial?.pessoas
                .filter((p) => p.tipo_pessoa === 'Ator')
                .map((p) => p.nome_pessoa)
                .join(', ')}
            />
          </label>
          <label>
            Roteiro
            <input
              name="roteiro"
              defaultValue={initial?.pessoas
                .filter((p) => p.tipo_pessoa === 'Roteirista')
                .map((p) => p.nome_pessoa)
                .join(', ')}
            />
          </label>
        </div>
      </fieldset>
      <div className="form-actions">
        <span className="muted">Seu catálogo, seu olhar.</span>
        <button className="button primary" disabled={busy}>
          {busy ? 'Salvando…' : initial ? 'Salvar alterações' : 'Cadastrar filme'}{' '}
          <span aria-hidden="true">↗</span>
        </button>
      </div>
    </form>
  )
}
