import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { FormDebugProvider } from './context/FormDebugContext';
import { MenuRefreshProvider } from './context/MenuRefreshContext';
import { App } from './App';
import '@flowable/forms/flwforms.min.css';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <FormDebugProvider>
      <MenuRefreshProvider>
        <App />
      </MenuRefreshProvider>
    </FormDebugProvider>
  </BrowserRouter>
);
