import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Installing the app is what keeps localStorage alive: iOS Safari evicts
// storage for sites not visited in 7 days, but not for one added to the Home
// Screen. The worker also makes the app usable offline.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // 登録に失敗してもアプリ自体は通常どおり動作する
    });
  });
}
