import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useChat } from '../hooks/useChat.js'

export default function Amis() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const { openDM } = useChat()
  const [search, setSearch]         = useState('')
  const [results, setResults]       = useState([])
  const [friends, setFriends]       = useState([])   // accepted
  const [received, setReceived]     = useState([])   // pending reçues
  const [sent, setSent]             = useState([])   // pending envoyées
  const [loading, setLoading]       = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [toast, setToast]           = useState(null)

  function showToast(msg, type = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Charger les relations existantes
  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('friendships')
      .select(`
        id, status, created_at,
        requester:requester_id ( id, nickname, avatar ),
        addressee:addressee_id ( id, nickname, avatar )
      `)
    if (!data) { setLoading(false); return }

    const accepted = []
    const pendingReceived = []
    const pendingSent = []

    for (const f of data) {
      if (f.status === 'accepted') {
        accepted.push(f)
      } else if (f.status === 'pending') {
        if (f.addressee?.id === user.id) pendingReceived.push(f)
        else pendingSent.push(f)
      }
    }
    setFriends(accepted)
    setReceived(pendingReceived)
    setSent(pendingSent)
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  // Recherche d'utilisateurs
  useEffect(() => {
    if (search.trim().length < 2) { setResults([]); return }
    const timer = setTimeout(async () => {
      setSearchLoading(true)
      const { data } = await supabase
        .from('profiles')
        .select('id, nickname, avatar')
        .ilike('nickname', `%${search.trim()}%`)
        .neq('id', user?.id ?? '')
        .limit(8)
      setResults(data ?? [])
      setSearchLoading(false)
    }, 350)
    return () => clearTimeout(timer)
  }, [search, user])

  async function sendRequest(addresseeId) {
    const { error } = await supabase
      .from('friendships')
      .insert({ requester_id: user.id, addressee_id: addresseeId })
    if (error) {
      showToast('Demande déjà envoyée ou erreur.', 'err')
    } else {
      showToast('Demande envoyée ! 🎉')
      setSearch('')
      setResults([])
      load()
    }
  }

  async function respond(friendshipId, status) {
    await supabase.from('friendships').update({ status }).eq('id', friendshipId)
    showToast(status === 'accepted' ? 'Ami ajouté ! 🤝' : 'Demande refusée.')
    load()
  }

  async function remove(friendshipId) {
    if (!confirm('Supprimer cet ami ?')) return
    await supabase.from('friendships').delete().eq('id', friendshipId)
    showToast('Ami supprimé.')
    load()
  }

  async function cancel(friendshipId) {
    await supabase.from('friendships').delete().eq('id', friendshipId)
    showToast('Demande annulée.')
    load()
  }

  // Récupère le profil de l'autre côté de la relation
  function otherProfile(f) {
    return f.requester?.id === user?.id ? f.addressee : f.requester
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center space-y-4">
        <div className="text-5xl">🔐</div>
        <div className="heading text-2xl">Compte requis</div>
        <p className="text-slate-400">Connecte-toi pour gérer tes amis.</p>
        <Link to="/auth" className="btn btn-primary">Se connecter</Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl text-sm font-medium animate-pop ${
          toast.type === 'err' ? 'bg-red-500/90 text-white' : 'bg-green-500/90 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      <div>
        <h1 className="heading text-3xl mb-1">Mes amis</h1>
        <p className="text-slate-400 text-sm">Recherche des joueurs et envoie des demandes d'amis.</p>
      </div>

      {/* Recherche */}
      <section className="card p-5">
        <h2 className="font-semibold text-sm text-slate-300 uppercase tracking-wider mb-3">Trouver un joueur</h2>
        <div className="relative">
          <input
            className="input w-full pr-8"
            placeholder="Chercher par pseudo…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {searchLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">⏳</div>
          )}
        </div>

        {results.length > 0 && (
          <ul className="mt-3 space-y-2">
            {results.map(p => {
              const alreadyFriend = friends.some(f => otherProfile(f)?.id === p.id)
              const alreadySent   = sent.some(f => f.addressee?.id === p.id)
              const alreadyRecv   = received.some(f => f.requester?.id === p.id)
              return (
                <li key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                  <span className="text-2xl">{p.avatar}</span>
                  <span className="flex-1 font-medium">{p.nickname}</span>
                  {alreadyFriend
                    ? <span className="chip text-xs">✓ Ami</span>
                    : alreadySent
                    ? <span className="chip text-xs text-slate-400">En attente…</span>
                    : alreadyRecv
                    ? <span className="chip text-xs text-midi-accent">Demande reçue</span>
                    : (
                      <button
                        onClick={() => sendRequest(p.id)}
                        className="btn btn-primary text-xs px-3 py-1">
                        + Ajouter
                      </button>
                    )
                  }
                </li>
              )
            })}
          </ul>
        )}
        {search.trim().length >= 2 && !searchLoading && results.length === 0 && (
          <p className="text-slate-500 text-sm mt-3">Aucun joueur trouvé.</p>
        )}
      </section>

      {/* Demandes reçues */}
      {received.length > 0 && (
        <section className="card p-5 border border-midi-accent/20">
          <h2 className="font-semibold text-sm text-midi-accent uppercase tracking-wider mb-3">
            Demandes reçues ({received.length})
          </h2>
          <ul className="space-y-2">
            {received.map(f => {
              const p = otherProfile(f)
              return (
                <li key={f.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                  <span className="text-2xl">{p?.avatar}</span>
                  <span className="flex-1 font-medium">{p?.nickname}</span>
                  <button
                    onClick={() => respond(f.id, 'accepted')}
                    className="btn btn-primary text-xs px-3 py-1">
                    Accepter
                  </button>
                  <button
                    onClick={() => respond(f.id, 'declined')}
                    className="btn btn-ghost text-xs px-3 py-1 text-slate-400">
                    Refuser
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* Demandes envoyées */}
      {sent.length > 0 && (
        <section className="card p-5">
          <h2 className="font-semibold text-sm text-slate-400 uppercase tracking-wider mb-3">
            Demandes envoyées ({sent.length})
          </h2>
          <ul className="space-y-2">
            {sent.map(f => {
              const p = otherProfile(f)
              return (
                <li key={f.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                  <span className="text-2xl">{p?.avatar}</span>
                  <span className="flex-1 font-medium text-slate-300">{p?.nickname}</span>
                  <span className="text-xs text-slate-500">En attente…</span>
                  <button
                    onClick={() => cancel(f.id)}
                    className="btn btn-ghost text-xs px-3 py-1 text-slate-500">
                    Annuler
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* Liste d'amis */}
      <section className="card p-5">
        <h2 className="font-semibold text-sm text-slate-300 uppercase tracking-wider mb-3">
          Amis ({loading ? '…' : friends.length})
        </h2>

        {loading && (
          <div className="text-slate-500 text-sm py-4 text-center">Chargement…</div>
        )}

        {!loading && friends.length === 0 && (
          <p className="text-slate-500 text-sm py-4 text-center">
            Pas encore d'amis. Utilise la recherche ci-dessus !
          </p>
        )}

        {!loading && friends.length > 0 && (
          <ul className="space-y-2">
            {friends.map(f => {
              const p = otherProfile(f)
              return (
                <FriendRow
                  key={f.id}
                  friend={p}
                  onMessage={async () => {
                    const convId = await openDM(p.id)
                    if (convId) navigate(`/chat/${convId}`)
                    else showToast('Impossible d\'ouvrir la conversation.', 'err')
                  }}
                  onRemove={() => remove(f.id)}
                />
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function FriendRow({ friend: p, onMessage, onRemove }) {
  const [dmLoading, setDmLoading] = useState(false)

  async function handleMessage() {
    setDmLoading(true)
    await onMessage()
    setDmLoading(false)
  }

  return (
    <li className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 group">
      <span className="text-2xl">{p?.avatar}</span>
      <span className="flex-1 font-medium">{p?.nickname}</span>
      <button
        onClick={handleMessage}
        disabled={dmLoading}
        className="opacity-0 group-hover:opacity-100 transition btn btn-ghost text-xs px-2 py-1 text-midi-accent hover:text-midi-accent/80 disabled:opacity-60">
        {dmLoading ? '⏳' : '💬 Message'}
      </button>
      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 transition btn btn-ghost text-xs px-2 py-1 text-slate-500 hover:text-red-400">
        Retirer
      </button>
    </li>
  )
}
