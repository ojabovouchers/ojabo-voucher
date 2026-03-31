import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './components/AppProvider'
import Login from './pages/Login'
import AdminLayout from './pages/admin/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import Clientes from './pages/admin/Clientes'
import Operadores from './pages/admin/Operadores'
import Relatorios from './pages/admin/Relatorios'
import Configuracoes from './pages/admin/Configuracoes'
import Operador from './pages/operator/Operador'
import ChavesPix from './pages/admin/ChavesPix'
import Perfil from './pages/admin/Perfil'
import DevLogin from './pages/dev/DevLogin'
import DevPanel from './pages/dev/DevPanel'
import Instalar from './pages/Instalar'
import ValidarVoucher from './pages/admin/ValidarVoucher'
import EsqueciSenha from './pages/EsqueciSenha'
import RedefinirSenha from './pages/RedefinirSenha'
import './styles/global.css'

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/esqueci-senha" element={<EsqueciSenha />} />
          <Route path="/redefinir-senha" element={<RedefinirSenha />} />
          <Route path="/operador" element={<Operador />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="operadores" element={<Operadores />} />
            <Route path="relatorios" element={<Relatorios />} />
            <Route path="configuracoes" element={<Configuracoes />} />
            <Route path="chaves-pix" element={<ChavesPix />} />
            <Route path="perfil" element={<Perfil />} />
            <Route path="validar" element={<ValidarVoucher />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
          <Route path="/dev/login" element={<DevLogin />} />
          <Route path="/instalar" element={<Instalar />} />
          <Route path="/dev" element={<DevPanel />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  )
}
