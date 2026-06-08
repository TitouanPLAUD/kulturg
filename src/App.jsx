import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import { banState } from './utils/ban.js'
import BanScreen from './components/BanScreen.jsx'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import QCM from './pages/QCM.jsx'
import Duel from './pages/Duel.jsx'
import CoupDeMaitre from './pages/CoupDeMaitre.jsx'
import MotMysterieux from './pages/MotMysterieux.jsx'
import EtoileMysterieuse from './pages/EtoileMysterieuse.jsx'
import Revision from './pages/Revision.jsx'
import Profil from './pages/Profil.jsx'
import AdminPanel from './pages/AdminPanel.jsx'
import Auth from './pages/Auth.jsx'
import Amis from './pages/Amis.jsx'
import TvLanding from './pages/TvLanding.jsx'
import TvGame from './pages/TvGame.jsx'
import Classement from './pages/Classement.jsx'
import Multijoueur from './pages/Multijoueur.jsx'
import DuelGame from './pages/DuelGame.jsx'
import RaceGame from './pages/RaceGame.jsx'
import Reglages from './pages/Reglages.jsx'
import Chat from './pages/Chat.jsx'

export default function App() {
  const { profile } = useAuth()
  const ban = banState(profile)

  // Re-render automatique à l'expiration d'un timeout (sans event DB)
  const [, force] = useState(0)
  useEffect(() => {
    if (ban.active && !ban.permanent && ban.until) {
      const ms = ban.until.getTime() - Date.now()
      const t = setTimeout(() => force(x => x + 1), Math.max(0, ms) + 500)
      return () => clearTimeout(t)
    }
  }, [ban.active, ban.permanent, ban.until?.getTime()])

  // Joueur sanctionné → tout est bloqué, où qu'il soit dans l'app
  if (ban.active) return <BanScreen ban={ban} />

  return (
    <Routes>
      <Route path="auth" element={<Auth />} />
      <Route path="tv/:code" element={<TvGame />} />
      <Route path="pvp/:code" element={<DuelGame />} />
      <Route path="race/:code" element={<RaceGame />} />
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
        <Route path="chat" element={<Chat />} />
        <Route path="chat/:id" element={<Chat />} />
        <Route path="classement" element={<Classement />} />
        <Route path="multi" element={<Multijoueur />} />
        <Route path="tv" element={<TvLanding />} />
        <Route path="admin" element={<AdminPanel />} />
        <Route path="reglages" element={<Reglages />} />
      </Route>
    </Routes>
  )
}
