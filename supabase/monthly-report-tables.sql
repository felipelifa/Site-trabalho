-- =============================================
-- MONTHLY REPORT TABLES
-- New tables for the "Relatório Mensal" feature
-- =============================================

-- Month-level notes/diary
CREATE TABLE IF NOT EXISTS month_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month INT NOT NULL CHECK (month >= 1 AND month <= 12),
  year INT NOT NULL CHECK (year >= 2020),
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, month, year)
);

-- Month-level checklists
CREATE TABLE IF NOT EXISTS month_checklists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month INT NOT NULL CHECK (month >= 1 AND month <= 12),
  year INT NOT NULL CHECK (year >= 2020),
  item TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Month-level tags
CREATE TABLE IF NOT EXISTS month_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month INT NOT NULL CHECK (month >= 1 AND month <= 12),
  year INT NOT NULL CHECK (year >= 2020),
  tag TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, month, year, tag)
);

-- Month-level attachments/files
CREATE TABLE IF NOT EXISTS month_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month INT NOT NULL CHECK (month >= 1 AND month <= 12),
  year INT NOT NULL CHECK (year >= 2020),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Month-level ratings
CREATE TABLE IF NOT EXISTS month_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month INT NOT NULL CHECK (month >= 1 AND month <= 12),
  year INT NOT NULL CHECK (year >= 2020),
  rating INT CHECK (rating >= 1 AND rating <= 5),
  reflection TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, month, year)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_month_notes_user_period ON month_notes(user_id, year, month);
CREATE INDEX IF NOT EXISTS idx_month_checklists_user_period ON month_checklists(user_id, year, month);
CREATE INDEX IF NOT EXISTS idx_month_tags_user_period ON month_tags(user_id, year, month);
CREATE INDEX IF NOT EXISTS idx_month_attachments_user_period ON month_attachments(user_id, year, month);
CREATE INDEX IF NOT EXISTS idx_month_ratings_user_period ON month_ratings(user_id, year, month);

-- RLS
ALTER TABLE month_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE month_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE month_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE month_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE month_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies - month_notes
CREATE POLICY "Users can view own month_notes" ON month_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own month_notes" ON month_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own month_notes" ON month_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own month_notes" ON month_notes FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies - month_checklists
CREATE POLICY "Users can view own month_checklists" ON month_checklists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own month_checklists" ON month_checklists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own month_checklists" ON month_checklists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own month_checklists" ON month_checklists FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies - month_tags
CREATE POLICY "Users can view own month_tags" ON month_tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own month_tags" ON month_tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own month_tags" ON month_tags FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies - month_attachments
CREATE POLICY "Users can view own month_attachments" ON month_attachments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own month_attachments" ON month_attachments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own month_attachments" ON month_attachments FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies - month_ratings
CREATE POLICY "Users can view own month_ratings" ON month_ratings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own month_ratings" ON month_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own month_ratings" ON month_ratings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own month_ratings" ON month_ratings FOR DELETE USING (auth.uid() = user_id);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_month_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_month_notes_updated_at
  BEFORE UPDATE ON month_notes
  FOR EACH ROW EXECUTE FUNCTION update_month_notes_updated_at();

CREATE OR REPLACE FUNCTION update_month_checklists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_month_checklists_updated_at
  BEFORE UPDATE ON month_checklists
  FOR EACH ROW EXECUTE FUNCTION update_month_checklists_updated_at();

CREATE OR REPLACE FUNCTION update_month_ratings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_month_ratings_updated_at
  BEFORE UPDATE ON month_ratings
  FOR EACH ROW EXECUTE FUNCTION update_month_ratings_updated_at();
