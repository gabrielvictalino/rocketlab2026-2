import { useState } from 'react'
import type { FormEvent } from 'react'
import type { ReviewInput } from '../types'

export function ReviewForm({
  onSubmit,
  busy = false,
  name = '',
}: {
  onSubmit: (data: ReviewInput) => void
  busy?: boolean
  name?: string
}) {
  const [rating, setRating] = useState('8')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const data = {
      nome: String(fields.get('nome')).trim(),
      nota: Number(rating),
      comentario: String(fields.get('comentario')).trim(),
    }
    onSubmit(data)
  }
  return (
    <form className="review-form" onSubmit={submit}>
      <fieldset disabled={busy}>
        <legend>Seu olhar sobre o filme</legend>
        <label>
          Nome *<input name="nome" defaultValue={name} />
        </label>
        <label className="score-label">
          Nota (0 a 10) *
          <output>
            {rating || '—'}
            <small> / 10</small>
          </output>
          <input
            name="nota"
            aria-label="Nota (0 a 10)"
            type="number"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
          />
        </label>
        <label>
          Resenha *
          <textarea
            name="comentario"
            rows={5}
            placeholder="O que ficou com você depois dos créditos?"
          />
        </label>
      </fieldset>
      <button className="button primary" disabled={busy}>
        {busy ? 'Publicando…' : 'Publicar avaliação'} ↗
      </button>
    </form>
  )
}
