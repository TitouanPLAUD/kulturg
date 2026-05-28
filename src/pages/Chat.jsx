import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useChat } from '../hooks/useChat.js'
import { supabase } from '../lib/supabase.js'

export default function Chat() {
  const { user } = useAuth()
  const { id: urlId } = useParams()
  const navigate = useNavigate()
  const {
    conversations, activeId, messages, profiles,
    loadingConvs, loadingMsgs,
    selectConversation, sendMessage, createGroup,
    convDisplayName, convAvatar, fmtTime,
  } = useChat()

  const [input,       setInput]       = useState('')
  const [showNew,     setShowNew]     = useState(false) // modal nouveau groupe
  const [mobileView, setMobileView]   = useState('list') // 'list' | 'conv'
  const bottomRef = useRef(null)

  // Sélectionner depuis l'URL
  useEffect(() => {
    if (urlId && urlId !== activeId) selectConversation(urlId)
    if (!urlId && conversations.length && !activeId) {
      selectConversation(conversations[0].id)
      navigate(`/chat/${conversations[0].id}`, { replace: true })
    }
  }, [urlId, conversations, activeId, selectConversation, navigate])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Click on a conversation
  function handleSelectConv(id) {
    selectConversation(id)
    navigate(`/chat/${id}`)
    setMobileView('conv')
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!input.trim()) return
    await sendMessage(input)
    setInput('')
  }

  const activeConv = conversations.find(c => c.id === activeId)

  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center space-y-4">
        <div className="text-5xl">💬</div>
        <div className="heading text-2xl">Chat</div>
        <p className="text-slate-400">Connecte-toi pour discuter avec tes amis.</p>
        <Link to="/auth" className="btn btn-primary">Se connecter</Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="card overflow-hidden flex h-[calc(100vh-12rem)] min-h-[400px]">

        {/* ── Sidebar conversations ─────────────────────────────── */}
        <aside className={`flex flex-col border-r border-white/10 w-full md:w-72 shrink-0
          ${mobileView === 'conv' ? 'hidden md:flex' : 'flex'}`}>

          {/* Header sidebar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h1 className="font-display text-xl tracking-wider">Chat</h1>
            <button
              onClick={() => setShowNew(true)}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-midi-accent/10 hover:bg-midi-accent/20 text-midi-accent transition text-xl font-bold"
              title="Nouveau groupe">
              +
            </button>
          </div>

          {/* Liste des conversations */}
          <div className="flex-1 overflow-y-auto">
            {loadingConvs ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 rounded-full border-2 border-midi-accent border-t-transparent animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-500 text-sm">
                <div className="text-3xl mb-2">💬</div>
                <p>Aucune conversation.</p>
                <p className="mt-1">Va dans <Link to="/amis" className="text-midi-accent hover:underline">Amis</Link> pour envoyer un message.</p>
              </div>
            ) : (
              conversations.map(conv => {
                const isActive = conv.id === activeId
                const name     = convDisplayName(conv)
                const avatar   = convAvatar(conv)
                const preview  = conv.last?.content ?? ''
                const time     = fmtTime(conv.last?.created_at)
                return (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConv(conv.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition border-b border-white/5
                      ${isActive ? 'bg-midi-accent/10 border-l-2 border-l-midi-accent' : 'hover:bg-white/5'}`}>
                    <span className="text-2xl shrink-0">{avatar}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline gap-1">
                        <span className={`font-semibold text-sm truncate ${isActive ? 'text-midi-accent' : 'text-white'}`}>
                          {name}
                        </span>
                        <span className="text-xs text-slate-600 shrink-0">{time}</span>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{preview || ' '}</p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </aside>

        {/* ── Zone de messages ─────────────────────────────────── */}
        <div className={`flex-1 flex flex-col min-w-0
          ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}>

          {/* Header conv */}
          {activeConv ? (
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0">
              <button
                onClick={() => setMobileView('list')}
                className="md:hidden text-slate-400 hover:text-white text-lg">
                ←
              </button>
              <span className="text-2xl">{convAvatar(activeConv)}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white truncate">{convDisplayName(activeConv)}</div>
                {activeConv.type === 'group' && (
                  <div className="text-xs text-slate-500">
                    {activeConv.memberIds?.length ?? 0} membres
                  </div>
                )}
              </div>
              {activeConv.type === 'group' && (
                <GroupMembers memberIds={activeConv.memberIds} profiles={profiles} />
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 flex-col gap-2">
              <div className="text-5xl">💬</div>
              <p className="text-sm">Sélectionne une conversation</p>
            </div>
          )}

          {/* Messages */}
          {activeConv && (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
                {loadingMsgs ? (
                  <div className="flex justify-center py-10">
                    <div className="w-6 h-6 rounded-full border-2 border-midi-accent border-t-transparent animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-center text-slate-500 text-sm py-8">
                    Pas encore de message. Sois le premier !
                  </p>
                ) : (
                  <MessageList messages={messages} profiles={profiles} userId={user.id} fmtTime={fmtTime} />
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSend}
                className="flex gap-2 px-4 py-3 border-t border-white/10 shrink-0">
                <input
                  className="input flex-1"
                  placeholder="Écris un message…"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend(e)}
                />
                <button type="submit" disabled={!input.trim()}
                  className="btn btn-primary px-4 disabled:opacity-40">
                  ➤
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* ── Modal nouveau groupe ───────────────────────────────── */}
      {showNew && (
        <NewGroupModal
          userId={user.id}
          onClose={() => setShowNew(false)}
          onCreate={async (name, ids) => {
            const id = await createGroup(name, ids)
            setShowNew(false)
            if (id) handleSelectConv(id)
          }}
        />
      )}
    </div>
  )
}

// ── Liste de messages groupés par expéditeur ─────────────────────
function MessageList({ messages, profiles, userId, fmtTime }) {
  const grouped = []
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    const prev = messages[i - 1]
    const sameAuthor = prev?.sender_id === msg.sender_id
    const sameMinute = prev && Math.abs(new Date(msg.created_at) - new Date(prev.created_at)) < 60000
    grouped.push({ ...msg, showMeta: !sameAuthor || !sameMinute })
  }

  return grouped.map((msg) => {
    const isMe = msg.sender_id === userId
    const sender = profiles[msg.sender_id]
    return (
      <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar (uniquement si première ligne du groupe) */}
        <div className="w-8 shrink-0">
          {msg.showMeta && !isMe && (
            <span className="text-xl">{sender?.avatar ?? '🎭'}</span>
          )}
        </div>
        <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
          {msg.showMeta && (
            <div className={`flex items-baseline gap-1.5 mb-0.5 ${isMe ? 'flex-row-reverse' : ''}`}>
              {!isMe && <span className="text-xs font-semibold text-slate-300">{sender?.nickname ?? '…'}</span>}
              <span className="text-xs text-slate-600">{fmtTime(msg.created_at)}</span>
            </div>
          )}
          <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-words
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

// ── Avatars des membres d'un groupe ──────────────────────────────
function GroupMembers({ memberIds, profiles }) {
  if (!memberIds?.length) return null
  const shown = memberIds.slice(0, 4)
  return (
    <div className="flex -space-x-1.5">
      {shown.map(id => (
        <span key={id} className="text-sm w-7 h-7 flex items-center justify-center rounded-full bg-white/10 border border-white/10"
          title={profiles[id]?.nickname}>
          {profiles[id]?.avatar ?? '🎭'}
        </span>
      ))}
      {memberIds.length > 4 && (
        <span className="text-xs w-7 h-7 flex items-center justify-center rounded-full bg-white/10 border border-white/10 text-slate-400">
          +{memberIds.length - 4}
        </span>
      )}
    </div>
  )
}

// ── Modal créer un groupe ─────────────────────────────────────────
function NewGroupModal({ userId, onClose, onCreate }) {
  const [name,     setName]     = useState('')
  const [friends,  setFriends]  = useState([])
  const [selected, setSelected] = useState([])
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    async function loadFriends() {
      const { data } = await supabase
        .from('friendships')
        .select(`
          id, status,
          requester:requester_id ( id, nickname, avatar ),
          addressee:addressee_id ( id, nickname, avatar )
        `)
        .eq('status', 'accepted')
      if (!data) return
      const f = data.map(r => r.requester?.id === userId ? r.addressee : r.requester).filter(Boolean)
      setFriends(f)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-md p-6 space-y-5 animate-pop">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl tracking-wider">Nouveau groupe</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1">Nom du groupe</label>
          <input
            className="input w-full"
            placeholder="Ex : Les Coups de Minuit 🎯"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-2">Ajouter des amis</label>
          {friends.length === 0 ? (
            <p className="text-slate-500 text-sm">
              Aucun ami pour l'instant.{' '}
              <Link to="/amis" className="text-midi-accent hover:underline">Ajouter des amis →</Link>
            </p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {friends.map(f => {
                const sel = selected.includes(f.id)
                return (
                  <button
                    key={f.id}
                    onClick={() => toggle(f.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition
                      ${sel ? 'bg-midi-accent/15 border border-midi-accent/40' : 'bg-white/5 border border-transparent hover:bg-white/10'}`}>
                    <span className="text-xl">{f.avatar ?? '🎭'}</span>
                    <span className="flex-1 font-medium text-sm">{f.nickname}</span>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
                      ${sel ? 'bg-midi-accent text-slate-900' : 'bg-white/10 text-transparent'}`}>
                      ✓
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn btn-ghost flex-1">Annuler</button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || selected.length === 0 || loading}
            className="btn btn-primary flex-1 disabled:opacity-40">
            {loading ? '…' : `Créer (${selected.length} membre${selected.length > 1 ? 's' : ''})`}
          </button>
        </div>
      </div>
    </div>
  )
}
