-- ================================================================
-- Chat : conversations (DM + groupes), membres, messages
-- À exécuter dans Supabase → SQL Editor → New query
-- ================================================================

-- 1. Table des conversations
CREATE TABLE IF NOT EXISTS conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type        text NOT NULL CHECK (type IN ('dm', 'group')),
  name        text,                          -- NULL pour DM, nom du groupe sinon
  created_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);

-- 2. Membres d'une conversation
CREATE TABLE IF NOT EXISTS conversation_members (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  profile_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at        timestamptz DEFAULT now(),
  UNIQUE (conversation_id, profile_id)
);

-- 3. Messages
CREATE TABLE IF NOT EXISTS messages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id        uuid REFERENCES profiles(id) ON DELETE SET NULL,
  content          text NOT NULL,
  created_at       timestamptz DEFAULT now()
);

-- ================================================================
-- Index
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_conv_members_profile ON conversation_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_conv_members_conv    ON conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conv        ON messages(conversation_id, created_at DESC);

-- ================================================================
-- RLS
-- ================================================================
ALTER TABLE conversations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages             ENABLE ROW LEVEL SECURITY;

-- Conversations : visible si membre
CREATE POLICY "conv_select" ON conversations FOR SELECT
  USING (id IN (
    SELECT conversation_id FROM conversation_members WHERE profile_id = auth.uid()
  ));

CREATE POLICY "conv_insert" ON conversations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Membres : visible si dans la même conv
CREATE POLICY "members_select" ON conversation_members FOR SELECT
  USING (conversation_id IN (
    SELECT conversation_id FROM conversation_members WHERE profile_id = auth.uid()
  ));

CREATE POLICY "members_insert" ON conversation_members FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Messages : visible si membre de la conv
CREATE POLICY "messages_select" ON messages FOR SELECT
  USING (conversation_id IN (
    SELECT conversation_id FROM conversation_members WHERE profile_id = auth.uid()
  ));

CREATE POLICY "messages_insert" ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    conversation_id IN (
      SELECT conversation_id FROM conversation_members WHERE profile_id = auth.uid()
    )
  );
