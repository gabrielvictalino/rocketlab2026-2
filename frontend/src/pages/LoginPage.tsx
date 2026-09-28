import type { FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'

export function LoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const candidate = location.state?.from
  const from =
    typeof candidate === 'string' &&
    candidate.startsWith('/') &&
    !candidate.startsWith('//') &&
    candidate !== '/entrar'
      ? candidate
      : '/'
  const login = useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      api.login(username, password),
    onSuccess: (data) => {
      auth.login(data.access_token, data.username)
      navigate(from, { replace: true })
    },
  })
  if (auth.username) return <Navigate to={from} replace />
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    login.mutate({
      username: String(fields.get('username')),
      password: String(fields.get('password')),
    })
  }
  return (
    <div className="login-page">
      <div className="login-copy">
        <p className="eyebrow">NOS BASTIDORES DO PLANO</p>
        <h1>
          Grandes histórias.
          <br />
          <em>Boas escolhas.</em>
        </h1>
        <p>
          Seu espaço para cuidar do catálogo
          <br />e compartilhar um olhar sobre o cinema.
        </p>
        <span className="login-art" aria-hidden="true">
          ◒
        </span>
      </div>
      <form className="login-form" onSubmit={submit}>
        <p className="eyebrow">ÁREA DO ADMINISTRADOR</p>
        <h2>Bom ter você aqui.</h2>
        <p>Entre para continuar sua curadoria.</p>
        <label>
          Usuário
          <input name="username" autoComplete="username" autoFocus />
        </label>
        <label>
          Senha
          <input
            name="password"
            type="password"
            autoComplete="current-password"
          />
        </label>
        <button className="button primary" disabled={login.isPending}>
          {login.isPending ? 'Entrando…' : 'Entrar'} ↗
        </button>
        <Link className="back-link" to="/">
          ← Explorar sem entrar
        </Link>
      </form>
    </div>
  )
}
