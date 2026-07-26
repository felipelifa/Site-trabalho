import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type Tables = Database['public']['Tables']

// Profile operations
export const profileService = {
  async get(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    return data
  },

  async upsertProfile(userId: string, profile: Partial<Tables['profiles']['Insert']>) {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ ...profile, user_id: userId })
      .select()
      .single()
    if (error) throw error
    return data
  },
}

// Settings operations
export const settingsService = {
  async get(userId: string) {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    return data
  },

  async upsert(userId: string, settings: Partial<Tables['settings']['Insert']>) {
    const { data, error } = await supabase
      .from('settings')
      .upsert({ ...settings, user_id: userId })
      .select()
      .single()
    if (error) throw error
    return data
  },
}

// Salary Rules operations
export const salaryRulesService = {
  async getAll(userId: string) {
    const { data, error } = await supabase
      .from('salary_rules')
      .select('*')
      .eq('user_id', userId)
      .order('priority', { ascending: false })
    if (error) throw error
    return data
  },

  async create(rule: Tables['salary_rules']['Insert']) {
    const { data, error } = await supabase
      .from('salary_rules')
      .insert(rule)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, rule: Partial<Tables['salary_rules']['Update']>) {
    const { data, error } = await supabase
      .from('salary_rules')
      .update(rule)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('salary_rules')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  async seedDefaults(userId: string) {
    const { data: existing } = await supabase
      .from('salary_rules')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
    if (existing && existing.length > 0) return false

    const defaults: Tables['salary_rules']['Insert'][] = [
      { user_id: userId, name: 'Semana Lisboa', type: 'base', amount: 140, condition_type: 'week_city', condition_value: 'Lisboa', city: 'Lisboa', is_holiday: false, is_vacation: false, is_absence: false, active: true, priority: 10 },
      { user_id: userId, name: 'Semana Algarve', type: 'base', amount: 140, condition_type: 'week_city', condition_value: 'Algarve', city: 'Algarve', is_holiday: false, is_vacation: false, is_absence: false, active: true, priority: 10 },
      { user_id: userId, name: 'Semana Porto', type: 'base', amount: 50, condition_type: 'week_city', condition_value: 'Porto', city: 'Porto', is_holiday: false, is_vacation: false, is_absence: false, active: true, priority: 10 },
      { user_id: userId, name: 'Sábado Lisboa', type: 'overtime', amount: 110, condition_type: 'saturday', condition_value: 'Lisboa', city: 'Lisboa', day_of_week: 6, is_holiday: false, is_vacation: false, is_absence: false, active: true, priority: 20 },
      { user_id: userId, name: 'Sábado Algarve', type: 'overtime', amount: 110, condition_type: 'saturday', condition_value: 'Algarve', city: 'Algarve', day_of_week: 6, is_holiday: false, is_vacation: false, is_absence: false, active: true, priority: 20 },
      { user_id: userId, name: 'Sábado Porto', type: 'overtime', amount: 80, condition_type: 'saturday', condition_value: 'Porto', city: 'Porto', day_of_week: 6, is_holiday: false, is_vacation: false, is_absence: false, active: true, priority: 20 },
      { user_id: userId, name: 'Feriado Lisboa', type: 'bonus', amount: 110, condition_type: 'holiday', condition_value: 'Lisboa', city: 'Lisboa', is_holiday: true, is_vacation: false, is_absence: false, active: true, priority: 30 },
      { user_id: userId, name: 'Feriado Algarve', type: 'bonus', amount: 110, condition_type: 'holiday', condition_value: 'Algarve', city: 'Algarve', is_holiday: true, is_vacation: false, is_absence: false, active: true, priority: 30 },
      { user_id: userId, name: 'Feriado Porto', type: 'bonus', amount: 80, condition_type: 'holiday', condition_value: 'Porto', city: 'Porto', is_holiday: true, is_vacation: false, is_absence: false, active: true, priority: 30 },
      { user_id: userId, name: 'Férias Lisboa', type: 'bonus', amount: 110, condition_type: 'vacation', condition_value: 'Lisboa', city: 'Lisboa', is_holiday: false, is_vacation: true, is_absence: false, active: true, priority: 30 },
      { user_id: userId, name: 'Férias Algarve', type: 'bonus', amount: 110, condition_type: 'vacation', condition_value: 'Algarve', city: 'Algarve', is_holiday: false, is_vacation: true, is_absence: false, active: true, priority: 30 },
      { user_id: userId, name: 'Férias Porto', type: 'bonus', amount: 80, condition_type: 'vacation', condition_value: 'Porto', city: 'Porto', is_holiday: false, is_vacation: true, is_absence: false, active: true, priority: 30 },
      { user_id: userId, name: 'Falta normal', type: 'deduction', amount: -80, condition_type: 'absence', condition_value: 'normal', is_holiday: false, is_vacation: false, is_absence: true, active: true, priority: 40 },
      { user_id: userId, name: 'Falta segunda', type: 'deduction', amount: -240, condition_type: 'absence', condition_value: 'monday', day_of_week: 1, is_holiday: false, is_vacation: false, is_absence: true, active: true, priority: 50 },
      { user_id: userId, name: 'Falta sexta', type: 'deduction', amount: -240, condition_type: 'absence', condition_value: 'friday', day_of_week: 5, is_holiday: false, is_vacation: false, is_absence: true, active: true, priority: 50 },
    ]

    const { error } = await supabase.from('salary_rules').insert(defaults)
    if (error) throw error
    return true
  },

  async ensureAllRules(userId: string) {
    const { data: existing } = await supabase
      .from('salary_rules')
      .select('id, condition_type, condition_value')
      .eq('user_id', userId)

    if (!existing) return

    const existingSet = new Set(
      existing.map(r => `${r.condition_type}:${r.condition_value}`)
    )

    const missing: Tables['salary_rules']['Insert'][] = []

    if (!existingSet.has('week_city:Porto')) {
      missing.push({ user_id: userId, name: 'Semana Porto', type: 'base', amount: 50, condition_type: 'week_city', condition_value: 'Porto', city: 'Porto', is_holiday: false, is_vacation: false, is_absence: false, active: true, priority: 10 })
    }
    if (!existingSet.has('saturday:Porto')) {
      missing.push({ user_id: userId, name: 'Sábado Porto', type: 'overtime', amount: 80, condition_type: 'saturday', condition_value: 'Porto', city: 'Porto', day_of_week: 6, is_holiday: false, is_vacation: false, is_absence: false, active: true, priority: 20 })
    }
    if (!existingSet.has('holiday:Porto')) {
      missing.push({ user_id: userId, name: 'Feriado Porto', type: 'bonus', amount: 80, condition_type: 'holiday', condition_value: 'Porto', city: 'Porto', is_holiday: true, is_vacation: false, is_absence: false, active: true, priority: 30 })
    }
    if (!existingSet.has('vacation:Porto')) {
      missing.push({ user_id: userId, name: 'Férias Porto', type: 'bonus', amount: 80, condition_type: 'vacation', condition_value: 'Porto', city: 'Porto', is_holiday: false, is_vacation: true, is_absence: false, active: true, priority: 30 })
    }
    if (!existingSet.has('week_city:Algarve')) {
      missing.push({ user_id: userId, name: 'Semana Algarve', type: 'base', amount: 140, condition_type: 'week_city', condition_value: 'Algarve', city: 'Algarve', is_holiday: false, is_vacation: false, is_absence: false, active: true, priority: 10 })
    }
    if (!existingSet.has('saturday:Algarve')) {
      missing.push({ user_id: userId, name: 'Sábado Algarve', type: 'overtime', amount: 110, condition_type: 'saturday', condition_value: 'Algarve', city: 'Algarve', day_of_week: 6, is_holiday: false, is_vacation: false, is_absence: false, active: true, priority: 20 })
    }
    if (!existingSet.has('holiday:Algarve')) {
      missing.push({ user_id: userId, name: 'Feriado Algarve', type: 'bonus', amount: 110, condition_type: 'holiday', condition_value: 'Algarve', city: 'Algarve', is_holiday: true, is_vacation: false, is_absence: false, active: true, priority: 30 })
    }
    if (!existingSet.has('vacation:Algarve')) {
      missing.push({ user_id: userId, name: 'Férias Algarve', type: 'bonus', amount: 110, condition_type: 'vacation', condition_value: 'Algarve', city: 'Algarve', is_holiday: false, is_vacation: true, is_absence: false, active: true, priority: 30 })
    }
    if (!existingSet.has('week_city:Lisboa')) {
      missing.push({ user_id: userId, name: 'Semana Lisboa', type: 'base', amount: 140, condition_type: 'week_city', condition_value: 'Lisboa', city: 'Lisboa', is_holiday: false, is_vacation: false, is_absence: false, active: true, priority: 10 })
    }
    if (!existingSet.has('saturday:Lisboa')) {
      missing.push({ user_id: userId, name: 'Sábado Lisboa', type: 'overtime', amount: 110, condition_type: 'saturday', condition_value: 'Lisboa', city: 'Lisboa', day_of_week: 6, is_holiday: false, is_vacation: false, is_absence: false, active: true, priority: 20 })
    }
    if (!existingSet.has('holiday:Lisboa')) {
      missing.push({ user_id: userId, name: 'Feriado Lisboa', type: 'bonus', amount: 110, condition_type: 'holiday', condition_value: 'Lisboa', city: 'Lisboa', is_holiday: true, is_vacation: false, is_absence: false, active: true, priority: 30 })
    }
    if (!existingSet.has('vacation:Lisboa')) {
      missing.push({ user_id: userId, name: 'Férias Lisboa', type: 'bonus', amount: 110, condition_type: 'vacation', condition_value: 'Lisboa', city: 'Lisboa', is_holiday: false, is_vacation: true, is_absence: false, active: true, priority: 30 })
    }

    if (missing.length > 0) {
      await supabase.from('salary_rules').insert(missing)
    }

    const obsoleteNames = [
      'Semana Lisboa/Algarve', 'Sábado Lisboa/Algarve',
      'Feriado', 'Férias',
      'Adicional Diário Porto', 'Adicional Diário Lisboa/Algarve',
      'Adicional Sexta-feira Lisboa/Algarve',
    ]
    await supabase
      .from('salary_rules')
      .update({ active: false })
      .eq('user_id', userId)
      .in('name', obsoleteNames)
      .eq('active', true)
  },
}

// Work Weeks operations
export const workWeeksService = {
  async getAll(userId: string) {
    const { data, error } = await supabase
      .from('work_weeks')
      .select('*')
      .eq('user_id', userId)
      .order('year', { ascending: false })
      .order('week_number', { ascending: false })
    if (error) throw error
    return data
  },

  async getByWeek(userId: string, year: number, weekNumber: number) {
    const { data, error } = await supabase
      .from('work_weeks')
      .select('*')
      .eq('user_id', userId)
      .eq('year', year)
      .eq('week_number', weekNumber)
      .maybeSingle()
    if (error) throw error
    return data
  },

  async create(week: Tables['work_weeks']['Insert']) {
    const { data, error } = await supabase
      .from('work_weeks')
      .insert(week)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, week: Partial<Tables['work_weeks']['Update']>) {
    const { data, error } = await supabase
      .from('work_weeks')
      .update(week)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },
}

// Work Days operations
export const workDaysService = {
  async getByWeek(userId: string, weekId: string) {
    const { data, error } = await supabase
      .from('work_days')
      .select('*')
      .eq('user_id', userId)
      .eq('week_id', weekId)
      .order('date', { ascending: true })
    if (error) throw error
    return data
  },

  async getByDate(userId: string, date: string) {
    const { data, error } = await supabase
      .from('work_days')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .maybeSingle()
    if (error) throw error
    return data
  },

  async upsert(day: Tables['work_days']['Insert']) {
    const { data, error } = await supabase
      .from('work_days')
      .upsert(day, { onConflict: 'user_id,date' })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, day: Partial<Tables['work_days']['Update']>) {
    const { data, error } = await supabase
      .from('work_days')
      .update(day)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async getByMonth(userId: string, year: number, month: number) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    const { data, error } = await supabase
      .from('work_days')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
    if (error) throw error
    return data
  },

  async getByYear(userId: string, year: number) {
    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`
    const { data, error } = await supabase
      .from('work_days')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
    if (error) throw error
    return data
  },
}

// Payments operations
export const paymentsService = {
  async getAll(userId: string) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
    if (error) throw error
    return data
  },

  async getByMonth(userId: string, year: number, month: number) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .eq('year', year)
      .eq('month', month)
      .maybeSingle()
    if (error) throw error
    return data
  },

  async upsert(payment: Tables['payments']['Insert']) {
    const { data, error } = await supabase
      .from('payments')
      .upsert(payment, { onConflict: 'user_id,year,month' })
      .select()
      .single()
    if (error) throw error
    return data
  },
}

// Notes operations
export const notesService = {
  async getByDate(userId: string, date: string) {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async create(note: Tables['notes']['Insert']) {
    const { data, error } = await supabase
      .from('notes')
      .insert(note)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, note: Partial<Tables['notes']['Update']>) {
    const { data, error } = await supabase
      .from('notes')
      .update(note)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}

// Checklists operations
export const checklistsService = {
  async getByDate(userId: string, date: string) {
    const { data, error } = await supabase
      .from('checklists')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data
  },

  async create(item: Tables['checklists']['Insert']) {
    const { data, error } = await supabase
      .from('checklists')
      .insert(item)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, item: Partial<Tables['checklists']['Update']>) {
    const { data, error } = await supabase
      .from('checklists')
      .update(item)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('checklists')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}

// Reminders operations
export const remindersService = {
  async getAll(userId: string) {
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .order('due_date', { ascending: true })
    if (error) throw error
    return data
  },

  async create(reminder: Tables['reminders']['Insert']) {
    const { data, error } = await supabase
      .from('reminders')
      .insert(reminder)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, reminder: Partial<Tables['reminders']['Update']>) {
    const { data, error } = await supabase
      .from('reminders')
      .update(reminder)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}

// Receipts operations
export const receiptsService = {
  async getAll(userId: string) {
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async create(receipt: Tables['receipts']['Insert']) {
    const { data, error } = await supabase
      .from('receipts')
      .insert(receipt)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('receipts')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  async upload(file: File, userId: string) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/${Date.now()}.${fileExt}`
    const { data, error } = await supabase.storage
      .from('receipts')
      .upload(fileName, file)
    if (error) throw error

    const { data: urlData } = supabase.storage
      .from('receipts')
      .getPublicUrl(data.path)

    return {
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
    }
  },
}

// Competencies operations
export const competenciesService = {
  async getAll(userId: string) {
    const { data, error } = await supabase
      .from('competencies')
      .select('*')
      .eq('user_id', userId)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
    if (error) throw error
    return data
  },

  async getActive(userId: string) {
    const { data, error } = await supabase
      .from('competencies')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle()
    if (error) throw error
    return data
  },

  async upsert(competency: Tables['competencies']['Insert']) {
    const { data, error } = await supabase
      .from('competencies')
      .upsert(competency, { onConflict: 'user_id,year,month' })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, updates: Partial<Tables['competencies']['Update']>) {
    const { data, error } = await supabase
      .from('competencies')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async ensureCurrentCompetency(userId: string) {
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    const { data: existing } = await supabase
      .from('competencies')
      .select('*')
      .eq('user_id', userId)
      .eq('year', currentYear)
      .eq('month', currentMonth)
      .maybeSingle()

    if (existing) return existing

    const { data, error } = await supabase
      .from('competencies')
      .insert({
        user_id: userId,
        month: currentMonth,
        year: currentYear,
        status: 'active',
      })
      .select()
      .single()

    if (error) throw error
    return data
  },
}

// Month Notes operations
export const monthNotesService = {
  async getByPeriod(userId: string, month: number, year: number) {
    const { data, error } = await supabase
      .from('month_notes')
      .select('*')
      .eq('user_id', userId)
      .eq('month', month)
      .eq('year', year)
      .maybeSingle()
    if (error) throw error
    return data
  },

  async upsert(note: Tables['month_notes']['Insert']) {
    const { data, error } = await supabase
      .from('month_notes')
      .upsert(note, { onConflict: 'user_id,month,year' })
      .select()
      .single()
    if (error) throw error
    return data
  },
}

// Month Checklists operations
export const monthChecklistsService = {
  async getByPeriod(userId: string, month: number, year: number) {
    const { data, error } = await supabase
      .from('month_checklists')
      .select('*')
      .eq('user_id', userId)
      .eq('month', month)
      .eq('year', year)
      .order('sort_order', { ascending: true })
    if (error) throw error
    return data
  },

  async create(item: Tables['month_checklists']['Insert']) {
    const { data, error } = await supabase
      .from('month_checklists')
      .insert(item)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, item: Partial<Tables['month_checklists']['Update']>) {
    const { data, error } = await supabase
      .from('month_checklists')
      .update(item)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('month_checklists')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}

// Month Tags operations
export const monthTagsService = {
  async getByPeriod(userId: string, month: number, year: number) {
    const { data, error } = await supabase
      .from('month_tags')
      .select('*')
      .eq('user_id', userId)
      .eq('month', month)
      .eq('year', year)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data
  },

  async create(tag: Tables['month_tags']['Insert']) {
    const { data, error } = await supabase
      .from('month_tags')
      .insert(tag)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('month_tags')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}

// Month Attachments operations
export const monthAttachmentsService = {
  async getByPeriod(userId: string, month: number, year: number) {
    const { data, error } = await supabase
      .from('month_attachments')
      .select('*')
      .eq('user_id', userId)
      .eq('month', month)
      .eq('year', year)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async create(attachment: Tables['month_attachments']['Insert']) {
    const { data, error } = await supabase
      .from('month_attachments')
      .insert(attachment)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('month_attachments')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  async upload(file: File, userId: string) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/month-attachments/${Date.now()}.${fileExt}`
    const { data, error } = await supabase.storage
      .from('receipts')
      .upload(fileName, file)
    if (error) throw error

    const { data: urlData } = supabase.storage
      .from('receipts')
      .getPublicUrl(data.path)

    return {
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
    }
  },
}

// Month Ratings operations
export const monthRatingsService = {
  async getByPeriod(userId: string, month: number, year: number) {
    const { data, error } = await supabase
      .from('month_ratings')
      .select('*')
      .eq('user_id', userId)
      .eq('month', month)
      .eq('year', year)
      .maybeSingle()
    if (error) throw error
    return data
  },

  async upsert(rating: Tables['month_ratings']['Insert']) {
    const { data, error } = await supabase
      .from('month_ratings')
      .upsert(rating, { onConflict: 'user_id,month,year' })
      .select()
      .single()
    if (error) throw error
    return data
  },
}
