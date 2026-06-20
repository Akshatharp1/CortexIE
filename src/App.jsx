import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import CreateSandbox from './pages/CreateSandbox.jsx'
import Environments from './pages/Environments.jsx'
import EnvironmentDetail from './pages/EnvironmentDetail.jsx'
import Products from './pages/Products.jsx'
import Monitoring from './pages/Monitoring.jsx'
import Settings from './pages/Settings.jsx'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/create" element={<CreateSandbox />} />
        <Route path="/environments" element={<Environments />} />
        <Route path="/environments/:id" element={<EnvironmentDetail />} />
        <Route path="/products" element={<Products />} />
        <Route path="/monitoring" element={<Monitoring />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  )
}
