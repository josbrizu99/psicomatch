import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Manejar errores globales no capturados
window.addEventListener('error', (event) => {
  // Filtrar errores de extensiones del navegador
  if (
    event.message?.includes('message channel closed') ||
    event.message?.includes('asynchronous response') ||
    event.message?.includes('Extension context invalidated')
  ) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
});

// Manejar promesas rechazadas no manejadas
window.addEventListener('unhandledrejection', (event) => {
  // Filtrar errores de extensiones del navegador
  const errorMessage = event.reason?.message || event.reason?.toString() || '';
  if (
    errorMessage.includes('message channel closed') ||
    errorMessage.includes('asynchronous response') ||
    errorMessage.includes('Extension context invalidated')
  ) {
    event.preventDefault();
    return false;
  }
  
  // Para otros errores, loguear pero no mostrar en consola si es un error conocido
  if (errorMessage.includes('message channel closed')) {
    event.preventDefault();
    return false;
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

// Registrar Service Worker para PWA (solo en producción)
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('Service Worker registrado exitosamente:', registration.scope);
      })
      .catch((error) => {
        console.log('Error al registrar Service Worker:', error);
      });
  });
}
