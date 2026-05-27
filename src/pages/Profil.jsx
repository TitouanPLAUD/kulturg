import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useGame, levelFromXP, nextLevelThreshold, BADGES } from '../context/GameContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import { THEME_LIST } from '../data/themes.js'
import SchoolPicker from '../components/SchoolPicker.jsx'

export default function Profil() {
  const { state, reset } = useGame()
  const { user, profile } = useAuth()
  const level = levelFromXP(state.totalXP)
  const next  = nextLevelThreshold(state.totalXP)
  const accuracy = state.totalAnswered
    ? Math.round((state.totalCorrect / state.totalAnswered) * 100)
    : 0
  const xpPct = next > 0 ? Math.min(100, (state.totalXP / next) * 100) : 100

  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      {/* Carte identité */}
      <section className="card p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-midi-accent/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">

          {/* Avatar / niveau */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-midi-accent to-amber-600 grid place-items-center font-display text-3xl text-slate-900 shadow-xl shrink-0 select-none">
            {user && profile ? profile.avatar : level}
          </div>

          <div className="flex-1 min-w-0">
            {user && profile ? (
              <div className="text-xl font-bold text-white truncate">{profile.nickname}</div>
            ) : (
              <div className="text-xl font-bold text-white">Joueur local</div>
            )}
            <div className="text-slate-400 text-sm mt-0.5">
              Niveau {level} · {state.totalXP.toLocaleString('fr-FR')} XP
            </div>

            {/* Barre XP */}
            <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-midi-accent to-amber-400 transition-all duration-700"
                style={{ width: `${xpPct}%` }}
              />
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {next > state.totalXP
                ? `${(next - state.totalXP).toLocaleString('fr-FR')} XP avant le niveau ${level + 1}`
                : 'Niveau maximum atteint 🏆'}
            </div>
          </div>

          <div className="flex flex-col gap-2 items-end shrink-0">
            {user && (
              <Link to="/amis" className="btn btn-secondary text-xs px-3 py-1.5">
                👥 Mes amis
              </Link>
            )}
            <button
              onClick={() => { if (confirm('Réinitialiser toutes les statistiques ?')) reset() }}
              className="btn btn-ghost text-xs px-3 py-1.5 text-slate-500">
              Réinitialiser
            </button>
          </div>
        </div>
      </section>

      {/* Compte non connecté */}
      {!user && (
        <div className="card p-4 flex items-center gap-3 border border-midi-accent/20 bg-midi-accent/5">
          <span className="text-2xl">🔐</span>
          <div className="flex-1">
            <div className="text-sm font-medium text-white">Progression locale uniquement</div>
            <div className="text-xs text-slate-400 mt-0.5">Connecte-toi pour sauvegarder et retrouver tes stats partout.</div>
          </div>
          <Link to="/auth" className="btn btn-primary text-xs px-3 py-1.5 shrink-0">Connexion</Link>
        </div>
      )}

      {/* Localisation & ICAM */}
      {user && profile && <LocationCard profile={profile} />}

      {/* Stats */}
      <section>
        <h2 className="heading text-lg mb-3 text-slate-300 uppercase tracking-wider text-xs">Statistiques</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Réponses" value={state.totalAnswered} />
          <Stat label="Correctes" value={state.totalCorrect} />
          <Stat label="Réussite" value={`${accuracy} %`} accent />
          <Stat label="Record Duel" value={state.bestDuel} />
          <Stat label="Série" value={`${state.streak.current} j 🔥`} />
          <Stat label="Badges" value={`${state.badges.length} / ${Object.keys(BADGES).length}`} />
          <Stat label="Cartes SRS" value={Object.values(state.srs).filter(c => c.box >= 4).length} />
          <Stat label="Sessions" value={state.history.length} />
        </div>
      </section>

      {/* Réussite par thème */}
      <section className="card p-5">
        <h2 className="heading text-xl mb-4">Par thème</h2>
        <div className="space-y-2.5">
          {THEME_LIST.map(t => {
            const s = state.byTheme[t.id] || { answered: 0, correct: 0 }
            const pct = s.answered ? Math.round((s.correct / s.answered) * 100) : 0
            return (
              <div key={t.id} className="flex items-center gap-3">
                <div className="w-28 shrink-0 text-sm flex items-center gap-1.5">
                  <span>{t.emoji}</span>
                  <span className="truncate">{t.label}</span>
                </div>
                <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${t.color} transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="w-20 text-right text-xs text-slate-400 tabular-nums">
                  {s.answered ? `${s.correct}/${s.answered} · ${pct}%` : '—'}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Badges */}
      <section className="card p-5">
        <h2 className="heading text-xl mb-4">Badges</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.entries(BADGES).map(([id, b]) => {
            const got = state.badges.includes(id)
            return (
              <div key={id}
                className={`p-4 rounded-xl border text-center transition-all ${
                  got
                    ? 'bg-midi-accent/10 border-midi-accent/30 shadow-lg shadow-midi-accent/5'
                    : 'bg-white/3 border-white/8 opacity-50'
                }`}>
                <div className="text-3xl mb-1">{got ? b.emoji : '🔒'}</div>
                <div className="text-xs font-semibold">{b.label}</div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Historique */}
      {state.history.length > 0 && (
        <section className="card p-5">
          <h2 className="heading text-xl mb-4">Dernières sessions</h2>
          <div className="space-y-1 max-h-64 overflow-auto scrollbar-thin pr-1">
            {state.history.map((h, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-white/5 gap-2">
                <span className="text-slate-500 text-xs tabular-nums shrink-0">
                  {new Date(h.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                </span>
                <span className="chip text-xs">{h.mode}</span>
                <span className="font-semibold tabular-nums">
                  {h.score}{h.total ? ` / ${h.total}` : ''}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function LocationCard({ profile }) {
  const [country, setCountry] = useState(profile.country ?? '')
  const [city,    setCity]    = useState(profile.city    ?? '')
  const [school,  setSchool]  = useState(profile.school  ?? (profile.is_icam ? 'icam' : null))
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('profiles').update({
      country: country.trim() || null,
      city:    city.trim()    || null,
      school:  school || null,
      is_icam: school === 'icam', // rétrocompat
    }).eq('id', profile.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <section className="card p-5">
      <h2 className="heading text-xl mb-4">Localisation &amp; Classement</h2>
      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Pays</label>
            <input className="input w-full" placeholder="France"
              value={country} onChange={e => setCountry(e.target.value)} maxLength={50} />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Ville</label>
            <input className="input w-full" placeholder="Paris"
              value={city} onChange={e => setCity(e.target.value)} maxLength={50} />
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">École 🎓 <span className="text-slate-500 text-xs">(pour la compétition inter-écoles)</span></label>
          <SchoolPicker value={school} onChange={setSchool} />
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving}
            className="btn btn-primary text-sm px-4 py-2 disabled:opacity-60">
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          {saved && <span className="text-green-400 text-sm">✓ Sauvegardé</span>}
        </div>
      </form>
    </section>
  )
}

function Stat({ label, value, accent }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${
      accent ? 'bg-midi-accent/10 border-midi-accent/30' : 'bg-white/5 border-white/10'
    }`}>
      <div className={`text-xs mb-0.5 ${accent ? 'text-midi-accent' : 'text-slate-400'}`}>{label}</div>
      <div className={`text-xl font-bold tabular-nums ${accent ? 'text-midi-accent' : 'text-white'}`}>{value}</div>
    </div>
  )
}
