import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './auth'
import App from './App'
import './styles.css'

const configured = Number(import.meta.env.VITE_QUERY_STALE_TIME_MS ?? 30000)
const client = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Number.isFinite(configured) && configured >= 0 ? configured : 30000,
      retry: 1,
    },
    mutations: { retry: false },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
