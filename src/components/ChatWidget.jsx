import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useChat } from '../hooks/useChat.js'
import { useChatWidget } from '../context/ChatWidgetContext.jsx'
import { supabase } from '../lib/supabase.js'
import Avatar from './Avatar.jsx'

export default function ChatWidget() {
  const { user } = useAuth()
  const { isOpen, setIsOpen, targetConvId, setTargetConvId, registerOpenDM } = useChatWidget()

  const {
    conversations, activeId, messages, profiles,
    loadingConvs, loadingMsgs,
    selectConversation, sendMessage, createGroup, openDM,
    convDisplayName, convAvatar, fmtTime,
  } = useChat()

  // Enregistrer openDM dans le contexte pour que d'autres pages puissent l'appeler
  useEffect(() => {
    registerOpenDM(openDM)
  }, [openDM, registerOpenDM])

  const [view,    setView]    = useState('list')   // 'list' | 'conv'
  const [input,   setInput]   = useState('')
  const [showNew, setShowNew] = useState(false)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  // Ouvrir sur une conv cible (depuis la page Amis)
  useEffect(() => {
    if (targetConvId && isOpen) {
      selectConversation(targetConvId)
      setView('conv')
      setTargetConvId(null)
    }
  }, [targetConvId, isOpen, selectConversation, setTargetConvId])

  // Scroll to bottom on new messages
  useEffect(() => {
    if (view === 'conv') bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, view])

  // Focus input when switching to conv view
  useEffect(() => {
    if (view === 'conv') setTimeout(() => inputRef.current?.focus(), 50)
  }, [view, activeId])

  function handleSelectConv(id) {
    selectConversation(id)
    setView('conv')
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!input.trim()) return
    await sendMessage(input)
    setInput('')
  }

  const activeConv = conversations.find(c => c.id === activeId)

  if (!user) return null

  return (
    <>
      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 sm:right-6 z-50 w-[340px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-8rem)] flex flex-col card border border-white/15 shadow-2xl shadow-black/50 overflow-hidden animate-pop">

          {/* ── Header ─────────────────────────────────────────────── */}
          {view === 'list' ? (
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
              <span className="font-display text-lg tracking-wider">💬 Chat</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowNew(true)}
                  title="Nouveau groupe"
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-midi-accent/20 text-midi-accent transition font-bold text-lg leading-none">
                  +
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition">
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/10 shrink-0">
              <button
                onClick={() => setView('list')}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition text-sm">
                ←
              </button>
              <Avatar value={convAvatar(activeConv)} size={26} className="text-xl" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-white truncate">{convDisplayName(activeConv)}</div>
                {activeConv?.type === 'group' && (
                  <div className="text-xs text-slate-500">{activeConv.memberIds?.length ?? 0} membres</div>
                )}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition shrink-0">
                ✕
              </button>
            </div>
          )}

          {/* ── Corps ──────────────────────────────────────────────── */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">

            {/* Vue liste */}
            {view === 'list' && (
              <div className="flex-1 overflow-y-auto">
                {loadingConvs ? (
                  <div className="flex justify-center py-10">
                    <div className="w-5 h-5 rounded-full border-2 border-midi-accent border-t-transparent animate-spin" />
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="px-4 py-8 text-center text-slate-500 text-sm">
                    <div className="text-3xl mb-2">💬</div>
                    <p>Aucune conversation.</p>
                    <p className="mt-1 text-xs">Va dans <span className="text-midi-accent">Amis</span> pour démarrer un chat.</p>
                  </div>
                ) : (
                  conversations.map(conv => {
                    const isActive = conv.id === activeId
                    return (
                      <button
                        key={conv.id}
                        onClick={() => handleSelectConv(conv.id)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition border-b border-white/5
                          ${isActive ? 'bg-midi-accent/10 border-l-2 border-l-midi-accent' : 'hover:bg-white/5'}`}>
                        <Avatar value={convAvatar(conv)} size={26} className="text-xl shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline gap-1">
                            <span className={`font-semibold text-xs truncate ${isActive ? 'text-midi-accent' : 'text-white'}`}>
                              {convDisplayName(conv)}
                            </span>
                            <span className="text-xs text-slate-600 shrink-0">{fmtTime(conv.last?.created_at)}</span>
                          </div>
                          <p className="text-xs text-slate-500 truncate mt-0.5">{conv.last?.content || ' '}</p>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            )}

            {/* Vue messages */}
            {view === 'conv' && (
              <>
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 min-h-0">
                  {loadingMsgs ? (
                    <div className="flex justify-center py-6">
                      <div className="w-5 h-5 rounded-full border-2 border-midi-accent border-t-transparent animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="text-center text-slate-500 text-xs py-6">Pas encore de message.</p>
                  ) : (
                    <MessageList messages={messages} profiles={profiles} userId={user.id} fmtTime={fmtTime} />
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSend}
                  className="flex gap-2 px-3 py-2.5 border-t border-white/10 shrink-0">
                  <input
                    ref={inputRef}
                    className="input flex-1 text-sm py-1.5"
                    placeholder="Message…"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend(e)}
                  />
                  <button type="submit" disabled={!input.trim()}
                    className="btn btn-primary px-3 py-1.5 text-sm disabled:opacity-40">
                    ➤
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Bouton flottant ────────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className={`fixed bottom-4 right-4 sm:right-6 z-50 w-14 h-14 rounded-full shadow-xl shadow-black/40 flex items-center justify-center text-2xl transition-all duration-200
          ${isOpen
            ? 'bg-slate-700 hover:bg-slate-600 scale-95'
            : 'bg-midi-accent hover:bg-blue-400 scale-100 hover:scale-105'
          }`}
        title={isOpen ? 'Fermer le chat' : 'Ouvrir le chat'}>
        {isOpen ? '✕' : '💬'}
      </button>

      {/* ── Modal nouveau groupe ────────────────────────────────────── */}
      {showNew && (
        <NewGroupModal
          userId={user.id}
          onClose={() => setShowNew(false)}
          onCreate={async (name, ids) => {
            const id = await createGroup(name, ids)
            setShowNew(false)
            if (id) {
              selectConversation(id)
              setView('conv')
            }
          }}
        />
      )}
    </>
  )
}

// ── Messages groupés ──────────────────────────────────────────────
function MessageList({ messages, profiles, userId, fmtTime }) {
  return messages.map((msg, i) => {
    const prev = messages[i - 1]
    const sameAuthor = prev?.sender_id === msg.sender_id
    const sameMinute = prev && Math.abs(new Date(msg.created_at) - new Date(prev.created_at)) < 60000
    const showMeta = !sameAuthor || !sameMinute
    const isMe = msg.sender_id === userId
    const sender = profiles[msg.sender_id]

    return (
      <div key={msg.id} className={`flex gap-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className="w-6 shrink-0">
          {showMeta && !isMe && (
            <Avatar value={sender?.avatar} size={22} className="text-base leading-none" />
          )}
        </div>
        <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
          {showMeta && (
            <div className={`flex items-baseline gap-1 mb-0.5 ${isMe ? 'flex-row-reverse' : ''}`}>
              {!isMe && <span className="text-xs font-semibold text-slate-300">{sender?.nickname ?? '…'}</span>}
              <span className="text-xs text-slate-600">{fmtTime(msg.created_at)}</span>
            </div>
          )}
          <div className={`px-2.5 py-1.5 rounded-2xl text-xs leading-relaxed break-words
            ${isMe
              ? 'bg-midi-accent text-slate-900 rounded-tr-sm'
              : 'bg-white/10 text-white rounded-tl-sm'
            }`}>
            {msg.content}
          </div>
        </div>
      </div>
    )
  })
}

// ── Modal nouveau groupe ──────────────────────────────────────────
function NewGroupModal({ userId, onClose, onCreate }) {
  const [name,     setName]     = useState('')
  const [friends,  setFriends]  = useState([])
  const [selected, setSelected] = useState([])
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    async function loadFriends() {
      const { data } = await supabase
        .from('friendships')
        .select(`id, status,
          requester:requester_id ( id, nickname, avatar ),
          addressee:addressee_id ( id, nickname, avatar )`)
        .eq('status', 'accepted')
      if (!data) return
      setFriends(data.map(r => r.requester?.id === userId ? r.addressee : r.requester).filter(Boolean))
    }
    loadFriends()
  }, [userId])

  function toggle(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function handleCreate() {
    if (!name.trim() || selected.length === 0) return
    setLoading(true)
    await onCreate(name, selected)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="card w-full max-w-sm p-5 space-y-4 animate-pop">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg tracking-wider">Nouveau groupe</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <input
          className="input w-full text-sm"
          placeholder="Nom du groupe…"
          value={name}
          onChange={e => setName(e.target.value)}
        />

        <div className="space-y-1.5 max-h-44 overflow-y-auto">
          {friends.length === 0
            ? <p className="text-slate-500 text-xs text-center py-3">Aucun ami disponible.</p>
            : friends.map(f => {
              const sel = selected.includes(f.id)
              return (
                <button key={f.id} onClick={() => toggle(f.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-sm transition
                    ${sel ? 'bg-midi-accent/15 border border-midi-accent/40' : 'bg-white/5 border border-transparent hover:bg-white/10'}`}>
                  <Avatar value={f.avatar} size={24} className="text-lg" />
                  <span className="flex-1 font-medium">{f.nickname}</span>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold ${sel ? 'bg-midi-accent text-slate-900' : 'bg-white/10 text-transparent'}`}>✓</span>
                </button>
              )
            })
          }
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="btn btn-ghost flex-1 text-sm">Annuler</button>
          <button onClick={handleCreate}
            disabled={!name.trim() || selected.length === 0 || loading}
            className="btn btn-primary flex-1 text-sm disabled:opacity-40">
            {loading ? '…' : `Créer (${selected.length})`}
          </button>
        </div>
      </div>
    </div>
  )
}
