import { createContext, useContext, useState } from 'react'

const ChatWidgetCtx = createContext(null)

export function ChatWidgetProvider({ children }) {
  const [isOpen,      setIsOpen]      = useState(false)
  const [targetConvId, setTargetConvId] = useState(null)

  function openWidget(convId = null) {
    setTargetConvId(convId)
    setIsOpen(true)
  }

  function closeWidget() {
    setIsOpen(false)
  }

  return (
    <ChatWidgetCtx.Provider value={{ isOpen, setIsOpen, targetConvId, setTargetConvId, openWidget, closeWidget }}>
      {children}
    </ChatWidgetCtx.Provider>
  )
}

export function useChatWidget() {
  return useContext(ChatWidgetCtx)
}
