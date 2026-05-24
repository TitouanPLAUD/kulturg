import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

// ─── Répliques par contexte ────────────────────────────────────
const PHRASES = {
  lobby: [
    "Bonjour tout le monde ! Bienvenue dans Les 12 Coups de Midi ! 🎉",
    "Qui sera le Maître de Midi aujourd'hui ?",
    "On attend vos adversaires... La bonne humeur est déjà là !",
    "Voulez-vous jouer avec moi ? La question elle est vite répondue !",
  ],
  grand_oral: [
    "C'est parti pour le Grand Oral ! Montrez-moi ce que vous valez ! 🎤",
    "Des questions de culture générale... Vous êtes prêts ?",
    "Allez, on y va ! C'est le Grand Oral !",
  ],
  duel: [
    "LE DUEL ! Les doigts sur les boutons ! Ça va chauffer ! 🔥",
    "Le plus rapide ET le plus précis remporte la mise !",
    "Attention, il faut buzzer ET avoir la bonne réponse !",
  ],
  coup_de_maitre: [
    "Le Coup de Maître ! Attention, les indices s'enchaînent... 🎯",
    "Qui connaît cette mystérieuse personnalité ? Réfléchissez bien !",
    "Plus tôt vous répondez, plus vous gagnez !",
  ],
  etoile_quiz: [
    "L'Étoile Mystérieuse est parmi nous... ⭐ Chut !",
    "Répondez bien, les indices sur l'Étoile se dévoilent !",
    "Attention, chaque bonne réponse vous rapproche de l'Étoile !",
  ],
  etoile_guess: [
    "2 000 euros en jeu ! Qui est cette Étoile Mystérieuse ?! 🌟",
    "C'est le grand moment de vérité ! Vous avez trouvé ?",
    "La révélation approche... Alors, qui est-elle ?",
    "Voilà le moment que tout le monde attendait !",
  ],
  sprint_12_coups: [
    "LES 12 COUPS DE MIDI ! BOUM BOUM BOUM BOUM ! ⚡",
    "Vitesse, précision, concentration ! C'est parti !",
    "On accélère ! 12 coups, 12 questions !",
  ],
  coup_envoi: [
    "C'est le Coup d'Envoi ! Tout le monde est prêt ?",
    "On lance les hostilités ! Quatre candidats, une seule victoire !",
    "Bienvenue dans Les 12 Coups de Midi ! C'est parti !",
  ],
  coup_par_coup: [
    "Le Coup par Coup ! On serre les rangs !",
    "Plus que trois candidats ! Qui va passer au rouge ?",
    "On continue ! Le Coup par Coup commence maintenant !",
  ],
  coup_fatal: [
    "LE COUP FATAL ! Deux candidats, un seul survivant ! 😤",
    "Les chronomètres tournent ! Attention aux mauvaises réponses !",
    "C'est le face à face ! Le Coup Fatal est lancé !",
  ],
  etoile_mysterieuse: [
    "L'heure de vérité ! Qui est l'Étoile Mystérieuse ?! 🌟",
    "10 000 euros sont en jeu ! C'est le grand moment !",
    "Le Maître de Midi tente sa chance ! Allez, on y croit !",
  ],
  correct: [
    "Oh c'est magnifique ! BRAVO ! 👏",
    "Chapeau l'artiste ! Très bien joué !",
    "C'est le bon numéro !!! 🎯",
    "Extraordinaire ! Vous le saviez !",
    "Oh là là, quel talent ! Superbe !",
    "C'est beau, c'est grand, c'est magnifique !",
    "Ah ben voilà ! Bravo bravo bravo !",
    "Quel joueur ! Quel joueur !",
    "On applaudit ! 👏👏👏",
  ],
  wrong: [
    "Ohh, c'est dommage pour vous...",
    "Non non non ! C'est raté !",
    "Pas de chance cette fois... On repart !",
    "On ne peut pas tout savoir, hein !",
    "Aïe aïe aïe... C'est dommage !",
    "Ce n'était pas la bonne réponse... Mais on continue !",
    "Oh non oh non oh non... Dommage !",
  ],
  urgent: [
    "Vite vite vite ! ⏰",
    "Allez allez allez !",
    "DÉPÊCHEZ-VOUS ! Tic tac tic tac !",
    "Plus que quelques secondes !",
    "On y est ! Décidez-vous !",
  ],
  buzz: [
    "BUZZERRR ! 🔔 Qui a été le plus rapide ?",
    "UN BUZZ ! On voit si c'est la bonne réponse !",
    "Et voilà un buzz ! C'est le moment de vérité !",
  ],
  duel_win: [
    "MAGNIFIQUE ! Le buzz ET la bonne réponse ! Bravo !",
    "Le duel est gagné ! C'était parfait !",
    "Quel instinct ! Quel sang-froid !",
  ],
  duel_miss: [
    "Ohhh le buzz raté ! C'est cruel !",
    "Il a buzzé mais la réponse était mauvaise... Dommage !",
  ],
  finished: [
    "Félicitations au Maître de Midi ! 🏆 C'est vous le grand gagnant !",
    "Quelle belle partie ! Bravo à tous les participants !",
    "On se retrouve très bientôt dans Les 12 Coups de Midi !",
    "Le Maître de Midi est couronné ! On applaudit très fort !",
  ],
  thinking: [
    "Réfléchissez bien...",
    "Vous avez le temps, profitez-en !",
    "Alors, vous savez ?",
    "C'est une belle question, n'est-ce pas ?",
    "Prenez votre temps...",
  ],
}

