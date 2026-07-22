import { format } from 'date-fns'

export interface Holiday {
  date: string
  name: string
  type: 'national' | 'municipal'
}

const NATIONAL_HOLIDAYS_2024: Holiday[] = [
  { date: '2024-01-01', name: 'Ano Novo', type: 'national' },
  { date: '2024-02-29', name: 'Carnaval', type: 'national' },
  { date: '2024-03-29', name: 'Sexta-feira Santa', type: 'national' },
  { date: '2024-03-31', name: 'Páscoa', type: 'national' },
  { date: '2024-04-25', name: 'Dia da Liberdade', type: 'national' },
  { date: '2024-05-01', name: 'Dia do Trabalhador', type: 'national' },
  { date: '2024-06-10', name: 'Dia de Portugal', type: 'national' },
  { date: '2024-06-13', name: 'Corpo de Deus', type: 'national' },
  { date: '2024-06-24', name: 'Dia de São João', type: 'national' },
  { date: '2024-08-15', name: 'Assunção de Nossa Senhora', type: 'national' },
  { date: '2024-10-05', name: 'Implantação da República', type: 'national' },
  { date: '2024-11-01', name: 'Dia de Todos os Santos', type: 'national' },
  { date: '2024-12-01', name: 'Restauração da Independência', type: 'national' },
  { date: '2024-12-08', name: 'Imaculada Conceição', type: 'national' },
  { date: '2024-12-25', name: 'Natal', type: 'national' },
]

const NATIONAL_HOLIDAYS_2025: Holiday[] = [
  { date: '2025-01-01', name: 'Ano Novo', type: 'national' },
  { date: '2025-03-03', name: 'Carnaval', type: 'national' },
  { date: '2025-04-18', name: 'Sexta-feira Santa', type: 'national' },
  { date: '2025-04-20', name: 'Páscoa', type: 'national' },
  { date: '2025-04-25', name: 'Dia da Liberdade', type: 'national' },
  { date: '2025-05-01', name: 'Dia do Trabalhador', type: 'national' },
  { date: '2025-06-10', name: 'Dia de Portugal', type: 'national' },
  { date: '2025-06-19', name: 'Corpo de Deus', type: 'national' },
  { date: '2025-06-24', name: 'Dia de São João', type: 'national' },
  { date: '2025-08-15', name: 'Assunção de Nossa Senhora', type: 'national' },
  { date: '2025-10-05', name: 'Implantação da República', type: 'national' },
  { date: '2025-11-01', name: 'Dia de Todos os Santos', type: 'national' },
  { date: '2025-12-01', name: 'Restauração da Independência', type: 'national' },
  { date: '2025-12-08', name: 'Imaculada Conceição', type: 'national' },
  { date: '2025-12-25', name: 'Natal', type: 'national' },
]

const NATIONAL_HOLIDAYS_2026: Holiday[] = [
  { date: '2026-01-01', name: 'Ano Novo', type: 'national' },
  { date: '2026-02-16', name: 'Carnaval', type: 'national' },
  { date: '2026-04-03', name: 'Sexta-feira Santa', type: 'national' },
  { date: '2026-04-05', name: 'Páscoa', type: 'national' },
  { date: '2026-04-25', name: 'Dia da Liberdade', type: 'national' },
  { date: '2026-05-01', name: 'Dia do Trabalhador', type: 'national' },
  { date: '2026-06-10', name: 'Dia de Portugal', type: 'national' },
  { date: '2026-06-04', name: 'Corpo de Deus', type: 'national' },
  { date: '2026-06-24', name: 'Dia de São João', type: 'national' },
  { date: '2026-08-15', name: 'Assunção de Nossa Senhora', type: 'national' },
  { date: '2026-10-05', name: 'Implantação da República', type: 'national' },
  { date: '2026-11-01', name: 'Dia de Todos os Santos', type: 'national' },
  { date: '2026-12-01', name: 'Restauração da Independência', type: 'national' },
  { date: '2026-12-08', name: 'Imaculada Conceição', type: 'national' },
  { date: '2026-12-25', name: 'Natal', type: 'national' },
]

const ALL_NATIONAL_HOLIDAYS = [
  ...NATIONAL_HOLIDAYS_2024,
  ...NATIONAL_HOLIDAYS_2025,
  ...NATIONAL_HOLIDAYS_2026,
]

const FAFE_MUNICIPAL_HOLIDAYS: Holiday[] = [
  { date: '2024-06-13', name: 'Corpo de Deus (Fafe)', type: 'municipal' },
  { date: '2024-08-16', name: 'Festas de Fafe', type: 'municipal' },
  { date: '2024-09-08', name: 'Nossa Senhora da Piedade (Fafe)', type: 'municipal' },
  { date: '2025-06-19', name: 'Corpo de Deus (Fafe)', type: 'municipal' },
  { date: '2025-08-15', name: 'Festas de Fafe', type: 'municipal' },
  { date: '2025-09-08', name: 'Nossa Senhora da Piedade (Fafe)', type: 'municipal' },
  { date: '2026-06-04', name: 'Corpo de Deus (Fafe)', type: 'municipal' },
  { date: '2026-08-14', name: 'Festas de Fafe', type: 'municipal' },
  { date: '2026-09-08', name: 'Nossa Senhora da Piedade (Fafe)', type: 'municipal' },
]

export function getNationalHolidays(year?: number): Holiday[] {
  if (year) {
    return ALL_NATIONAL_HOLIDAYS.filter(h => h.date.startsWith(String(year)))
  }
  return ALL_NATIONAL_HOLIDAYS
}

export function isNationalHoliday(date: Date): boolean {
  const dateStr = format(date, 'yyyy-MM-dd')
  return ALL_NATIONAL_HOLIDAYS.some(h => h.date === dateStr)
}

export function isFafeMunicipalHoliday(date: Date): boolean {
  const dateStr = format(date, 'yyyy-MM-dd')
  return FAFE_MUNICIPAL_HOLIDAYS.some(h => h.date === dateStr)
}

export function getHolidayName(date: Date): string | null {
  const dateStr = format(date, 'yyyy-MM-dd')
  const holiday = ALL_NATIONAL_HOLIDAYS.find(h => h.date === dateStr)
    ?? FAFE_MUNICIPAL_HOLIDAYS.find(h => h.date === dateStr)
  return holiday?.name ?? null
}

export function getMunicipalHolidays(municipality: string): Holiday[] {
  const stored = localStorage.getItem(`municipal_holidays_${municipality}`)
  if (!stored) return []
  try {
    return JSON.parse(stored) as Holiday[]
  } catch {
    return []
  }
}

export function addMunicipalHoliday(holiday: Holiday): void {
  const stored = localStorage.getItem(`municipal_holidays_${holiday.type}`)
  const holidays: Holiday[] = stored ? JSON.parse(stored) : []
  holidays.push(holiday)
  localStorage.setItem(`municipal_holidays_${holiday.type}`, JSON.stringify(holidays))
}

export function isHoliday(date: Date, municipality?: string): boolean {
  if (isNationalHoliday(date)) return true
  if (municipality) {
    const municipal = getMunicipalHolidays(municipality)
    const dateStr = format(date, 'yyyy-MM-dd')
    return municipal.some(h => h.date === dateStr)
  }
  return false
}

export function isSaturday(date: Date): boolean {
  return date.getDay() === 6
}

export function isSunday(date: Date): boolean {
  return date.getDay() === 0
}
