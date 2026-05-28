import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'

// ─── helpers ─────────────────────────────────────────────────────
function fmtTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

export function useChat() {
  const { user } = useAuth()

  const [conversations, setConversations] = useState([]) // enriched
  const [activeId,      setActiveId]      = useState(null)
  const [messages,      setMessages]      = useState([])
  const [profiles,      setProfiles]      = useState({}) // cache { id: { nickname, avatar } }
  const [loadingConvs,  setLoadingConvs]  = useState(true)
  const [loadingMsgs,   setLoadingMsgs]   = useState(false)

  const channelConvRef = useRef(null)
  const channelMsgRef  = useRef(null)
  const profileCache   = useRef({})

  // ── Charger un profil (avec cache) ──────────────────────────────
  const getProfile = useCallback(async (id) => {
    if (!id) return null
    if (profileCache.current[id]) return profileCache.current[id]
    const { data } = await supabase
      .from('profiles').select('id, nickname, avatar').eq('id', id).single()
    if (data) {
      profileCache.current[id] = data
      setProfiles(p => ({ ...p, [id]: data }))
    }
    return data
  }, [])

  // ── Charger plusieurs profils d'un coup ─────────────────────────
  const getProfiles = useCallback(async (ids) => {
    const missing = ids.filter(id => id && !profileCache.current[id])
    if (missing.length) {
      const { data } = await supabase
        .from('profiles').select('id, nickname, avatar').in('id', missing)
      for (const p of (data ?? [])) {
        profileCache.current[p.id] = p
      }
      setProfiles(prev => {
        const next = { ...prev }
        for (const p of (data ?? [])) next[p.id] = p
        return next
      })
    }
  }, [])

  // ── Enrichir une conversation (membres + dernier message) ────────
  const enrichConv = useCallback(async (conv) => {
    const [{ data: members }, { data: lastMsgs }] = await Promise.all([
      supabase.from('conversation_members').select('profile_id').eq('conversation_id', conv.id),
      supabase.from('messages')
        .select('content, created_at, sender_id')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1),
    ])
    const memberIds = (members ?? []).map(m => m.profile_id)
    await getProfiles(memberIds)
    const last = lastMsgs?.[0] ?? null
    return { ...conv, memberIds, last }
  }, [getProfiles])

  // ── Charger toutes les conversations ────────────────────────────
  const loadConversations = useCallback(async () => {
    if (!user) return
    setLoadingConvs(true)
    const { data: myConvIds } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('profile_id', user.id)
    if (!myConvIds?.length) { setConversations([]); setLoadingConvs(false); return }

    const ids = myConvIds.map(x => x.conversation_id)
    const { data: convs } = await supabase
      .from('conversations').select('*').in('id', ids)

    const enriched = await Promise.all((convs ?? []).map(enrichConv))
    // Trier par dernier message le plus récent
    enriched.sort((a, b) =>
      new Date(b.last?.created_at ?? b.created_at) - new Date(a.last?.created_at ?? a.created_at)
    )
    setConversations(enriched)
    setLoadingConvs(false)
  }, [user, enrichConv])

  useEffect(() => { loadConversations() }, [loadConversations])

  // ── Real-time : nouvelles conversations + nouveaux membres ───────
  useEffect(() => {
    if (!user) return
    channelConvRef.current = supabase
      .channel(`chat-convs-${user.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversation_members', filter: `profile_id=eq.${user.id}` },
        () => loadConversations()
      )
      .subscribe()
    return () => {
      if (channelConvRef.current) supabase.removeChannel(channelConvRef.current)
    }
  }, [user, loadConversations])

  // ── Charger les messages d'une conv ─────────────────────────────
  const selectConversation = useCallback(async (id) => {
    setActiveId(id)
    if (!id) { setMessages([]); return }
    setLoadingMsgs(true)
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })
      .limit(100)
    const senderIds = [...new Set((data ?? []).map(m => m.sender_id).filter(Boolean))]
    await getProfiles(senderIds)
    setMessages(data ?? [])
    setLoadingMsgs(false)
  }, [getProfiles])

  // ── Real-time messages pour la conv active ───────────────────────
  useEffect(() => {
    if (!activeId) return
    if (channelMsgRef.current) supabase.removeChannel(channelMsgRef.current)

    channelMsgRef.current = supabase
      .channel(`chat-msgs-${activeId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeId}` },
        async ({ new: msg }) => {
          if (msg.sender_id) await getProfile(msg.sender_id)
          setMessages(prev => [...prev.filter(m => m.id !== msg.id), msg])
          // Mettre à jour le dernier message dans la liste
          setConversations(prev => prev.map(c =>
            c.id === activeId ? { ...c, last: msg } : c
          ).sort((a, b) =>
            new Date(b.last?.created_at ?? b.created_at) - new Date(a.last?.created_at ?? a.created_at)
          ))
        }
      )
      .subscribe()

    return () => {
      if (channelMsgRef.current) supabase.removeChannel(channelMsgRef.current)
    }
  }, [activeId, getProfile])

  // ── Envoyer un message ───────────────────────────────────────────
  const sendMessage = useCallback(async (content) => {
    if (!user || !activeId || !content.trim()) return
    await supabase.from('messages').insert({
      conversation_id: activeId,
      sender_id: user.id,
      content: content.trim(),
    })
  }, [user, activeId])

  // ── Créer ou ouvrir un DM avec un ami ───────────────────────────
  const openDM = useCallback(async (friendId) => {
    if (!user) return null

    // Chercher un DM existant partagé (on ne voit que les convs où on est déjà membre)
    const { data: myMemberships } = await supabase
      .from('conversation_members').select('conversation_id').eq('profile_id', user.id)

    if (myMemberships?.length) {
      const myConvIds = myMemberships.map(x => x.conversation_id)
      // Parmi mes convs, chercher une DM où l'ami est aussi membre
      const { data: shared } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('profile_id', friendId)
        .in('conversation_id', myConvIds)

      if (shared?.length) {
        const sharedIds = shared.map(x => x.conversation_id)
        const { data: existing } = await supabase
          .from('conversations').select('id').in('id', sharedIds).eq('type', 'dm').limit(1)
        if (existing?.length) {
          await loadConversations()
          return existing[0].id
        }
      }
    }

    // Créer un nouveau DM — UUID généré côté client pour éviter le SELECT bloqué par RLS
    const convId = crypto.randomUUID()
    const { error } = await supabase
      .from('conversations').insert({ id: convId, type: 'dm', created_by: user.id })
    if (error) return null
    await supabase.from('conversation_members').insert([
      { conversation_id: convId, profile_id: user.id },
      { conversation_id: convId, profile_id: friendId },
    ])
    await loadConversations()
    return convId
  }, [user, loadConversations])

  // ── Créer un groupe ──────────────────────────────────────────────
  const createGroup = useCallback(async (name, memberIds) => {
    if (!user || !name.trim() || !memberIds.length) return null
    // UUID généré côté client pour éviter le SELECT bloqué par RLS
    const convId = crypto.randomUUID()
    const { error } = await supabase
      .from('conversations').insert({ id: convId, type: 'group', name: name.trim(), created_by: user.id })
    if (error) return null
    const allMembers = [...new Set([user.id, ...memberIds])]
    await supabase.from('conversation_members').insert(
      allMembers.map(pid => ({ conversation_id: convId, profile_id: pid }))
    )
    await loadConversations()
    return convId
  }, [user, loadConversations])

  // ── Nom affiché d'une conversation ───────────────────────────────
  const convDisplayName = useCallback((conv) => {
    if (!conv) return ''
    if (conv.type === 'group') return conv.name ?? 'Groupe'
    const otherId = conv.memberIds?.find(id => id !== user?.id)
    return profileCache.current[otherId]?.nickname ?? '…'
  }, [user])

  const convAvatar = useCallback((conv) => {
    if (!conv) return '💬'
    if (conv.type === 'group') return '👥'
    const otherId = conv.memberIds?.find(id => id !== user?.id)
    return profileCache.current[otherId]?.avatar ?? '🎭'
  }, [user])

  return {
    conversations,
    activeId,
    messages,
    profiles,
    loadingConvs,
    loadingMsgs,
    selectConversation,
    sendMessage,
    openDM,
    createGroup,
    convDisplayName,
    convAvatar,
    fmtTime,
    reload: loadConversations,
  }
}
