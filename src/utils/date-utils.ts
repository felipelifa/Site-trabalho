import { getWeek, getYear, startOfWeek, endOfWeek, format, addDays } from 'date-fns'
import { pt } from 'date-fns/locale'

export function getWeekNumber(date: Date): number {
  return getWeek(date, { weekStartsOn: 1 })
}

export function getYearFromDate(date: Date): number {
  return getYear(date)
}

export function getWeekDates(year: number, weekNumber: number): { start: Date; end: Date } {
  const jan1 = new Date(year, 0, 1)
  const daysToMonday = (jan1.getDay() + 6) % 7
  const firstMonday = addDays(jan1, -daysToMonday + 7)
  const weekStart = addDays(firstMonday, (weekNumber - 1) * 7)
  const weekEnd = addDays(weekStart, 6)
  return { start: weekStart, end: weekEnd }
}

export function getCurrentWeek(): { year: number; weekNumber: number; start: Date; end: Date } {
  const now = new Date()
  return {
    year: getYear(now),
    weekNumber: getWeekNumber(now),
    start: startOfWeek(now, { weekStartsOn: 1 }),
    end: endOfWeek(now, { weekStartsOn: 1 }),
  }
}

export function formatWeekRange(start: Date, end: Date): string {
  const startStr = format(start, "d 'de' MMMM", { locale: pt })
  const endStr = format(end, "d 'de' MMMM", { locale: pt })
  return `${startStr} - ${endStr}`
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

export function isSaturday(date: Date): boolean {
  return date.getDay() === 6
}

export function isSunday(date: Date): boolean {
  return date.getDay() === 0
}

export function getDayOfWeek(date: Date): string {
  return format(date, 'EEEE', { locale: pt })
}

export function getDayOfWeekNumber(date: Date): number {
  return date.getDay()
}
