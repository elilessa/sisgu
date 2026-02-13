import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'

console.log('🚀 Tentando montar React no #root');
const rootElement = document.getElementById('root');
if (!rootElement) console.error('❌ Elemento #root não encontrado!');

try {
  ReactDOM.createRoot(rootElement as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error('❌ Falha fatal ao montar React:', error);
}