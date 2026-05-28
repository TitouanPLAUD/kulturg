import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMultiplayer } from '../context/MultiplayerContext'
import { supabase } from '../lib/supabase'

export default function MultiplayerResults() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { player, room, roomPlayers, leaveRoom } = useMultiplayer()
  const [detailedPlayers, setDetailedPlayers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!room) { navigate('/multijoueur'); return }
    fetchFinalScores()
  }, [room?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchFinalScores() {
    setLoading(true)
    const { data } = await supabase
      .from('room_players')
      .select('*, players(nickname, avatar)')
      .eq('room_id', room.id)
      .order('score', { ascending: false })
    setDetailedPlayers(data ?? [])
    setLoading(false)
  }

  async function handleLeave() {
    await leaveRoom()
    navigate('/')
  }

  async function handlePlayAgain() {
    await leaveRoom()
    navigate('/multijoueur')
  }

  const sorted = detailedPlayers.length ? detailedPlayers : [...roomPlayers].sort((a, b) => b.score - a.score)

  const medals = ['🥇', '🥈', '🥉']

  const myResult = sorted.find(rp => rp.player_id === player?.id)
  const myRank = sorted.findIndex(rp => rp.player_id === player?.id) + 1

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="text-6xl mb-3">🏆</div>
          <h1 className="font-display text-4xl text-white">Résultats</h1>
          <p className="text-slate-400 mt-1">Partie {code}</p>
        </div>

        {/* Ma position */}
        {myResult && (
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-5 text-center shadow-xl">
            <p className="text-indigo-200 text-sm mb-1">Votre position</p>
            <div className="font-display text-5xl text-white mb-1">
              {medals[myRank - 1] ?? `#${myRank}`}
            </div>
            <p className="text-white font-bold text-lg">{myResult.players?.nickname}</p>
            <div className="flex justify-center gap-6 mt-3">
              <div>
                <div className="text-2xl font-bold text-amber-300">{myResult.score}</div>
                <div className="text-indigo-200 text-xs">XP</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-300">{myResult.correct_count}/{myResult.answered_count}</div>
                <div className="text-indigo-200 text-xs">Corrects</div>
              </div>
            </div>
          </div>
        )}

        {/* Classement */}
        <div className="bg-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-700">
            <span className="font-semibold text-white">Classement final</span>
          </div>
          {loading ? (
            <div className="text-center py-8 text-slate-500">Chargement…</div>
          ) : (
            <div className="divide-y divide-slate-700">
              {sorted.map((rp, rank) => {
                const isMe = rp.player_id === player?.id
                return (
                  <div
                    key={rp.player_id}
                    className={`px-5 py-4 flex items-center gap-3 ${isMe ? 'bg-indigo-600/10' : ''}`}
                  >
                    <span className="text-2xl w-8 text-center">{medals[rank] ?? `${rank + 1}`}</span>
                    <span className="text-2xl">{rp.players?.avatar ?? '🎭'}</span>
                    <div className="flex-1">
                      <div className="text-white font-medium">
                        {rp.players?.nickname ?? '…'}
                        {isMe && <span className="text-indigo-400 text-xs ml-2">(vous)</span>}
                      </div>
                      <div className="text-slate-400 text-xs">
                        {rp.correct_count ?? 0}/{rp.answered_count ?? 0} bonnes réponses
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-amber-400 font-bold text-lg">{rp.score}</div>
                      <div className="text-slate-500 text-xs">XP</div>
                    </div>
                  </div>
                )
              })}
              {sorted.length === 0 && (
                <div className="px-5 py-6 text-slate-500 text-center text-sm">Aucun résultat disponible</div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handlePlayAgain}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all"
          >
            🎮 Rejouer
          </button>
          <button
            onClick={handleLeave}
            className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-all"
          >
            🏠 Accueil
          </button>
        </div>
      </div>
    </div>
  )
}
