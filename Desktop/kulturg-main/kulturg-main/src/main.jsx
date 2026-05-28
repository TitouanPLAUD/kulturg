import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { GameProvider } from './context/GameContext.jsx'
import { MultiplayerProvider } from './context/MultiplayerContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <GameProvider>
        <MultiplayerProvider>
          <App />
        </MultiplayerProvider>
      </GameProvider>
    </BrowserRouter>
  </StrictMode>,
)
