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

const BASE_SALARY = 820
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
    name: 'Semana Lisboa',
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
    name: 'Semana Algarve',
    type: 'base',
    amount: 140,
    condition_type: 'week_city',
    condition_value: 'Algarve',
    city: 'Algarve',
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
    name: 'Sábado Lisboa',
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
    name: 'Sábado Algarve',
    type: 'overtime',
    amount: 110,
    condition_type: 'saturday',
    condition_value: 'Algarve',
    city: 'Algarve',
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
    name: 'Feriado Lisboa',
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
    name: 'Feriado Algarve',
    type: 'bonus',
    amount: 110,
    condition_type: 'holiday',
    condition_value: 'Algarve',
    city: 'Algarve',
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
    name: 'Férias Lisboa',
    type: 'bonus',
    amount: 110,
    condition_type: 'vacation',
    condition_value: 'Lisboa',
    city: 'Lisboa',
    day_of_week: null,
    is_holiday: false,
    is_vacation: true,
    is_absence: false,
    active: true,
    priority: 30,
  },
  {
    name: 'Férias Algarve',
    type: 'bonus',
    amount: 110,
    condition_type: 'vacation',
    condition_value: 'Algarve',
    city: 'Algarve',
    day_of_week: null,
    is_holiday: false,
    is_vacation: true,
    is_absence: false,
    active: true,
    priority: 30,
  },
  {
    name: 'Férias Porto',
    type: 'bonus',
    amount: 80,
    condition_type: 'vacation',
    condition_value: 'Porto',
    city: 'Porto',
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

function findRuleId(rules: SalaryRule[], conditionType: string, city: string): string | null {
  const rule = rules.find(r => r.active && r.condition_type === conditionType && r.condition_value === city)
  return rule ? rule.id : null
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
    const dest = workDay.destination || 'Porto'
    const amount = dest === 'Porto' ? 80 : 110
    total += amount
    const ruleId = findRuleId(rules, 'saturday', dest)
    if (ruleId) appliedRules.push(ruleId)
    return { date: workDay.date, total, meal_deducted: false, applied_rules: appliedRules }
  }

  if (workDay.is_holiday && workDay.worked) {
    const dest = workDay.destination || 'Porto'
    const amount = dest === 'Porto' ? 80 : 110
    total += amount
    const ruleId = findRuleId(rules, 'holiday', dest)
    if (ruleId) appliedRules.push(ruleId)
    return { date: workDay.date, total, meal_deducted: false, applied_rules: appliedRules }
  }

  if (workDay.is_vacation) {
    const dest = workDay.destination || 'Porto'
    const amount = dest === 'Porto' ? 80 : 110
    total += amount
    const ruleId = findRuleId(rules, 'vacation', dest)
    if (ruleId) appliedRules.push(ruleId)
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

  return { date: workDay.date, total: 0, meal_deducted: false, applied_rules: [] }
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

    const isRegularWorkedDay = workDay.worked && !workDay.is_holiday && !workDay.is_vacation && !workDay.is_absence && !isSaturday(date)
    if (isRegularWorkedDay) {
      daysForMeal++
    }

    for (const ruleId of dayCalc.applied_rules) {
      const rule = rules.find(r => r.id === ruleId)
      const ruleName = rule ? rule.name : ruleId

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
      const dailyBonus = rule.amount / 5
      const holidaysAndVacations = workDays.filter(d =>
        d.worked && d.destination === rule.condition_value && (d.is_holiday || d.is_vacation)
      ).length
      const adjustedAmount = rule.amount - (dailyBonus * holidaysAndVacations)
      if (adjustedAmount > 0) {
        total += adjustedAmount
        breakdown.push({
          rule_id: rule.id,
          rule_name: rule.name,
          amount: adjustedAmount,
          applied: true,
          reason: holidaysAndVacations > 0
            ? `${rule.name} - ${rule.amount}€ - ${holidaysAndVacations} dia(s) feriado/férias (-€${dailyBonus * holidaysAndVacations})`
            : `${rule.name} - semana`,
        })
      }
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

  let mondayAbsences = 0
  let fridayAbsences = 0
  let normalAbsences = 0
  for (const workDay of workDays) {
    if (workDay.is_absence) {
      if (workDay.day_of_week === 1) mondayAbsences++
      else if (workDay.day_of_week === 5) fridayAbsences++
      else normalAbsences++
    }
  }

  const totalAbsenceDeduction = (mondayAbsences * 240) + (fridayAbsences * 240) + (normalAbsences * 80)
  const baseAfterAbsences = BASE_SALARY - totalAbsenceDeduction

  let absenceReason = 'Salário Base fixo'
  if (totalAbsenceDeduction > 0) {
    const parts: string[] = []
    if (mondayAbsences > 0) parts.push(`${mondayAbsences} seg × 240€`)
    if (fridayAbsences > 0) parts.push(`${fridayAbsences} sex × 240€`)
    if (normalAbsences > 0) parts.push(`${normalAbsences} falta(s) × 80€`)
    absenceReason = `${BASE_SALARY}€ - ${parts.join(' - ')}`
  }

  breakdown.push({
    rule_id: 'base',
    rule_name: 'Salário Base',
    amount: baseAfterAbsences,
    applied: true,
    reason: absenceReason,
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
        const dailyBonus = rule.amount / 5
        const holidaysAndVacations = weekDays.filter(d =>
          d.worked && d.destination === rule.condition_value && (d.is_holiday || d.is_vacation)
        ).length
        const adjustedAmount = rule.amount - (dailyBonus * holidaysAndVacations)
        if (adjustedAmount > 0) {
          total += adjustedAmount
          breakdown.push({
            rule_id: rule.id,
            rule_name: rule.name,
            amount: adjustedAmount,
            applied: true,
            reason: holidaysAndVacations > 0
              ? `${rule.name} - ${rule.amount}€ - ${holidaysAndVacations} dia(s) feriado/férias (-€${dailyBonus * holidaysAndVacations})`
              : `${rule.name} - semana`,
          })
        }
      }
    }
  }

  let daysForMeal = 0
  for (const workDay of workDays) {
    const date = new Date(workDay.date)
    const dayCalc = calculateDayEarnings(workDay, rules, date)
    total += dayCalc.total

    const isRegularWorkedDay = workDay.worked && !workDay.is_holiday && !workDay.is_vacation && !workDay.is_absence && !isSaturday(date)
    if (isRegularWorkedDay) {
      daysForMeal++
    }

    for (const ruleId of dayCalc.applied_rules) {
      const rule = rules.find(r => r.id === ruleId)
      const ruleName = rule ? rule.name : ruleId

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
