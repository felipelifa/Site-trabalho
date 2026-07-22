-- Fix RLS policies: drop old ones and recreate with proper WITH CHECK for INSERT

-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- companies
DROP POLICY IF EXISTS "Users can view own companies" ON companies;
DROP POLICY IF EXISTS "Users can manage own companies" ON companies;
CREATE POLICY "Users can view own companies" ON companies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own companies" ON companies FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- salary_rules
DROP POLICY IF EXISTS "Users can view own salary rules" ON salary_rules;
DROP POLICY IF EXISTS "Users can manage own salary rules" ON salary_rules;
CREATE POLICY "Users can view own salary rules" ON salary_rules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own salary rules" ON salary_rules FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- work_weeks
DROP POLICY IF EXISTS "Users can view own work weeks" ON work_weeks;
DROP POLICY IF EXISTS "Users can manage own work weeks" ON work_weeks;
CREATE POLICY "Users can view own work weeks" ON work_weeks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own work weeks" ON work_weeks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- work_days
DROP POLICY IF EXISTS "Users can view own work days" ON work_days;
DROP POLICY IF EXISTS "Users can manage own work days" ON work_days;
CREATE POLICY "Users can view own work days" ON work_days FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own work days" ON work_days FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- payments
DROP POLICY IF EXISTS "Users can view own payments" ON payments;
DROP POLICY IF EXISTS "Users can manage own payments" ON payments;
CREATE POLICY "Users can view own payments" ON payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own payments" ON payments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- receipts
DROP POLICY IF EXISTS "Users can view own receipts" ON receipts;
DROP POLICY IF EXISTS "Users can manage own receipts" ON receipts;
CREATE POLICY "Users can view own receipts" ON receipts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own receipts" ON receipts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- notes
DROP POLICY IF EXISTS "Users can view own notes" ON notes;
DROP POLICY IF EXISTS "Users can manage own notes" ON notes;
CREATE POLICY "Users can view own notes" ON notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own notes" ON notes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- checklists
DROP POLICY IF EXISTS "Users can view own checklists" ON checklists;
DROP POLICY IF EXISTS "Users can manage own checklists" ON checklists;
CREATE POLICY "Users can view own checklists" ON checklists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own checklists" ON checklists FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- settings
DROP POLICY IF EXISTS "Users can view own settings" ON settings;
DROP POLICY IF EXISTS "Users can manage own settings" ON settings;
CREATE POLICY "Users can view own settings" ON settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own settings" ON settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- municipal_holidays
DROP POLICY IF EXISTS "Users can view own municipal holidays" ON municipal_holidays;
DROP POLICY IF EXISTS "Users can manage own municipal holidays" ON municipal_holidays;
CREATE POLICY "Users can view own municipal holidays" ON municipal_holidays FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own municipal holidays" ON municipal_holidays FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- reminders
DROP POLICY IF EXISTS "Users can view own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can manage own reminders" ON reminders;
CREATE POLICY "Users can view own reminders" ON reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own reminders" ON reminders FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
