import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { MovieForm } from '../components/MovieForm'
import { ReviewForm } from '../components/ReviewForm'
import { MovieGrid } from '../components/Catalog'
import { MovieDetails } from '../components/MovieDetails'
import { Rating } from '../components/shared'
import { movie } from './fixtures'

describe('catálogo e ficha', () => {
  it('exibe título, direção, nota e link do filme', () => {
    render(
      <MemoryRouter>
        <MovieGrid movies={[movie]} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: /ver além do horizonte/i })).toHaveAttribute(
      'href',
      `/filmes/${movie.sk_movie_id}`,
    )
    expect(screen.getByText('Marina Costa')).toBeVisible()
    expect(screen.getByText('8.0')).toBeVisible()
  })
  it('explica o resultado vazio', () => {
    render(<MovieGrid movies={[]} />)
    expect(screen.getByRole('heading', { name: /nenhum filme/i })).toBeVisible()
  })
  it('distingue nota zero de filme sem avaliações', () => {
    const { rerender } = render(<Rating value={0} />)
    expect(screen.getByText('0.0')).toBeVisible()
    rerender(<Rating value={null} />)
    expect(screen.getByText('Sem nota')).toBeVisible()
  })
  it('apresenta sinopse e métricas completas', async () => {
    render(<MovieDetails movie={movie} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(movie.titulo)
    expect(screen.getByText(movie.sinopse!)).toBeVisible()
    await userEvent.click(screen.getByText('Bilheteria e outras métricas'))
    expect(screen.getByText('1.200.000')).toBeVisible()
  })
})

describe('formulários', () => {
  it('envia edição e preserva elenco, roteiro e campos opcionais', async () => {
    const submit = vi.fn()
    render(
      <MovieForm
        initial={{ ...movie, pessoas: [{ nome_pessoa: 'Ana', tipo_pessoa: 'Ator' }] }}
        onSubmit={submit}
      />,
    )
    const title = screen.getByLabelText('Título *')
    await userEvent.clear(title)
    await userEvent.type(title, 'Novo título')
    await userEvent.click(screen.getByRole('button', { name: /salvar alterações/i }))
    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({
        titulo: 'Novo título',
        ano_lancamento: 2026,
        generos: ['Drama', 'Aventura'],
        pessoas: [{ nome_pessoa: 'Ana', tipo_pessoa: 'Ator' }],
        data_lancamento: '2026-01-15',
      }),
    )
  })
  it('aceita nota zero e resenha na escala 0–10', async () => {
    const submit = vi.fn()
    render(<ReviewForm name="Ana" onSubmit={submit} />)
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Nota (0 a 10)' }), {
      target: { value: '0' },
    })
    await userEvent.type(screen.getByLabelText('Resenha *'), 'Minha avaliação')
    await userEvent.click(screen.getByRole('button', { name: /publicar avaliação/i }))
    expect(submit).toHaveBeenCalledWith({ nome: 'Ana', nota: 0, comentario: 'Minha avaliação' })
  })
  it('desabilita envio em andamento', () => {
    render(<ReviewForm onSubmit={vi.fn()} busy />)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
