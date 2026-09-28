import type { Preview } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router-dom'
import '../src/styles.css'

const preview: Preview = {
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div style={{ padding: 24, maxWidth: 1100 }}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
  parameters: { layout: 'fullscreen' },
}
export default preview
