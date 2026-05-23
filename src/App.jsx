import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import QCM from './pages/QCM.jsx'
import Duel from './pages/Duel.jsx'
import CoupDeMaitre from './pages/CoupDeMaitre.jsx'
import MotMysterieux from './pages/MotMysterieux.jsx'
import EtoileMysterieuse from './pages/EtoileMysterieuse.jsx'
import Revision from './pages/Revision.jsx'
import Profil from './pages/Profil.jsx'
import Admin from './pages/Admin.jsx'
import Auth from './pages/Auth.jsx'
import Amis from './pages/Amis.jsx'
import TvLanding from './pages/TvLanding.jsx'
import TvGame from './pages/TvGame.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="auth" element={<Auth />} />
      <Route path="tv/:code" element={<TvGame />} />
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="qcm" element={<QCM />} />
        <Route path="duel" element={<Duel />} />
        <Route path="coup-de-maitre" element={<CoupDeMaitre />} />
        <Route path="mot" element={<MotMysterieux />} />
        <Route path="etoile" element={<EtoileMysterieuse />} />
        <Route path="revision" element={<Revision />} />
        <Route path="profil" element={<Profil />} />
        <Route path="amis" element={<Amis />} />
        <Route path="tv" element={<TvLanding />} />
        <Route path="admin" element={<Admin />} />
      </Route>
    </Routes>
  )
}
