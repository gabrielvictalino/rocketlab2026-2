import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.tsx'],
  addons: ['@storybook/addon-docs'],
  framework: { name: '@storybook/react-vite', options: { builder: { configLoader: 'native' } } },
  staticDirs: ['../public'],
  core: { disableTelemetry: true },
}
export default config
