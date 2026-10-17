import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { ClerkBridgeProvider } from './components/auth/ClerkBridge';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkBridgeProvider>
      <App />
    </ClerkBridgeProvider>
  </StrictMode>,
);

export default App;
