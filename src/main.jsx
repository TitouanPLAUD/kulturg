import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { GameProvider } from './context/GameContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { SettingsProvider } from './context/SettingsContext.jsx'
import { loadCommunityQuestions } from './data/communityQuestions.js'

// Charge les questions validées par les fondateurs (non bloquant)
loadCommunityQuestions()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <SettingsProvider>
        <AuthProvider>
          <GameProvider>
            <App />
          </GameProvider>
        </AuthProvider>
      </SettingsProvider>
    </BrowserRouter>
  </StrictMode>,
)
