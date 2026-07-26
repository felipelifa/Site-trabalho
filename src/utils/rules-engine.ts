import type { Database } from '@/types/database'
import { isSaturday, isNationalHoliday } from '@/utils/holidays'

type SalaryRule = Database['public']['Tables']['salary_rules']['Row']
type WorkDay = Database['public']['Tables']['work_days']['Row']

export interface Settings {
  base_salary?: number
  meal_allowance?: number
  thirteenth_month?: boolean
  fourteenth_month?: boolean
}

const BASE_SALARY = 820
const MEAL_VOUCHER = 4.50
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

function getWorkingDaysInMonth(year: number, month: number): number {
  let count = 0
  const daysInMonth = new Date(year, month, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d)
    const dow = date.getDay()
    if (dow >= 1 && dow <= 5 && !isNationalHoliday(date)) {
      count++
    }
  }
  return count
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
  let mealDeducted = false

  const isSat = isSaturday(date)
  const isHol = workDay.is_holiday
  const isVac = workDay.is_vacation
  const isAbs = workDay.is_absence

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

  if (isHol && workDay.worked) {
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

  if (isVac) {
    total += 80
    appliedRules.push('vacation')
    return { date: workDay.date, total, meal_deducted: false, applied_rules: appliedRules }
  }

  if (isAbs) {
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
    mealDeducted = true
    return { date: workDay.date, total, meal_deducted: mealDeducted, applied_rules: appliedRules }
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

  return { total, breakdown }
}

export function calculateMonthEarnings(
  workDays: WorkDay[],
  rules: SalaryRule[],
  _settings?: Settings,
  year?: number,
  month?: number
): CalculationResult {
  let total = 0
  const breakdown: CalculationResult['breakdown'] = []

  const effectiveYear = year ?? new Date().getFullYear()
  const effectiveMonth = month ?? (new Date().getMonth() + 1)

  const totalWorkingDays = getWorkingDaysInMonth(effectiveYear, effectiveMonth)
  const workedDays = workDays.filter(d => d.worked).length

  const baseSalary = totalWorkingDays > 0
    ? Math.round((BASE_SALARY / totalWorkingDays) * workedDays * 100) / 100
    : 0

  if (baseSalary > 0) {
    breakdown.push({
      rule_id: 'base',
      rule_name: 'Salário Base',
      amount: baseSalary,
      applied: true,
      reason: `${BASE_SALARY}€ / ${totalWorkingDays} dias × ${workedDays} dias trabalhados`,
    })
    total += baseSalary
  }

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
