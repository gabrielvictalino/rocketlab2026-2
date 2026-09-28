import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'

export function Layout({ children }: { children: ReactNode }) {
  const { username, logout } = useAuth()
  const navigate = useNavigate()
  return (
    <>
      <a className="skip-link" href="#main">
        Pular para o conteúdo
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" to="/" aria-label="Plano, início">
            <span className="brand-icon" aria-hidden="true">
              ◒
            </span>{' '}
            plano<span className="brand-dot">.</span>
          </Link>
          <nav className="main-nav" aria-label="Navegação principal">
            <Link to="/">Explorar filmes</Link>
            {username && <Link to="/filmes/novo">+ Novo filme</Link>}
          </nav>
          <div className="header-actions">
            {username ? (
              <button
                className="button secondary small"
                onClick={() => {
                  logout()
                  navigate('/')
                }}
              >
                Sair <span aria-hidden="true">↗</span>
              </button>
            ) : (
              <Link className="button secondary small" to="/entrar">
                Área admin <span aria-hidden="true">↗</span>
              </Link>
            )}
          </div>
        </div>
      </header>
      <main id="main" className="container">
        {children}
      </main>
      <footer className="site-footer">
        <Link className="brand" to="/">
          plano.
        </Link>
        <span>Histórias que merecem outro olhar.</span>
        <small>ROCKETLAB · 2026.2</small>
      </footer>
    </>
  )
}
