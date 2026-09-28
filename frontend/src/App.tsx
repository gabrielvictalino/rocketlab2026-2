import { Link, Route, Routes } from 'react-router-dom'
import { Protected } from './auth'
import { Layout } from './components/Layout'
import { CatalogPage } from './pages/CatalogPage'
import { DetailPage } from './pages/DetailPage'
import { EditorPage } from './pages/EditorPage'
import { LoginPage } from './pages/LoginPage'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<CatalogPage />} />
        <Route path="/entrar" element={<LoginPage />} />
        <Route
          path="/filmes/novo"
          element={
            <Protected>
              <EditorPage />
            </Protected>
          }
        />
        <Route
          path="/filmes/:id/editar"
          element={
            <Protected>
              <EditorPage />
            </Protected>
          }
        />
        <Route path="/filmes/:id" element={<DetailPage />} />
        <Route
          path="*"
          element={
            <div className="empty">
              <h1>Cena não encontrada.</h1>
              <Link className="button primary" to="/">
                Voltar ao catálogo
              </Link>
            </div>
          }
        />
      </Routes>
    </Layout>
  )
}
