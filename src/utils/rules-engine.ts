import type { Database } from '@/types/database'
import { isSaturday } from '@/utils/holidays'

type SalaryRule = Database['public']['Tables']['salary_rules']['Row']
type WorkDay = Database['public']['Tables']['work_days']['Row']

export interface Settings {
  base_salary?: number
  meal_allowance?: number
  thirteenth_month?: boolean
  fourteenth_month?: boolean
}

const HOURLY_RATE = 5.31
const DAILY_HOURS = 8
const MEAL_VOUCHER = 4.50

export interface CalculationResult {
  total: number
  breakdown: {
    rule_id: string
    rule_name: string
    amount: number
    applied: boolean
    reason: string
  }[]
}

export interface DayCalculation {
  date: string
  total: number
  applied_rules: string[]
}

const DEFAULT_RULES: Omit<SalaryRule, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] = [
  {
    name: 'Semana Lisboa/Algarve',
    type: 'base',
    amount: 140,
    condition_type: 'week_city',
    condition_value: 'Lisboa',
    city: 'Lisboa',
    day_of_week: null,
    is_holiday: false,
    is_vacation: false,
    is_absence: false,
    active: true,
    priority: 10,
  },
  {
    name: 'Semana Porto',
    type: 'base',
    amount: 50,
    condition_type: 'week_city',
    condition_value: 'Porto',
    city: 'Porto',
    day_of_week: null,
    is_holiday: false,
    is_vacation: false,
    is_absence: false,
    active: true,
    priority: 10,
  },
  {
    name: 'Sábado Lisboa/Algarve',
    type: 'overtime',
    amount: 110,
    condition_type: 'saturday',
    condition_value: 'Lisboa',
    city: 'Lisboa',
    day_of_week: 6,
    is_holiday: false,
    is_vacation: false,
    is_absence: false,
    active: true,
    priority: 20,
  },
  {
    name: 'Sábado Porto',
    type: 'overtime',
    amount: 80,
    condition_type: 'saturday',
    condition_value: 'Porto',
    city: 'Porto',
    day_of_week: 6,
    is_holiday: false,
    is_vacation: false,
    is_absence: false,
    active: true,
    priority: 20,
  },
  {
    name: 'Feriado',
    type: 'bonus',
    amount: 80,
    condition_type: 'holiday',
    condition_value: null,
    city: null,
    day_of_week: null,
    is_holiday: true,
    is_vacation: false,
    is_absence: false,
    active: true,
    priority: 30,
  },
  {
    name: 'Férias',
    type: 'bonus',
    amount: 80,
    condition_type: 'vacation',
    condition_value: null,
    city: null,
    day_of_week: null,
    is_holiday: false,
    is_vacation: true,
    is_absence: false,
    active: true,
    priority: 30,
  },
  {
    name: 'Falta normal',
    type: 'deduction',
    amount: -80,
    condition_type: 'absence',
    condition_value: 'normal',
    city: null,
    day_of_week: null,
    is_holiday: false,
    is_vacation: false,
    is_absence: true,
    active: true,
    priority: 40,
  },
  {
    name: 'Falta segunda',
    type: 'deduction',
    amount: -240,
    condition_type: 'absence',
    condition_value: 'monday',
    city: null,
    day_of_week: 1,
    is_holiday: false,
    is_vacation: false,
    is_absence: true,
    active: true,
    priority: 50,
  },
  {
    name: 'Falta sexta',
    type: 'deduction',
    amount: -240,
    condition_type: 'absence',
    condition_value: 'friday',
    city: null,
    day_of_week: 5,
    is_holiday: false,
    is_vacation: false,
    is_absence: true,
    active: true,
    priority: 50,
  },
  {
    name: 'Adicional Diário Porto',
    type: 'bonus',
    amount: 10,
    condition_type: 'city_bonus',
    condition_value: 'Porto',
    city: 'Porto',
    day_of_week: null,
    is_holiday: false,
    is_vacation: false,
    is_absence: false,
    active: true,
    priority: 15,
  },
  {
    name: 'Adicional Diário Lisboa/Algarve',
    type: 'bonus',
    amount: 30,
    condition_type: 'city_bonus',
    condition_value: 'Lisboa',
    city: 'Lisboa',
    day_of_week: null,
    is_holiday: false,
    is_vacation: false,
    is_absence: false,
    active: true,
    priority: 15,
  },
  {
    name: 'Adicional Sexta-feira Lisboa/Algarve',
    type: 'bonus',
    amount: 20,
    condition_type: 'friday_bonus',
    condition_value: 'Lisboa',
    city: 'Lisboa',
    day_of_week: 5,
    is_holiday: false,
    is_vacation: false,
    is_absence: false,
    active: true,
    priority: 25,
  },
]

export function getDefaultRules(userId: string): Omit<SalaryRule, 'id' | 'created_at' | 'updated_at'>[] {
  return DEFAULT_RULES.map(rule => ({
    ...rule,
    user_id: userId,
  }))
}

