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

const BASE_SALARY = 870
const MEAL_VOUCHER = 4.27
const DUODECIMOS = 150

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
  meal_deducted: boolean
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
    name: 'Feriado Lisboa/Algarve',
    type: 'bonus',
    amount: 110,
    condition_type: 'holiday',
    condition_value: 'Lisboa',
    city: 'Lisboa',
    day_of_week: null,
    is_holiday: true,
    is_vacation: false,
    is_absence: false,
    active: true,
    priority: 30,
  },
  {
    name: 'Feriado Porto',
    type: 'bonus',
    amount: 80,
    condition_type: 'holiday',
    condition_value: 'Porto',
    city: 'Porto',
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

  const isSat = isSaturday(date)

  if (isSat && workDay.worked) {
    const dest = workDay.destination
    if (dest === 'Porto') {
      total += 80
      appliedRules.push('saturday-porto')
    } else if (dest === 'Lisboa' || dest === 'Algarve') {
      total += 110
      appliedRules.push('saturday-lisboa-algarve')
    }
    return { date: workDay.date, total, meal_deducted: false, applied_rules: appliedRules }
  }

  if (workDay.is_holiday && workDay.worked) {
    const dest = workDay.destination
    if (dest === 'Porto') {
      total += 80
      appliedRules.push('holiday-porto')
    } else if (dest === 'Lisboa' || dest === 'Algarve') {
      total += 110
      appliedRules.push('holiday-lisboa-algarve')
    }
    return { date: workDay.date, total, meal_deducted: false, applied_rules: appliedRules }
  }

  if (workDay.is_vacation) {
    total += 80
    appliedRules.push('vacation')
    return { date: workDay.date, total, meal_deducted: false, applied_rules: appliedRules }
  }

  if (workDay.is_absence) {
    const sortedRules = [...rules].filter(r => r.active && r.is_absence).sort((a, b) => b.priority - a.priority)
    for (const rule of sortedRules) {
      if (rule.condition_value === 'monday' && workDay.day_of_week === 1) {
        total += rule.amount
        appliedRules.push(rule.id)
        break
      } else if (rule.condition_value === 'friday' && workDay.day_of_week === 5) {
        total += rule.amount
        appliedRules.push(rule.id)
        break
      } else if (rule.condition_value === 'normal') {
        total += rule.amount
        appliedRules.push(rule.id)
        break
      }
    }
    return { date: workDay.date, total, meal_deducted: true, applied_rules: appliedRules }
  }

  return { date: workDay.date, total, meal_deducted: false, applied_rules: appliedRules }
}

