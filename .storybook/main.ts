import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  staticDirs: ['../public'],
  addons: [
    '@storybook/addon-a11y',
    '@storybook/addon-vitest',
    '@storybook/addon-mcp',
    'msw-storybook-addon',
  ],
  features: { componentsManifest: true },
};

export default config;
