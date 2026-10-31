import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/App';
import { env } from '@/config/env';
import '@/styles/main.scss';

async function enableMocking(): Promise<void> {
  if (!env.VITE_USE_MOCKS) return;
  const { worker } = await import('@/mocks/browser');
  await worker.start({ onUnhandledFrame: 'bypass' });
}

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

void enableMocking().then(() => {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
