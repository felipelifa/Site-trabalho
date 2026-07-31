import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type Tables = Database['public']['Tables']

// =====================================================
// VEHICLES SERVICE
// =====================================================
export const vehiclesService = {
  async getAll(adminId: string) {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('admin_id', adminId)
      .order('name', { ascending: true })
    if (error) throw error
    return data
  },

  async create(vehicle: Tables['vehicles']['Insert']) {
    const { data, error } = await supabase
      .from('vehicles')
      .insert(vehicle)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, vehicle: Partial<Tables['vehicles']['Update']>) {
    const { data, error } = await supabase
      .from('vehicles')
      .update(vehicle)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}

// =====================================================
// EMPLOYEES SERVICE
// =====================================================
export const employeesService = {
  async getAll(adminId: string) {
    const { data, error } = await supabase
      .from('employees')
      .select(`
        *,
        teams:team_members(
          team:teams(id, name, color)
        )
      `)
      .eq('admin_id', adminId)
      .order('full_name', { ascending: true })
    if (error) throw error
    return data
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('employees')
      .select(`
        *,
        teams:team_members(
          team:teams(id, name, color)
        )
      `)
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async create(employee: Tables['employees']['Insert']) {
    const { data, error } = await supabase
      .from('employees')
      .insert(employee)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, employee: Partial<Tables['employees']['Update']>) {
    const { data, error } = await supabase
      .from('employees')
      .update(employee)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  async getByStatus(adminId: string, status: 'active' | 'vacation' | 'away' | 'inactive') {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('admin_id', adminId)
      .eq('status', status)
      .order('full_name', { ascending: true })
    if (error) throw error
    return data
  },

  async getWithoutTeam(adminId: string) {
    const { data: teamMemberRows } = await supabase
      .from('team_members')
      .select('employee_id')
    const memberIds = new Set((teamMemberRows || []).map(r => r.employee_id))

    const { data, error } = await supabase
      .from('employees')
      .select(`
        id, full_name, role, phone, city, status, photo_url
      `)
      .eq('admin_id', adminId)
      .order('full_name', { ascending: true })
    if (error) throw error
    return (data || []).filter(e => !memberIds.has(e.id))
  },

  async searchByName(adminId: string, query: string) {
    const { data, error } = await supabase
      .from('employees')
      .select(`
        *,
        teams:team_members(
          team:teams(id, name, color)
        )
      `)
      .eq('admin_id', adminId)
      .ilike('full_name', `%${query}%`)
      .order('full_name', { ascending: true })
    if (error) throw error
    return data
  },
}

// =====================================================
// TEAMS SERVICE
// =====================================================
export const teamsService = {
  async getAll(adminId: string) {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        leader:employees!teams_leader_id_fkey(id, full_name, photo_url),
        vehicle:vehicles!teams_vehicle_id_fkey(id, name, license_plate),
        members:team_members(
          employee:employees(id, full_name, role, phone, city, status, photo_url)
        )
      `)
      .eq('admin_id', adminId)
      .order('name', { ascending: true })
    if (error) throw error
    return data
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        leader:employees!teams_leader_id_fkey(id, full_name, photo_url),
        vehicle:vehicles!teams_vehicle_id_fkey(id, name, license_plate),
        members:team_members(
          employee:employees(id, full_name, role, phone, city, status, photo_url)
        )
      `)
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async create(team: Tables['teams']['Insert']) {
    const { data, error } = await supabase
      .from('teams')
      .insert(team)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, team: Partial<Tables['teams']['Update']>) {
    const { data, error } = await supabase
      .from('teams')
      .update(team)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  async addMember(teamId: string, employeeId: string) {
    const { data, error } = await supabase
      .from('team_members')
      .insert({ team_id: teamId, employee_id: employeeId })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async removeMember(teamId: string, employeeId: string) {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('employee_id', employeeId)
    if (error) throw error
  },

  async setMembers(teamId: string, employeeIds: string[]) {
    await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)

    if (employeeIds.length === 0) return

    const { error } = await supabase
      .from('team_members')
      .insert(employeeIds.map(id => ({ team_id: teamId, employee_id: id })))
    if (error) throw error
  },
}

// =====================================================
// OPERATIONS SERVICE
// =====================================================
export const operationsService = {
  async getByWeek(adminId: string, year: number, weekNumber: number) {
    const { data, error } = await supabase
      .from('operations')
      .select(`
        *,
        team:teams(id, name, color),
        leader:employees!operations_leader_id_fkey(id, full_name, photo_url),
        vehicle:vehicles!operations_vehicle_id_fkey(id, name, license_plate)
      `)
      .eq('admin_id', adminId)
      .eq('year', year)
      .eq('week_number', weekNumber)
      .order('team(name)', { ascending: true })
    if (error) throw error
    return data
  },

  async getAll(adminId: string) {
    const { data, error } = await supabase
      .from('operations')
      .select(`
        *,
        team:teams(id, name, color),
        leader:employees!operations_leader_id_fkey(id, full_name, photo_url),
        vehicle:vehicles!operations_vehicle_id_fkey(id, name, license_plate)
      `)
      .eq('admin_id', adminId)
      .order('year', { ascending: false })
      .order('week_number', { ascending: false })
    if (error) throw error
    return data
  },

  async create(operation: Tables['operations']['Insert']) {
    const { data, error } = await supabase
      .from('operations')
      .insert(operation)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, operation: Partial<Tables['operations']['Update']>) {
    const { data, error } = await supabase
      .from('operations')
      .update(operation)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('operations')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  async publish(id: string) {
    const { data, error } = await supabase
      .from('operations')
      .update({ 
        status: 'published', 
        published_at: new Date().toISOString() 
      })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async unpublish(id: string) {
    const { data, error } = await supabase
      .from('operations')
      .update({ 
        status: 'draft', 
        published_at: null 
      })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async getPublishedForEmployee(employeeId: string) {
    const { data: teamMembers, error: tmError } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('employee_id', employeeId)
    
    if (tmError) throw tmError
    if (!teamMembers || teamMembers.length === 0) return []

    const teamIds = teamMembers.map(tm => tm.team_id)

    const now = new Date()
    const weekNumber = Math.ceil(((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000 + new Date(now.getFullYear(), 0, 1).getDay() + 1) / 7)
    const year = now.getFullYear()

    const { data, error } = await supabase
      .from('operations')
      .select(`
        *,
        team:teams(id, name, color),
        leader:employees!operations_leader_id_fkey(id, full_name, photo_url),
        vehicle:vehicles!operations_vehicle_id_fkey(id, name, license_plate)
      `)
      .eq('status', 'published')
      .in('team_id', teamIds)
      .eq('year', year)
      .eq('week_number', weekNumber)
    
    if (error) throw error
    return data
  },
}

// =====================================================
// OPERATION HISTORY SERVICE
// =====================================================
export const operationHistoryService = {
  async getByOperation(operationId: string) {
    const { data, error } = await supabase
      .from('operation_history')
      .select('*')
      .eq('operation_id', operationId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async getAll(adminId: string, limit = 50) {
    const { data, error } = await supabase
      .from('operation_history')
      .select(`
        *,
        operation:operations(
          id,
          team:teams(name)
        )
      `)
      .eq('admin_id', adminId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data
  },

  async create(history: Tables['operation_history']['Insert']) {
    const { data, error } = await supabase
      .from('operation_history')
      .insert(history)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async logChange(
    operationId: string, 
    adminId: string, 
    fieldName: string, 
    oldValue: string | null, 
    newValue: string | null
  ) {
    return this.create({
      operation_id: operationId,
      admin_id: adminId,
      field_name: fieldName,
      old_value: oldValue,
      new_value: newValue,
    })
  },
}

// =====================================================
// EMPLOYEE DAILY RECORDS SERVICE
// =====================================================
export const employeeDailyRecordsService = {
  async getByDate(employeeId: string, date: string) {
    const { data, error } = await supabase
      .from('employee_daily_records')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', date)
      .maybeSingle()
    if (error) throw error
    return data
  },

  async getByEmployee(employeeId: string) {
    const { data, error } = await supabase
      .from('employee_daily_records')
      .select('*')
      .eq('employee_id', employeeId)
      .order('date', { ascending: false })
    if (error) throw error
    return data
  },

  async upsert(record: Tables['employee_daily_records']['Insert']) {
    const { data, error } = await supabase
      .from('employee_daily_records')
      .upsert(record, { onConflict: 'employee_id,date' })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, record: Partial<Tables['employee_daily_records']['Update']>) {
    const { data, error } = await supabase
      .from('employee_daily_records')
      .update(record)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async getByAdminAndDate(adminId: string, date: string) {
    const { data: empRows } = await supabase
      .from('employees')
      .select('id')
      .eq('admin_id', adminId)
    const empIds = (empRows || []).map(e => e.id)
    if (empIds.length === 0) return []

    const { data, error } = await supabase
      .from('employee_daily_records')
      .select(`
        *,
        employee:employees(id, full_name, role, photo_url, city, status)
      `)
      .eq('date', date)
      .in('employee_id', empIds)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },
}

// =====================================================
// ADMIN STATS SERVICE
// =====================================================
export const adminStatsService = {
  async getDashboardStats(adminId: string) {
    const now = new Date()
    const currentYear = now.getFullYear()
    const weekNumber = Math.ceil(((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000 + new Date(now.getFullYear(), 0, 1).getDay() + 1) / 7)

    const [employeesResult, teamsResult, operationsResult, vacationResult, awayResult] = await Promise.all([
      supabase
        .from('employees')
        .select('id, status', { count: 'exact' })
        .eq('admin_id', adminId)
        .eq('status', 'active'),
      supabase
        .from('teams')
        .select('id', { count: 'exact' })
        .eq('admin_id', adminId),
      supabase
        .from('operations')
        .select('id, status', { count: 'exact' })
        .eq('admin_id', adminId)
        .eq('year', currentYear)
        .eq('week_number', weekNumber),
      supabase
        .from('employees')
        .select('id', { count: 'exact' })
        .eq('admin_id', adminId)
        .eq('status', 'vacation'),
      supabase
        .from('employees')
        .select('id', { count: 'exact' })
        .eq('admin_id', adminId)
        .eq('status', 'away'),
    ])

    const totalEmployees = (employeesResult.count || 0) + (vacationResult.count || 0) + (awayResult.count || 0)
    const activeEmployees = employeesResult.count || 0
    const teamsCount = teamsResult.count || 0
    const publishedOps = operationsResult.data?.filter(o => o.status === 'published').length || 0
    const totalOps = operationsResult.count || 0
    const competencyPercent = totalOps > 0 ? Math.round((publishedOps / totalOps) * 100) : 0
    const vacationCount = vacationResult.count || 0
    const awayCount = awayResult.count || 0

    return {
      totalEmployees,
      activeEmployees,
      teamsCount,
      competencyPercent,
      publishedOps,
      totalOps,
      vacationCount,
      awayCount,
      pendingCount: totalOps - publishedOps,
    }
  },
}
