import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { levelFromXP } from '../context/GameContext.jsx'
import { ELO_START } from '../utils/elo.js'
import { findEcole } from '../data/ecoles.js'
import Avatar from '../components/Avatar.jsx'
import SchoolBadge from '../components/SchoolBadge.jsx'
import SchoolLogo from '../components/SchoolLogo.jsx'

export default function Classement() {
  const { user } = useAuth()
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterCountry, setFilterCountry] = useState('')
  const [filterCity,    setFilterCity]    = useState('')
  const [filterSchool,  setFilterSchool]  = useState('')
  const [view,          setView]          = useState('joueurs') // 'joueurs' | 'ecoles'

  useEffect(() => {
    async function load() {
      setLoading(true)

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nickname, avatar, country, city, is_icam, school, elo, total_xp, total_answered, total_correct')

      if (!profiles) { setLoading(false); return }

      const ranked = profiles
        .map(p => {
          const xp  = p.total_xp ?? 0
          const ans = p.total_answered ?? 0
          const cor = p.total_correct ?? 0
          return {
            ...p,
            school:   p.school || (p.is_icam ? 'icam' : null),
            xp,
            elo:      p.elo ?? ELO_START,
            level:    levelFromXP(xp),
            accuracy: ans > 0 ? Math.round((cor / ans) * 100) : null,
          }
        })
        .sort((a, b) => b.elo - a.elo)

      setRows(ranked)
      setLoading(false)
    }
    load()
  }, [])

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

  const schoolsInUse = useMemo(() => {
    const map = {}
    rows.forEach(r => { if (r.school) map[r.school] = (map[r.school] || 0) + 1 })
    return Object.keys(map)
      .map(v => ({ value: v, count: map[v], ecole: findEcole(v) }))
      .filter(x => x.ecole)
      .sort((a, b) => a.ecole.label.localeCompare(b.ecole.label))
  }, [rows])

  // Classement écoles : ELO moyen des membres
  const ecolesRanked = useMemo(() => {
    const m = {}
    for (const r of rows) {
      if (!r.school) continue
      const e = findEcole(r.school)
      if (!e) continue
      if (!m[r.school]) m[r.school] = { ecole: e, eloSum: 0, count: 0, top: null }
      m[r.school].eloSum += r.elo
      m[r.school].count  += 1
      if (!m[r.school].top || r.elo > m[r.school].top.elo) m[r.school].top = r
    }
    return Object.values(m)
      .map(g => ({ ...g, elo: Math.round(g.eloSum / g.count) }))
      .sort((a, b) => b.elo - a.elo)
  }, [rows])

  const filtered = useMemo(() =>
    rows.filter(r => {
      if (filterCountry && r.country !== filterCountry) return false
      if (filterCity    && r.city    !== filterCity)    return false
      if (filterSchool  && r.school  !== filterSchool)  return false
      return true
    }),
    [rows, filterCountry, filterCity, filterSchool])

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="heading text-3xl">Classement</h1>
          <p className="text-slate-500 text-sm mt-1">
            Classé par ELO · {filtered.length} joueur{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        {user && (
          <Link to="/profil" className="btn btn-ghost text-xs px-3 py-1.5">
            Modifier mon profil →
          </Link>
        )}
      </div>

      {/* Onglets */}
      <div className="flex rounded-xl bg-white/5 border border-white/10 p-1 gap-1">
        <button onClick={() => setView('joueurs')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${view === 'joueurs' ? 'bg-midi-accent text-slate-900' : 'text-slate-300'}`}>
          🧑 Joueurs
        </button>
        <button onClick={() => setView('ecoles')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${view === 'ecoles' ? 'bg-midi-accent text-slate-900' : 'text-slate-300'}`}>
          🎓 Écoles
        </button>
      </div>

      {view === 'joueurs' && (
        <>
          {/* Filters */}
          <div className="card p-4 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[130px]">
              <label className="block text-xs text-slate-500 mb-1">Pays</label>
              <select className="input w-full text-sm" value={filterCountry}
                onChange={e => { setFilterCountry(e.target.value); setFilterCity('') }}>
                <option value="">Tous les pays</option>
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[130px]">
              <label className="block text-xs text-slate-500 mb-1">Ville</label>
              <select className="input w-full text-sm" value={filterCity}
                onChange={e => setFilterCity(e.target.value)}
                disabled={!filterCountry && cities.length === 0}>
                <option value="">Toutes les villes</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs text-slate-500 mb-1">École</label>
              <select className="input w-full text-sm" value={filterSchool}
                onChange={e => setFilterSchool(e.target.value)}>
                <option value="">Toutes les écoles</option>
                {schoolsInUse.map(s => (
                  <option key={s.value} value={s.value}>{s.ecole.label} ({s.count})</option>
                ))}
              </select>
            </div>
            {(filterCountry || filterCity || filterSchool) && (
              <button
                onClick={() => { setFilterCountry(''); setFilterCity(''); setFilterSchool('') }}
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
              <div className="grid grid-cols-[2rem_1fr_auto_auto_auto] items-center gap-3 px-5 py-3
                text-xs text-slate-500 uppercase tracking-wider border-b border-white/10">
                <span>#</span>
                <span>Joueur</span>
                <span className="hidden sm:block text-center">École</span>
                <span className="hidden sm:block text-right">Réussite</span>
                <span className="text-right">ELO</span>
              </div>

              {filtered.map((row, i) => {
                const isMe  = user && row.id === user.id
                const ecole = row.school ? findEcole(row.school) : null

                return (
                  <div key={row.id}
                    className={`grid grid-cols-[2rem_1fr_auto_auto_auto] items-center gap-3 px-5 py-3.5
                      border-b border-white/5 last:border-0 transition-colors
                      ${isMe ? 'bg-midi-accent/5 border-midi-accent/20' : 'hover:bg-white/3'}`}>

                    <span className="text-lg text-center w-8 shrink-0">
                      {i < 3
                        ? medals[i]
                        : <span className="text-slate-500 text-sm font-mono">{i + 1}</span>}
                    </span>

                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar value={row.avatar} size={28} className="text-xl shrink-0" />
                      <div className="min-w-0">
                        <div className={`font-semibold truncate ${isMe ? 'text-midi-accent' : 'text-white'}`}>
                          {row.nickname}
                          {isMe && <span className="ml-1.5 text-xs opacity-70">(moi)</span>}
                        </div>
                        <div className="text-xs text-slate-500">Niv. {row.level}</div>
                      </div>
                    </div>

                    <div className="hidden sm:flex justify-center w-20">
                      {ecole && ecole.value !== 'aucune' && (
                        ecole.logo
                          ? <SchoolBadge compact size={24} logo={ecole.logo} label={ecole.label} title={ecole.label} />
                          : <SchoolLogo ecole={ecole} size={24} />
                      )}
                    </div>

                    <div className="hidden sm:block text-right tabular-nums text-sm min-w-[60px] text-slate-400">
                      {row.accuracy !== null ? `${row.accuracy} %` : <span className="text-slate-600">—</span>}
                    </div>

                    <div className="text-right tabular-nums font-bold min-w-[64px] text-yellow-400">
                      {row.elo.toLocaleString('fr-FR')}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {view === 'ecoles' && (
        <>
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 rounded-full border-2 border-midi-accent border-t-transparent animate-spin" />
            </div>
          ) : ecolesRanked.length === 0 ? (
            <div className="card p-10 text-center text-slate-500">
              <div className="text-4xl mb-3">🎓</div>
              <p>Aucune école classée pour l'instant.</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="grid grid-cols-[2rem_1fr_auto_auto] items-center gap-3 px-5 py-3
                text-xs text-slate-500 uppercase tracking-wider border-b border-white/10">
                <span>#</span>
                <span>École</span>
                <span className="hidden sm:block text-center">Joueurs</span>
                <span className="text-right">ELO moy.</span>
              </div>
              {ecolesRanked.map((g, i) => (
                <div key={g.ecole.value}
                  className="grid grid-cols-[2rem_1fr_auto_auto] items-center gap-3 px-5 py-3.5
                    border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                  <span className="text-lg text-center w-8 shrink-0">
                    {i < 3 ? medals[i] : <span className="text-slate-500 text-sm font-mono">{i + 1}</span>}
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold truncate text-white">{g.ecole.label}</div>
                    <div className="text-xs text-slate-500 truncate">
                      {g.ecole.category}
                      {g.top && <> · meilleur : <span className="text-slate-400">{g.top.nickname}</span></>}
                    </div>
                  </div>
                  <div className="hidden sm:block text-center text-slate-400 min-w-[60px] text-sm">
                    {g.count}
                  </div>
                  <div className="text-right tabular-nums font-bold min-w-[64px] text-yellow-400">
                    {g.elo.toLocaleString('fr-FR')}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-slate-500 text-center">
            ELO moyen des membres de l'école.
          </p>
        </>
      )}

      {/* CTA non connecté */}
      {!user && (
        <div className="card p-5 flex items-center gap-4 border border-midi-accent/20 bg-midi-accent/5">
          <span className="text-3xl">🏆</span>
          <div className="flex-1">
            <div className="font-semibold text-white">Apparais dans le classement</div>
            <div className="text-sm text-slate-400 mt-0.5">Crée un compte et joue pour gagner de l'XP et grimper dans le top.</div>
          </div>
          <Link to="/auth" className="btn btn-primary text-sm shrink-0">Créer un compte</Link>
        </div>
      )}
    </div>
  )
}
