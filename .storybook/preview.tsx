import type { Decorator, Preview } from '@storybook/react-vite';
import { mswLoader } from 'msw-storybook-addon/csf3';
import '../src/styles/main.scss';

const withTheme: Decorator = (Story, context) => {
  const theme = context.globals['theme'] === 'light' ? 'light' : 'dark';
  document.documentElement.dataset['theme'] = theme;
  return <Story />;
};

const preview: Preview = {
  decorators: [withTheme],
  loaders: [mswLoader()],
  globalTypes: {
    theme: {
      description: 'Colour theme',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'dark' },
  parameters: {
    layout: 'centered',
    a11y: { test: 'error' },
  },
};

export default preview;
