import type { Meta, StoryObj } from '@storybook/react-vite'
import { MovieGrid } from './Catalog'
import { movie } from '../test/fixtures'

const meta = {
  title: 'Catálogo/Grade de filmes',
  component: MovieGrid,
  parameters: {
    docs: {
      description: {
        component:
          'Grade responsiva com links para a ficha e média de 0–10.',
      },
    },
  },
} satisfies Meta<typeof MovieGrid>
export default meta
type Story = StoryObj<typeof meta>
export const Catalogo: Story = {
  args: {
    movies: [
      movie,
      {
        ...movie,
        sk_movie_id: 'c'.repeat(64),
        titulo: 'Entre marés',
        nota_media: null,
        total_avaliacoes: 0,
      },
    ],
  },
}
export const Vazio: Story = { args: { movies: [] } }
