import { useSettings } from '../context/SettingsContext.jsx'
import { DIFFICULTY } from '../data/themes.js'

export default function Reglages() {
  const { settings, update, reset } = useSettings()

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="heading text-3xl">Réglages</h1>
        <p className="text-slate-400 text-sm mt-1">Personnalise l'affichage et le comportement de KulturG. Toutes les préférences sont sauvegardées sur ton appareil.</p>
      </div>

      {/* APPARENCE */}
      <Section title="Apparence" emoji="🎨">
        <Field label="Thème" hint="Mode clair, sombre ou automatique selon ton système.">
          <SegmentedControl
            value={settings.theme}
            onChange={v => update({ theme: v })}
            options={[
              { value: 'dark',  label: '🌙 Sombre' },
              { value: 'light', label: '☀️ Clair' },
              { value: 'auto',  label: '🖥️ Auto' },
            ]}
          />
        </Field>

        <Field label="Taille du texte" hint="Plus grande pour mieux lire, plus petite pour voir plus d'info.">
          <SegmentedControl
            value={settings.fontSize}
            onChange={v => update({ fontSize: v })}
            options={[
              { value: 'small',  label: 'A' },
              { value: 'normal', label: 'A' },
              { value: 'large',  label: 'A' },
            ]}
            sizes={['text-xs', 'text-base', 'text-xl']}
          />
        </Field>

        <Field label="Contraste élevé" hint="Bordures plus marquées, couleurs plus tranchées.">
          <Toggle value={settings.highContrast} onChange={v => update({ highContrast: v })} />
        </Field>
      </Section>

      {/* MOTION & SON */}
      <Section title="Animations et son" emoji="✨">
        <Field label="Animations" hint="Transitions, effets pop-in, secousses sur erreur.">
          <Toggle value={settings.animations} onChange={v => update({ animations: v })} />
        </Field>
        <Field label="Mouvement réduit" hint="Désactive tout effet rapide (idéal si sensibilité au mouvement).">
          <Toggle value={settings.reducedMotion} onChange={v => update({ reducedMotion: v })} />
        </Field>
        <Field label="Effets sonores" hint="Sons sur bonne/mauvaise réponse (à venir).">
          <Toggle value={settings.sound} onChange={v => update({ sound: v })} />
        </Field>
      </Section>

      {/* JEU */}
      <Section title="Préférences de jeu" emoji="🎮">
        <Field label="Afficher les explications" hint="Montre l'explication après chaque réponse (QCM, Révision).">
          <Toggle value={settings.showExplanations} onChange={v => update({ showExplanations: v })} />
        </Field>

        <Field label="Difficulté par défaut" hint="Sélection auto au démarrage d'un QCM.">
          <SegmentedControl
            value={settings.defaultDifficulty}
            onChange={v => update({ defaultDifficulty: parseInt(v, 10) })}
            options={[
              { value: 0, label: 'Toutes' },
              { value: 1, label: DIFFICULTY[1].label },
              { value: 2, label: DIFFICULTY[2].label },
              { value: 3, label: DIFFICULTY[3].label },
            ]}
          />
        </Field>

        <Field label={`Temps par question QCM : ${settings.qcmTimer}s`} hint="De 10 à 60 secondes par question.">
          <input
            type="range" min="10" max="60" step="5"
            value={settings.qcmTimer}
            onChange={e => update({ qcmTimer: parseInt(e.target.value, 10) })}
            className="w-full accent-midi-accent"
          />
        </Field>
      </Section>

      {/* RESET */}
      <Section title="Données" emoji="🗂️">
        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              if (confirm('Réinitialiser tous les réglages aux valeurs par défaut ?')) reset()
            }}
            className="btn btn-ghost text-sm"
          >
            ↺ Réinitialiser tous les réglages
          </button>
          <p className="text-xs text-slate-500">Cela ne supprime ni ton compte, ni ta progression, ni tes questions personnalisées.</p>
        </div>
      </Section>

      {/* PREVIEW */}
      <Section title="Aperçu" emoji="👁️">
        <div className="card p-4 space-y-3">
          <div className="text-sm text-slate-400 uppercase tracking-widest">Exemple de question</div>
          <div className="text-lg font-semibold">Quelle est la capitale de l'Australie ?</div>
          <div className="grid grid-cols-2 gap-2">
            {['Sydney', 'Melbourne', 'Canberra', 'Perth'].map((c, i) => (
              <div key={i} className={`p-3 rounded-lg border text-sm ${i === 2 ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-white/10 bg-white/5'}`}>
                <span className="inline-flex w-6 h-6 rounded bg-white/10 items-center justify-center mr-2 font-mono text-xs">{String.fromCharCode(65 + i)}</span>
                {c}
              </div>
            ))}
          </div>
        </div>
      </Section>
    </div>
  )
}

function Section({ title, emoji, children }) {
  return (
    <section className="card p-5 space-y-4">
      <h2 className="heading text-xl flex items-center gap-2">
        <span>{emoji}</span> {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function Field({ label, hint, children }) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div className="flex-1 min-w-0">
        <div className="font-medium">{label}</div>
        {hint && <div className="text-xs text-slate-400 mt-0.5">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-12 h-7 rounded-full transition-colors ${value ? 'bg-midi-accent' : 'bg-white/10 border border-white/20'}`}
      aria-pressed={value}
    >
      <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white transition-transform shadow ${value ? 'translate-x-5' : ''}`} />
    </button>
  )
}

function SegmentedControl({ value, onChange, options, sizes }) {
  return (
    <div className="inline-flex rounded-xl bg-white/5 border border-white/10 p-1 gap-1">
      {options.map((opt, i) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-lg text-sm transition ${value === opt.value ? 'bg-midi-accent text-slate-900 font-semibold' : 'text-slate-300 hover:bg-white/5'} ${sizes ? sizes[i] : ''}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
