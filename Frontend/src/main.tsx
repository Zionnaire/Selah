import '@fontsource-variable/inter';
import '@fontsource-variable/literata';
import '@fontsource-variable/literata/wght-italic.css';
import '@fontsource-variable/noto-serif-hebrew';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/600-italic.css';
import '@selah/tokens/tokens.css';
import './styles/base.css';
import './styles/shell.css';
import './styles/pages.css';
import './styles/reader.css';
import './styles/sermons.css';
import './styles/pulpit.css';
import './styles/library.css';
import './styles/study.css';
import './styles/words.css';
import './styles/auth.css';
import './styles/sync.css';
import './styles/suggest.css';
import './styles/collapse.css';
import './styles/landing.css';
import './styles/legal.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App';
import { ErrorBoundary } from './app/ErrorBoundary';
import { initTheme } from './lib/theme';

initTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
