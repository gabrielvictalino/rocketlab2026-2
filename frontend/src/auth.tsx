import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { setToken } from './api'

interface Auth {
  username: string | null
  login: (token: string, username: string) => void
  logout: () => void
}
const Context = createContext<Auth | null>(null)
export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null)
  function logout() {
    setToken(null)
    setUsername(null)
  }
  useEffect(() => {
    window.addEventListener('auth-expired', logout)
    return () => window.removeEventListener('auth-expired', logout)
  }, [])
  return (
    <Context.Provider
      value={{
        username,
        logout,
        login: (token, name) => {
          setToken(token)
          setUsername(name)
        },
      }}
    >
      {children}
    </Context.Provider>
  )
}
export function useAuth() {
  const auth = useContext(Context)
  if (!auth) throw new Error('AuthProvider ausente')
  return auth
}
export function Protected({ children }: { children: ReactNode }) {
  const { username } = useAuth()
  const location = useLocation()
  return username ? children : <Navigate to="/entrar" state={{ from: location.pathname }} replace />
}
