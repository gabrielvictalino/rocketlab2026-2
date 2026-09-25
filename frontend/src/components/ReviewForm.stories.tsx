import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ReviewForm } from './ReviewForm'

const meta = {
  title: 'Formulários/Avaliação',
  component: ReviewForm,
  args: { onSubmit: fn(), name: 'Admin' },
} satisfies Meta<typeof ReviewForm>
export default meta
type Story = StoryObj<typeof meta>
export const Padrao: Story = {}
export const Publicando: Story = { args: { busy: true } }
