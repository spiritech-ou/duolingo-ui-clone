import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/App';
import { onNonJsonResponse } from '@/api/client';
import { bootstrap } from '@/bootstrap';
import { env } from '@/config/env';
import '@/styles/main.scss';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

void bootstrap({
  useMocks: env.VITE_USE_MOCKS,
  loadWorker: async () => (await import('@/mocks/browser')).worker,
  render: () => {
    createRoot(container).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  },
  onNonJsonResponse,
  doc: document,
  win: window,
});