export function pickPhrase(key) {
  const pool = PHRASES[key] ?? PHRASES.thinking
  return pool[Math.floor(Math.random() * pool.length)]
}

// ─── Context ───────────────────────────────────────────────────
const JLRCtx = createContext(null)

export function JLRProvider({ children }) {
  const [state, setState] = useState({ visible: false, mood: 'idle', phrase: '', key: 0 })
  const timerRef = useRef(null)

  const trigger = useCallback((mood, phraseKey, duration = 4800) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setState(s => ({ visible: true, mood, phrase: pickPhrase(phraseKey), key: s.key + 1 }))
    if (duration > 0) {
      timerRef.current = setTimeout(
        () => setState(s => ({ ...s, visible: false })),
        duration
      )
    }
  }, [])

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setState(s => ({ ...s, visible: false }))
  }, [])

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  return (
    <JLRCtx.Provider value={{ trigger, hide }}>
      {children}
      <JLROverlay state={state} />
    </JLRCtx.Provider>
  )
}

export function useJLR() {
  return useContext(JLRCtx) ?? { trigger: () => {}, hide: () => {} }
}

// ─── Moods ─────────────────────────────────────────────────────
const MOODS = {
  excited:   { grad: 'from-yellow-500 to-amber-400',   border: 'border-yellow-400',  face: '😄', anim: 'animate-bounce'   },
  happy:     { grad: 'from-green-500 to-emerald-400',  border: 'border-green-400',   face: '😁', anim: ''                 },
  shocked:   { grad: 'from-orange-500 to-red-500',     border: 'border-orange-400',  face: '😱', anim: ''                 },
  sad:       { grad: 'from-slate-600 to-slate-500',    border: 'border-slate-400',   face: '😔', anim: ''                 },
  urgent:    { grad: 'from-red-600 to-orange-500',     border: 'border-red-400',     face: '😰', anim: 'animate-pulse'    },
  celebrate: { grad: 'from-yellow-400 to-amber-300',   border: 'border-yellow-300',  face: '🥳', anim: 'animate-bounce'   },
  thinking:  { grad: 'from-blue-700 to-indigo-600',    border: 'border-blue-400',    face: '🤔', anim: ''                 },
  idle:      { grad: 'from-amber-700 to-orange-600',   border: 'border-amber-500',   face: '😊', anim: ''                 },
  intro:     { grad: 'from-purple-600 to-indigo-500',  border: 'border-purple-400',  face: '🎬', anim: ''                 },
}

// ─── Overlay ───────────────────────────────────────────────────
function JLROverlay({ state }) {
  const { visible, mood, phrase, key } = state
  const m = MOODS[mood] ?? MOODS.idle

  return (
    <div
      key={key}
      className={`
        fixed bottom-5 left-3 z-50 w-[260px]
        transition-all duration-500 ease-out
        ${visible
          ? 'translate-y-0 opacity-100 scale-100'
          : 'translate-y-20 opacity-0 scale-90 pointer-events-none'}
      `}
    >
      {/* Bulle */}
      <div className="relative bg-white text-slate-900 rounded-2xl rounded-bl-none px-4 py-3 shadow-2xl mb-2.5">
        <p className="text-sm font-semibold leading-snug">{phrase}</p>
        {/* Queue de la bulle */}
        <span className="absolute -bottom-3 left-5 text-white text-xl leading-none select-none">▼</span>
      </div>

      {/* Avatar card */}
      <div className={`flex items-center gap-2.5 bg-gradient-to-r ${m.grad} rounded-2xl px-3 py-2.5 shadow-xl border ${m.border}`}>
        {/* Face avec micro */}
        <div className="relative shrink-0">
          <div className={`
            w-11 h-11 rounded-full bg-black/15 flex items-center justify-center
            text-[1.6rem] shadow-inner ${m.anim}
          `}>
            {m.face}
          </div>
          {/* Micro en bas à droite de l'avatar */}
          <span className="absolute -bottom-0.5 -right-1 text-base leading-none select-none">🎤</span>
        </div>

        {/* Nom */}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-black text-black/80 tracking-widest leading-none uppercase">Jean-Luc</p>
          <p className="text-[9px] text-black/50 leading-none mt-0.5 font-semibold tracking-wide">Les 12 Coups de Midi</p>
        </div>

        {/* Étoile TF1-style */}
        <span className="text-lg shrink-0 opacity-80">⭐</span>
      </div>
    </div>
  )
}
