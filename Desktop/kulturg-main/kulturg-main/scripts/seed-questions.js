/**
 * Script de seeding — insère toutes les questions dans Supabase.
 * Usage : node scripts/seed-questions.js
 */
import { createClient } from '@supabase/supabase-js'
import { QUESTIONS } from '../src/data/questions.js'

const SUPABASE_URL = 'https://yqmgugqxdnqaczntaxjb.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxbWd1Z3F4ZG5xYWN6bnRheGpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NTM0OTYsImV4cCI6MjA5NDIyOTQ5Nn0.UDaTmUMM3IfuHfm0oJzUqTKTZ-N3wUSTbboT3E0rT48'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function seed() {
  console.log(`📦 ${QUESTIONS.length} questions à importer…`)

  const rows = QUESTIONS.map(q => ({
    id: q.id,
    theme: q.theme,
    difficulty: q.difficulty,
    q: q.q,
    choices: q.choices,
    answer: q.answer,
    explain: q.explain ?? null,
  }))

  const BATCH = 100
  let total = 0

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const { error } = await supabase
      .from('questions')
      .upsert(batch, { onConflict: 'id' })

    if (error) {
      console.error(`❌ Erreur lot ${i}–${i + batch.length}:`, error.message)
    } else {
      total += batch.length
      console.log(`✅ ${total}/${rows.length} insérées`)
    }
  }

  // Vérification finale
  const { count } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })

  console.log(`\n🎉 Terminé ! ${count} questions dans Supabase.`)
}

seed().catch(console.error)
