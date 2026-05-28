import { createContext, useContext, useState, useRef } from 'react'

const ChatWidgetCtx = createContext(null)

export function ChatWidgetProvider({ children }) {
  const [isOpen,       setIsOpen]       = useState(false)
  const [targetConvId, setTargetConvId] = useState(null)

  // Référence vers openDM du hook useChat (enregistrée par ChatWidget au montage)
  const openDMRef = useRef(null)

  function registerOpenDM(fn) {
    openDMRef.current = fn
  }

  // Ouvrir le widget sur une conv existante
  function openWidget(convId = null) {
    setTargetConvId(convId)
    setIsOpen(true)
  }

  // Ouvrir un DM avec un ami (crée la conv si besoin, puis ouvre le widget)
  async function openDM(friendId) {
    if (!openDMRef.current) return
    const convId = await openDMRef.current(friendId)
    if (convId) openWidget(convId)
    return convId
  }

  function closeWidget() {
    setIsOpen(false)
  }

  return (
    <ChatWidgetCtx.Provider value={{
      isOpen, setIsOpen,
      targetConvId, setTargetConvId,
      openWidget, openDM, closeWidget,
      registerOpenDM,
    }}>
      {children}
    </ChatWidgetCtx.Provider>
  )
}

export function useChatWidget() {
  return useContext(ChatWidgetCtx)
}
