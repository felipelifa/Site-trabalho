-- =====================================================
-- ADMIN MODULE MIGRATION
-- =====================================================

-- Create vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  license_plate TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create employees table (managed by admin)
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'Funcionario',
  city TEXT,
  status TEXT CHECK (status IN ('active', 'vacation', 'away', 'inactive')) DEFAULT 'active',
  photo_url TEXT,
  last_access TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  leader_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create team_members table (junction)
CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, employee_id)
);

-- Create operations table (weekly planning per team)
CREATE TABLE IF NOT EXISTS operations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  destination TEXT CHECK (destination IN ('Porto', 'Lisboa', 'Algarve')) NOT NULL,
  company_name TEXT,
  company_location TEXT,
  leader_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  notes TEXT,
  status TEXT CHECK (status IN ('draft', 'published')) DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, year, week_number)
);

-- Create operation_history table
CREATE TABLE IF NOT EXISTS operation_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  operation_id UUID REFERENCES operations(id) ON DELETE CASCADE NOT NULL,
  admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create employee_daily_records table (for employee confirmations)
CREATE TABLE IF NOT EXISTS employee_daily_records (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  operation_id UUID REFERENCES operations(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  confirmed_presence BOOLEAN DEFAULT FALSE,
  work_started BOOLEAN DEFAULT FALSE,
  work_ended BOOLEAN DEFAULT FALSE,
  slept_away BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_admin_id ON vehicles(admin_id);
CREATE INDEX IF NOT EXISTS idx_employees_admin_id ON employees(admin_id);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(admin_id, status);
CREATE INDEX IF NOT EXISTS idx_teams_admin_id ON teams(admin_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_employee_id ON team_members(employee_id);
CREATE INDEX IF NOT EXISTS idx_operations_admin_id ON operations(admin_id);
CREATE INDEX IF NOT EXISTS idx_operations_team_id ON operations(team_id);
CREATE INDEX IF NOT EXISTS idx_operations_week ON operations(year, week_number);
CREATE INDEX IF NOT EXISTS idx_operation_history_operation_id ON operation_history(operation_id);
CREATE INDEX IF NOT EXISTS idx_employee_daily_records_employee_id ON employee_daily_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_daily_records_date ON employee_daily_records(date);

-- Enable Row Level Security
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_daily_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vehicles
CREATE POLICY "Admin can manage own vehicles" ON vehicles
  FOR ALL USING (auth.uid() = admin_id) WITH CHECK (auth.uid() = admin_id);

-- RLS Policies for employees
CREATE POLICY "Admin can manage own employees" ON employees
  FOR ALL USING (auth.uid() = admin_id) WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "Employee can view own record" ON employees
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for teams
CREATE POLICY "Admin can manage own teams" ON teams
  FOR ALL USING (auth.uid() = admin_id) WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "Employee can view teams in admin" ON teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid() AND e.admin_id = teams.admin_id
    )
  );

-- RLS Policies for team_members
CREATE POLICY "Admin can manage team members" ON team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM teams t WHERE t.id = team_members.team_id AND t.admin_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams t WHERE t.id = team_members.team_id AND t.admin_id = auth.uid()
    )
  );

CREATE POLICY "Employee can view own team membership" ON team_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employees e WHERE e.id = team_members.employee_id AND e.user_id = auth.uid()
    )
  );

-- RLS Policies for operations
CREATE POLICY "Admin can manage own operations" ON operations
  FOR ALL USING (auth.uid() = admin_id) WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "Employee can view operations for their admin" ON operations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid() AND e.admin_id = operations.admin_id
    )
  );

-- RLS Policies for operation_history
CREATE POLICY "Admin can manage operation history" ON operation_history
  FOR ALL USING (auth.uid() = admin_id) WITH CHECK (auth.uid() = admin_id);

-- RLS Policies for employee_daily_records
CREATE POLICY "Employee can manage own daily records" ON employee_daily_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM employees e WHERE e.id = employee_daily_records.employee_id AND e.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e WHERE e.id = employee_daily_records.employee_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin can view daily records for their employees" ON employee_daily_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = employee_daily_records.employee_id AND e.admin_id = auth.uid()
    )
  );

CREATE POLICY "Admin can update daily records for their employees" ON employee_daily_records
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = employee_daily_records.employee_id AND e.admin_id = auth.uid()
    )
  );
