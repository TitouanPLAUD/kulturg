-- Migration : ajouter la colonne `school` à la table profiles
-- À exécuter dans le SQL Editor Supabase (Dashboard → SQL Editor → New query)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS school text;

-- Backfill : si is_icam = true, on remplit school = 'icam'
UPDATE profiles
  SET school = 'icam'
  WHERE is_icam IS TRUE AND school IS NULL;

-- Index optionnel pour accélérer les regroupements par école
CREATE INDEX IF NOT EXISTS idx_profiles_school ON profiles (school);
