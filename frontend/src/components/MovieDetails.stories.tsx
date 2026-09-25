import type { Meta, StoryObj } from '@storybook/react-vite'
import { MovieDetails } from './MovieDetails'
import { movie } from '../test/fixtures'

const meta = { title: 'Filme/Ficha completa', component: MovieDetails } satisfies Meta<
  typeof MovieDetails
>
export default meta
type Story = StoryObj<typeof meta>
export const Completa: Story = { args: { movie } }
export const SemAvaliacoes: Story = {
  args: { movie: { ...movie, nota_media: null, total_avaliacoes: 0, performance: null } },
}
