import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { MovieForm } from './MovieForm'
import { movie } from '../test/fixtures'

const meta = {
  title: 'Formulários/Filme',
  component: MovieForm,
  args: { onSubmit: fn() },
} satisfies Meta<typeof MovieForm>
export default meta
type Story = StoryObj<typeof meta>
export const Cadastro: Story = {}
export const Edicao: Story = { args: { initial: movie } }
export const Salvando: Story = { args: { initial: movie, busy: true } }