export function calculateDayEarnings(
  workDay: WorkDay,
  rules: SalaryRule[],
  date: Date
): DayCalculation {
  let total = 0
  const appliedRules: string[] = []

  const sortedRules = [...rules]
    .filter(r => r.active)
    .sort((a, b) => b.priority - a.priority)

  for (const rule of sortedRules) {
    if (rule.condition_type === 'week_city') continue

    let applies = false

    if (workDay.is_holiday && rule.is_holiday) {
      applies = true
    } else if (workDay.is_vacation && rule.is_vacation) {
      applies = true
    } else if (workDay.is_absence) {
      if (rule.is_absence) {
        if (rule.condition_value === 'monday' && workDay.day_of_week === 1) {
          applies = true
        } else if (rule.condition_value === 'friday' && workDay.day_of_week === 5) {
          applies = true
        } else if (rule.condition_value === 'normal') {
          applies = true
        }
      }
    } else if (workDay.worked) {
      if (rule.condition_type === 'saturday' && isSaturday(date) && workDay.destination === rule.condition_value) {
        applies = true
      } else if (rule.condition_type === 'city_bonus' && workDay.destination === rule.condition_value && workDay.day_of_week !== 5) {
        applies = true
      } else if (rule.condition_type === 'friday_bonus' && workDay.day_of_week === 5 && workDay.destination === rule.condition_value) {
        applies = true
      }
    }

    if (applies) {
      total += rule.amount
      appliedRules.push(rule.id)
    }
  }

  return {
    date: workDay.date,
    total,
    applied_rules: appliedRules,
  }
}

export function calculateWeekEarnings(
  workDays: WorkDay[],
  rules: SalaryRule[],
  settings?: Settings
): CalculationResult {
  let total = 0
  const breakdown: CalculationResult['breakdown'] = []

  if (settings) {
    const base = settings.base_salary ?? 0
    const meal = settings.meal_allowance ?? 0
    const duodecimos = (settings.thirteenth_month ? 75 : 0) + (settings.fourteenth_month ? 75 : 0)

    if (base > 0) {
      breakdown.push({ rule_id: 'base', rule_name: 'Salário Base', amount: base, applied: true, reason: 'Salário Base mensal' })
      total += base
    }
    if (meal > 0) {
      breakdown.push({ rule_id: 'meal', rule_name: 'Subsídio Alimentação', amount: meal, applied: true, reason: 'Subsídio Alimentação mensal' })
      total += meal
    }
    if (duodecimos > 0) {
      breakdown.push({ rule_id: 'duodecimos', rule_name: 'Duodécimos', amount: duodecimos, applied: true, reason: 'Duodécimos (Natal + Férias)' })
      total += duodecimos
    }
  }

  const workedDays = workDays.filter(d => d.worked).length
  const hourlyPay = workedDays * DAILY_HOURS * HOURLY_RATE
  if (workedDays > 0) {
    breakdown.push({
      rule_id: 'hourly',
      rule_name: 'Trabalho Horário',
      amount: hourlyPay,
      applied: true,
      reason: `${workedDays} dias × ${DAILY_HOURS}h × €${HOURLY_RATE}`,
    })
    total += hourlyPay
  }

  const mealVoucher = workedDays * MEAL_VOUCHER
  if (workedDays > 0) {
    breakdown.push({
      rule_id: 'meal_voucher',
      rule_name: 'Vale Alimentação',
      amount: mealVoucher,
      applied: true,
      reason: `${workedDays} dias × €${MEAL_VOUCHER}`,
    })
    total += mealVoucher
  }

  const weekRules = rules.filter(r => r.active && r.condition_type === 'week_city')
  const destinos = new Set(workDays.filter(d => d.worked && d.destination).map(d => d.destination))
  for (const rule of weekRules) {
    if (destinos.has(rule.condition_value)) {
      total += rule.amount
      breakdown.push({
        rule_id: rule.id,
        rule_name: rule.name,
        amount: rule.amount,
        applied: true,
        reason: `${rule.name} - semana`,
      })
    }
  }

  for (const workDay of workDays) {
    const date = new Date(workDay.date)
    const dayCalc = calculateDayEarnings(workDay, rules, date)
    total += dayCalc.total

    for (const ruleId of dayCalc.applied_rules) {
      const rule = rules.find(r => r.id === ruleId)
      if (rule) {
        breakdown.push({
          rule_id: rule.id,
          rule_name: rule.name,
          amount: rule.amount,
          applied: true,
          reason: `${rule.name} - ${workDay.date}`,
        })
      }
    }
  }

  return { total, breakdown }
}

export function calculateMonthEarnings(
  workDays: WorkDay[],
  rules: SalaryRule[],
  settings?: Settings
): CalculationResult {
  return calculateWeekEarnings(workDays, rules, settings)
}
