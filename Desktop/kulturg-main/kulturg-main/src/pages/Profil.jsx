import { useGame, levelFromXP, nextLevelThreshold, BADGES } from '../context/GameContext.jsx'
import { THEME_LIST, THEMES } from '../data/themes.js'

export default function Profil() {
  const { state, reset } = useGame()
  const level = levelFromXP(state.totalXP)
  const next = nextLevelThreshold(state.totalXP)
  const accuracy = state.totalAnswered ? Math.round((state.totalCorrect / state.totalAnswered) * 100) : 0

  return (
    <div className="space-y-6">
      <section className="card p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-midi-accent/10 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center gap-6">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-midi-accent to-amber-600 grid place-items-center font-display text-4xl text-slate-900 shadow-2xl">
            {level}
          </div>
          <div className="flex-1">
            <div className="text-slate-400 text-sm">Niveau {level} · {state.totalXP} XP</div>
            <div className="font-display text-2xl">Maître de Midi en formation</div>
            <div className="mt-3 h-2 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full bg-midi-accent" style={{ width: `${Math.min(100, (state.totalXP / next) * 100)}%` }} />
            </div>
            <div className="text-xs text-slate-400 mt-1">{Math.max(0, next - state.totalXP)} XP avant le niveau {level + 1}</div>
          </div>
          <button onClick={() => { if (confirm('Réinitialiser toutes les statistiques ?')) reset() }} className="btn-ghost self-start">Réinitialiser</button>
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Réponses" value={state.totalAnswered} />
        <Stat label="Bonnes" value={state.totalCorrect} />
        <Stat label="Réussite" value={`${accuracy}%`} />
        <Stat label="Record Duel" value={state.bestDuel} />
        <Stat label="Série actuelle" value={`${state.streak.current} j`} />
        <Stat label="Badges" value={state.badges.length} />
        <Stat label="Cartes mémorisées" value={Object.values(state.srs).filter(c => c.box >= 4).length} />
        <Stat label="Sessions" value={state.history.length} />
      </section>

      <section className="card p-6">
        <h2 className="heading text-xl mb-4">Réussite par thème</h2>
        <div className="space-y-2">
          {THEME_LIST.map(t => {
            const s = state.byTheme[t.id] || { answered: 0, correct: 0 }
            const pct = s.answered ? Math.round((s.correct / s.answered) * 100) : 0
            return (
              <div key={t.id} className="flex items-center gap-3">
                <div className="w-32 shrink-0 text-sm">{t.emoji} {t.label}</div>
                <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className={`h-full bg-gradient-to-r ${t.color}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="w-24 text-right text-xs text-slate-400 tabular-nums">{s.correct}/{s.answered} · {pct}%</div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="heading text-xl mb-4">Badges</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(BADGES).map(([id, b]) => {
            const got = state.badges.includes(id)
            return (
              <div key={id} className={`p-4 rounded-xl border text-center transition ${got ? 'bg-midi-accent/10 border-midi-accent/40' : 'bg-white/5 border-white/10 opacity-60'}`}>
                <div className="text-3xl">{got ? b.emoji : '🔒'}</div>
                <div className="text-sm font-semibold mt-1">{b.label}</div>
              </div>
            )
          })}
        </div>
      </section>

      {state.history.length > 0 && (
        <section className="card p-6">
          <h2 className="heading text-xl mb-4">Dernières sessions</h2>
          <div className="space-y-1 max-h-72 overflow-auto scrollbar-thin">
            {state.history.map((h, i) => (
              <div key={i} className="flex items-center justify-between text-sm p-2 rounded hover:bg-white/5">
                <span className="text-slate-400">{new Date(h.date).toLocaleString('fr-FR')}</span>
                <span className="chip">{h.mode}</span>
                <span className="font-semibold">{h.score}{h.total ? ` / ${h.total}` : ''}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  )
}
