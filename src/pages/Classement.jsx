import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function Classement() {
  const { user } = useAuth()
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterCountry, setFilterCountry] = useState('')
  const [filterCity,    setFilterCity]    = useState('')
  const [filterIcam,    setFilterIcam]    = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      // Fetch all profiles + their cumulative TV score
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nickname, avatar, country, city, is_icam')

      if (!profiles) { setLoading(false); return }

      // Fetch sum of scores per profile from tv_participants
      const { data: scores } = await supabase
        .from('tv_participants')
        .select('profile_id, score')

      // Aggregate scores
      const scoreMap = {}
      for (const s of (scores ?? [])) {
        scoreMap[s.profile_id] = (scoreMap[s.profile_id] ?? 0) + (s.score ?? 0)
      }

      const ranked = profiles
        .map(p => ({ ...p, total_score: scoreMap[p.id] ?? 0 }))
        .sort((a, b) => b.total_score - a.total_score)

      setRows(ranked)
      setLoading(false)
    }
    load()
  }, [])

  // Unique values for filter dropdowns
  const countries = useMemo(() =>
    [...new Set(rows.map(r => r.country).filter(Boolean))].sort(), [rows])
  const cities = useMemo(() =>
    [...new Set(
      rows
        .filter(r => !filterCountry || r.country === filterCountry)
        .map(r => r.city)
        .filter(Boolean)
    )].sort(),
    [rows, filterCountry])

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (filterCountry && r.country !== filterCountry) return false
      if (filterCity    && r.city    !== filterCity)    return false
      if (filterIcam    && !r.is_icam)                  return false
      return true
    })
  }, [rows, filterCountry, filterCity, filterIcam])

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="heading text-3xl">Classement</h1>
          <p className="text-slate-500 text-sm mt-1">
            Scores cumulés des parties TV · {filtered.length} joueur{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        {user && (
          <Link to="/profil" className="btn btn-ghost text-xs px-3 py-1.5">
            Modifier ma localisation →
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[130px]">
          <label className="block text-xs text-slate-500 mb-1">Pays</label>
          <select
            className="input w-full text-sm"
            value={filterCountry}
            onChange={e => { setFilterCountry(e.target.value); setFilterCity('') }}>
            <option value="">Tous les pays</option>
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="flex-1 min-w-[130px]">
          <label className="block text-xs text-slate-500 mb-1">Ville</label>
          <select
            className="input w-full text-sm"
            value={filterCity}
            onChange={e => setFilterCity(e.target.value)}
            disabled={!filterCountry && cities.length === 0}>
            <option value="">Toutes les villes</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none pb-1">
          <div
            onClick={() => setFilterIcam(v => !v)}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition shrink-0
              ${filterIcam ? 'bg-midi-accent border-midi-accent' : 'border-white/20 hover:border-white/40'}`}>
            {filterIcam && <span className="text-slate-900 text-xs font-bold">✓</span>}
          </div>
          <span className="text-sm text-slate-300">ICAM uniquement</span>
        </label>

        {(filterCountry || filterCity || filterIcam) && (
          <button
            onClick={() => { setFilterCountry(''); setFilterCity(''); setFilterIcam(false) }}
            className="btn btn-ghost text-xs px-3 py-1.5 text-slate-500">
            Réinitialiser
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-midi-accent border-t-transparent animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          <div className="text-4xl mb-3">🏜️</div>
          <p>Aucun joueur ne correspond à ces filtres.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[2rem_1fr_auto_auto_auto] items-center gap-3 px-5 py-3
            text-xs text-slate-500 uppercase tracking-wider border-b border-white/10">
            <span>#</span>
            <span>Joueur</span>
            <span className="hidden sm:block">Localisation</span>
            <span className="hidden sm:block text-center">ICAM</span>
            <span className="text-right">Score TV</span>
          </div>

          {filtered.map((row, i) => {
            const isMe = user && row.id === user.id
            return (
              <div
                key={row.id}
                className={`grid grid-cols-[2rem_1fr_auto_auto_auto] items-center gap-3 px-5 py-3.5
                  border-b border-white/5 last:border-0 transition-colors
                  ${isMe ? 'bg-midi-accent/5 border-midi-accent/20' : 'hover:bg-white/3'}`}>

                {/* Rank */}
                <span className="text-lg text-center w-8 shrink-0">
                  {i < 3 ? medals[i] : <span className="text-slate-500 text-sm font-mono">{i + 1}</span>}
                </span>

                {/* Player */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xl shrink-0">{row.avatar ?? '🎭'}</span>
                  <div className="min-w-0">
                    <div className={`font-semibold truncate ${isMe ? 'text-midi-accent' : 'text-white'}`}>
                      {row.nickname}
                      {isMe && <span className="ml-1.5 text-xs opacity-70">(moi)</span>}
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="hidden sm:block text-sm text-slate-500 text-right min-w-[100px]">
                  {[row.city, row.country].filter(Boolean).join(', ') || '—'}
                </div>

                {/* ICAM badge */}
                <div className="hidden sm:flex justify-center w-12">
                  {row.is_icam && (
                    <span className="text-xs bg-midi-accent/20 text-midi-accent px-2 py-0.5 rounded-full font-semibold">
                      ICAM
                    </span>
                  )}
                </div>

                {/* Score */}
                <div className="text-right tabular-nums font-bold text-midi-accent min-w-[70px]">
                  {row.total_score > 0
                    ? row.total_score.toLocaleString('fr-FR') + ' €'
                    : <span className="text-slate-600 font-normal text-sm">—</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* CTA non connecté */}
      {!user && (
        <div className="card p-5 flex items-center gap-4 border border-midi-accent/20 bg-midi-accent/5">
          <span className="text-3xl">🏆</span>
          <div className="flex-1">
            <div className="font-semibold text-white">Apparais dans le classement</div>
            <div className="text-sm text-slate-400 mt-0.5">Crée un compte pour que tes scores TV soient comptabilisés.</div>
          </div>
          <Link to="/auth" className="btn btn-primary text-sm shrink-0">Créer un compte</Link>
        </div>
      )}
    </div>
  )
}