export function calculateWeekEarnings(
  workDays: WorkDay[],
  rules: SalaryRule[],
  _settings?: Settings
): CalculationResult {
  let total = 0
  const breakdown: CalculationResult['breakdown'] = []

  let daysForMeal = 0
  for (const workDay of workDays) {
    const date = new Date(workDay.date)
    const dayCalc = calculateDayEarnings(workDay, rules, date)
    total += dayCalc.total

    if (workDay.worked && !dayCalc.meal_deducted) {
      daysForMeal++
    }

    for (const ruleId of dayCalc.applied_rules) {
      const rule = rules.find(r => r.id === ruleId)
      let ruleName = ruleId
      if (rule) ruleName = rule.name
      else if (ruleId === 'saturday-porto') ruleName = 'Sábado Porto'
      else if (ruleId === 'saturday-lisboa-algarve') ruleName = 'Sábado Lisboa/Algarve'
      else if (ruleId === 'holiday-porto') ruleName = 'Feriado Porto'
      else if (ruleId === 'holiday-lisboa-algarve') ruleName = 'Feriado Lisboa/Algarve'
      else if (ruleId === 'vacation') ruleName = 'Férias'

      breakdown.push({
        rule_id: ruleId,
        rule_name: ruleName,
        amount: dayCalc.total,
        applied: true,
        reason: `${ruleName} - ${workDay.date}`,
      })
    }
  }

  const mealVoucher = daysForMeal * MEAL_VOUCHER
  if (daysForMeal > 0) {
    breakdown.push({
      rule_id: 'meal_voucher',
      rule_name: 'Subsídio Alimentação',
      amount: mealVoucher,
      applied: true,
      reason: `${daysForMeal} dias × €${MEAL_VOUCHER}`,
    })
    total += mealVoucher
  }

  const weekRules = rules.filter(r => r.active && r.condition_type === 'week_city')
  const weekDestinos = new Set(workDays.filter(d => d.worked && d.destination).map(d => d.destination))
  for (const rule of weekRules) {
    if (weekDestinos.has(rule.condition_value)) {
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

  return { total, breakdown }
}

export function calculateMonthEarnings(
  workDays: WorkDay[],
  rules: SalaryRule[],
  _settings?: Settings
): CalculationResult {
  let total = 0
  const breakdown: CalculationResult['breakdown'] = []

  let absences = 0
  for (const workDay of workDays) {
    if (workDay.is_absence) absences++
  }

  const baseAfterAbsences = BASE_SALARY - (absences * 80)

  breakdown.push({
    rule_id: 'base',
    rule_name: 'Salário Base',
    amount: baseAfterAbsences,
    applied: true,
    reason: absences > 0
      ? `${BASE_SALARY}€ - ${absences} falta(s) × 80€`
      : 'Salário Base fixo',
  })
  total += baseAfterAbsences

  breakdown.push({
    rule_id: 'duodecimos',
    rule_name: 'Duodécimos',
    amount: DUODECIMOS,
    applied: true,
    reason: 'Duodécimos - 150€ fixo mensal',
  })
  total += DUODECIMOS

  const weekRules = rules.filter(r => r.active && r.condition_type === 'week_city')
  const weekIds = new Set(workDays.map(d => d.week_id).filter(Boolean))
  for (const weekId of weekIds) {
    const weekDays = workDays.filter(d => d.week_id === weekId)
    const weekDestinos = new Set(weekDays.filter(d => d.worked && d.destination).map(d => d.destination))
    for (const rule of weekRules) {
      if (weekDestinos.has(rule.condition_value)) {
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
  }

  let daysForMeal = 0
  for (const workDay of workDays) {
    const date = new Date(workDay.date)
    const dayCalc = calculateDayEarnings(workDay, rules, date)
    total += dayCalc.total

    if (workDay.worked && !dayCalc.meal_deducted) {
      daysForMeal++
    }

    for (const ruleId of dayCalc.applied_rules) {
      const rule = rules.find(r => r.id === ruleId)
      let ruleName = ruleId
      if (rule) ruleName = rule.name
      else if (ruleId === 'saturday-porto') ruleName = 'Sábado Porto'
      else if (ruleId === 'saturday-lisboa-algarve') ruleName = 'Sábado Lisboa/Algarve'
      else if (ruleId === 'holiday-porto') ruleName = 'Feriado Porto'
      else if (ruleId === 'holiday-lisboa-algarve') ruleName = 'Feriado Lisboa/Algarve'
      else if (ruleId === 'vacation') ruleName = 'Férias'

      breakdown.push({
        rule_id: ruleId,
        rule_name: ruleName,
        amount: dayCalc.total,
        applied: true,
        reason: `${ruleName} - ${workDay.date}`,
      })
    }
  }

  const mealVoucher = daysForMeal * MEAL_VOUCHER
  if (daysForMeal > 0) {
    breakdown.push({
      rule_id: 'meal_voucher',
      rule_name: 'Subsídio Alimentação',
      amount: mealVoucher,
      applied: true,
      reason: `${daysForMeal} dias × €${MEAL_VOUCHER}`,
    })
    total += mealVoucher
  }

  return { total, breakdown }
}
