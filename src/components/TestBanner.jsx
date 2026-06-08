export default function TestBanner() {
  return (
    <div className="bg-midi-accent/10 border-b border-midi-accent/20 text-center py-1">
      <span className="text-xs text-slate-300">
        🧪 <span className="font-medium text-white">Phase de test</span>
        <span className="hidden sm:inline text-slate-400"> · signale les bugs via le bouton </span>
        <span className="sm:hidden text-slate-400"> · feedback </span>
        <span className="text-midi-accent font-semibold">💡</span>
      </span>
    </div>
  )
}
