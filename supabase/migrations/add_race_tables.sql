-- ================================================================
-- Course au Points : salles, participants, réponses
-- À exécuter dans Supabase → SQL Editor → New query
-- ================================================================

CREATE TABLE IF NOT EXISTS race_rooms (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text UNIQUE NOT NULL,
  host_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  phase      text NOT NULL DEFAULT 'lobby',
  phase_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS race_participants (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    uuid NOT NULL REFERENCES race_rooms(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at  timestamptz DEFAULT now(),
  UNIQUE (room_id, profile_id)
);

CREATE TABLE IF NOT EXISTS race_answers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     uuid NOT NULL REFERENCES race_rooms(id) ON DELETE CASCADE,
  profile_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  q_idx       int NOT NULL,
  answer_idx  int NOT NULL,
  is_correct  boolean NOT NULL,
  answered_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (room_id, profile_id, q_idx)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_race_parts_room    ON race_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_race_ans_room_q    ON race_answers(room_id, q_idx);

-- RLS
ALTER TABLE race_rooms        ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_participants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_answers       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "race_rooms_select"  ON race_rooms        FOR SELECT USING (true);
CREATE POLICY "race_rooms_insert"  ON race_rooms        FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "race_rooms_update"  ON race_rooms        FOR UPDATE USING (auth.uid() = host_id);

CREATE POLICY "race_parts_select"  ON race_participants FOR SELECT USING (true);
CREATE POLICY "race_parts_insert"  ON race_participants FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "race_ans_select"    ON race_answers      FOR SELECT USING (true);
CREATE POLICY "race_ans_insert"    ON race_answers      FOR INSERT
  WITH CHECK (auth.uid() = profile_id);
