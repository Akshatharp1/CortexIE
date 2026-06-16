import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import CreateSandbox from './pages/CreateSandbox.jsx'
import Environments from './pages/Environments.jsx'
import EnvironmentDetail from './pages/EnvironmentDetail.jsx'
import Templates from './pages/Templates.jsx'
import Monitoring from './pages/Monitoring.jsx'
import CostOptimization from './pages/CostOptimization.jsx'
import AccessControl from './pages/AccessControl.jsx'
import Settings from './pages/Settings.jsx'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/create" element={<CreateSandbox />} />
        <Route path="/environments" element={<Environments />} />
        <Route path="/environments/:id" element={<EnvironmentDetail />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/monitoring" element={<Monitoring />} />
        <Route path="/cost" element={<CostOptimization />} />
        <Route path="/access" element={<AccessControl />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  )
}
