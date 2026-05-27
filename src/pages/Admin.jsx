import { useMemo, useState } from 'react'
import { THEME_LIST, THEMES, DIFFICULTY } from '../data/themes.js'
import { useAllQuestions, useCustomQuestions } from '../hooks/useQuestions.js'
import { addCustomQuestion, deleteCustomQuestion, exportCustomJSON, importCustomJSON } from '../utils/questionStore.js'

const empty = { theme: 'histoire', difficulty: 1, q: '', choices: ['', '', '', ''], answer: 0, explain: '' }

export default function Admin() {
  const all = useAllQuestions()
  const custom = useCustomQuestions()
  const [draft, setDraft] = useState(empty)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    return custom.filter(q =>
      (filter === 'all' || q.theme === filter) &&
      (!search || q.q.toLowerCase().includes(search.toLowerCase()))
    )
  }, [custom, filter, search])

  const counts = useMemo(() => {
    const acc = {}
    all.forEach(q => { acc[q.theme] = (acc[q.theme] || 0) + 1 })
    return acc
  }, [all])

  function setChoice(i, v) {
    setDraft(d => ({ ...d, choices: d.choices.map((c, idx) => idx === i ? v : c) }))
  }
  function addChoice() {
    setDraft(d => ({ ...d, choices: [...d.choices, ''] }))
  }
  function removeChoice(i) {
    setDraft(d => ({
      ...d,
      choices: d.choices.filter((_, idx) => idx !== i),
      answer: d.answer === i ? 0 : d.answer > i ? d.answer - 1 : d.answer,
    }))
  }

  function submit(e) {
    e.preventDefault()
    setError('')
    if (!draft.q.trim()) return setError('La question est vide.')
    const choices = draft.choices.map(c => c.trim()).filter(Boolean)
    if (choices.length < 2) return setError('Il faut au moins 2 propositions.')
    if (draft.answer >= choices.length) return setError("L'index de la bonne réponse est invalide.")
    addCustomQuestion({
      theme: draft.theme,
      difficulty: draft.difficulty,
      q: draft.q.trim(),
      choices,
      answer: draft.answer,
      explain: draft.explain.trim() || undefined,
    })
    setDraft(empty)
  }

  function handleExport() {
    const blob = new Blob([exportCustomJSON()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `douze-coups-de-minuit-questions-${new Date().toISOString().slice(0,10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const n = importCustomJSON(reader.result)
        alert(`${n} question(s) importée(s).`)
      } catch (err) {
        alert('Import échoué : ' + err.message)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="heading text-3xl">Admin · Questions</h1>
          <p className="text-slate-400 text-sm">Ajoute tes propres questions. Elles sont stockées localement (localStorage) et utilisées dans tous les jeux.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-ghost text-sm" disabled={!custom.length}>⬇️ Exporter ({custom.length})</button>
          <label className="btn-ghost text-sm cursor-pointer">
            ⬆️ Importer
            <input type="file" accept="application/json" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </div>

      <section className="card p-5">
        <h2 className="font-semibold mb-3">Nouvelle question</h2>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Thème">
              <select value={draft.theme} onChange={e => setDraft(d => ({ ...d, theme: e.target.value }))} className="input">
                {THEME_LIST.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>)}
              </select>
            </Field>
            <Field label="Difficulté">
              <select value={draft.difficulty} onChange={e => setDraft(d => ({ ...d, difficulty: parseInt(e.target.value, 10) }))} className="input">
                {[1,2,3].map(d => <option key={d} value={d}>{DIFFICULTY[d].label}</option>)}
              </select>
            </Field>
            <Field label="Explication (optionnel)">
              <input value={draft.explain} onChange={e => setDraft(d => ({ ...d, explain: e.target.value }))} className="input" placeholder="Petite explication / contexte" />
            </Field>
          </div>

          <Field label="Question">
            <textarea value={draft.q} onChange={e => setDraft(d => ({ ...d, q: e.target.value }))} rows={2} className="input" placeholder="Ex : Quelle est la capitale de l'Australie ?" />
          </Field>

          <div>
            <div className="text-sm font-semibold mb-2">Propositions ({draft.choices.length})</div>
            <div className="space-y-2">
              {draft.choices.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button type="button" onClick={() => setDraft(d => ({ ...d, answer: i }))}
                    className={`w-9 h-9 rounded-lg border text-sm font-bold shrink-0 ${draft.answer === i ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' : 'bg-white/5 border-white/10 text-slate-400'}`}
                    title="Marquer comme bonne réponse">
                    {draft.answer === i ? '✓' : String.fromCharCode(65 + i)}
                  </button>
                  <input value={c} onChange={e => setChoice(i, e.target.value)} className="input flex-1" placeholder={`Proposition ${String.fromCharCode(65 + i)}`} />
                  {draft.choices.length > 2 && (
                    <button type="button" onClick={() => removeChoice(i)} className="text-rose-400 hover:text-rose-300 px-2">✕</button>
                  )}
                </div>
              ))}
              {draft.choices.length < 6 && (
                <button type="button" onClick={addChoice} className="text-sm text-slate-400 hover:text-white">+ Ajouter une proposition</button>
              )}
            </div>
            <div className="text-xs text-slate-400 mt-2">Clique sur la lettre pour marquer la bonne réponse.</div>
          </div>

          {error && <div className="text-rose-300 text-sm">{error}</div>}
          <button type="submit" className="btn-primary w-full">Ajouter la question</button>
        </form>
      </section>

      <section className="card p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <h2 className="font-semibold">Mes questions ({custom.length})</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={filter} onChange={e => setFilter(e.target.value)} className="input text-sm">
              <option value="all">Tous les thèmes</option>
              {THEME_LIST.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>)}
            </select>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…" className="input text-sm" />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-slate-500 text-sm text-center py-8">Aucune question pour ce filtre.</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(q => (
              <div key={q.id} className="p-3 rounded-lg border border-white/10 bg-white/5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-xs text-slate-400 mb-1">
                      <span className="chip mr-1">{THEMES[q.theme]?.emoji} {THEMES[q.theme]?.label}</span>
                      <span className={`chip ${DIFFICULTY[q.difficulty]?.color}`}>{DIFFICULTY[q.difficulty]?.label}</span>
                    </div>
                    <div className="font-medium">{q.q}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      Réponse : <span className="text-emerald-300">{q.choices[q.answer]}</span> · {q.choices.length} propositions
                    </div>
                  </div>
                  <button onClick={() => { if (confirm('Supprimer cette question ?')) deleteCustomQuestion(q.id) }} className="text-rose-400 hover:text-rose-300 text-sm">Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card p-8 bg-gradient-to-r from-midi-accent/10 to-blue-500/10 border-midi-accent/40 mb-6">
        <div className="text-center">
          <div className="text-7xl font-bold text-midi-accent mb-2">{all.length}</div>
          <div className="text-slate-300 text-lg">questions dans la base totale</div>
          <div className="text-sm text-slate-400 mt-2">{custom.length} personalisées · {all.length - custom.length} intégrées</div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold mb-3">Répartition par thème</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {THEME_LIST.map(t => (
            <div key={t.id} className="rounded-lg bg-white/5 border border-white/10 p-3 text-center">
              <div className="text-2xl">{t.emoji}</div>
              <div className="text-xs text-slate-400">{t.label}</div>
              <div className="font-bold">{counts[t.id] || 0}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold mb-1">{label}</span>
      {children}
    </label>
  )
}
