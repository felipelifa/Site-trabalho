import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Filter,
  XCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isBefore, startOfWeek, endOfWeek } from 'date-fns'
import { pt } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { useWorkDaysByMonth, useWorkWeeks, useSettings, useSalaryRules } from '@/hooks/use-queries'
import { useCreateWorkWeek, useUpsertWorkDay } from '@/hooks/use-queries'
import { isNationalHoliday, isFafeMunicipalHoliday, getHolidayName } from '@/utils/holidays'
import { calculateDayEarnings, calculateMonthEarnings } from '@/utils/rules-engine'

type FilterType = 'all' | 'worked' | 'saturday' | 'holiday' | 'absence' | 'vacation' | 'porto' | 'lisboa' | 'algarve' | 'pending'

type DayStatus = 'worked' | 'absence' | 'vacation' | 'off'

interface DayData {
  id?: string
  date: string
  dayOfWeek: number
  worked: boolean
  destination: string
  sleptAway: boolean
  isHoliday: boolean
  isVacation: boolean
  isAbsence: boolean
  absenceType: string
  notes: string
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function getDayStatus(day: DayData): DayStatus {
  if (day.isVacation) return 'vacation'
  if (day.isAbsence) return 'absence'
  if (day.worked) return 'worked'
  return 'off'
}

const STATUS_CONFIG_CALENDAR: Record<string, { color: string; bg: string; border: string; icon: string; label: string }> = {
  worked: { color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: '🟢', label: 'Trabalhou' },
  saturday: { color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: '🟠', label: 'Sábado' },
  holiday: { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: '🎉', label: 'Feriado' },
  vacation: { color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: '✈️', label: 'Férias' },
  absence: { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: '❌', label: 'Falta' },
  weekend: { color: 'text-muted-foreground', bg: 'bg-muted/50', border: 'border-border', icon: '⚪', label: 'Fim de semana' },
  pending: { color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: '🟡', label: 'Pendente' },
  none: { color: 'text-muted-foreground', bg: 'bg-background', border: 'border-border', icon: '', label: '' },
}

const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const CITY_OPTIONS = ['Porto', 'Lisboa', 'Algarve']

function formatEuro(value: number): string {
  return `€${Math.abs(value).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [editingNote, setEditingNote] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [dayData, setDayData] = useState<DayData | null>(null)

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isInitialLoadRef = useRef(true)
  const lastDateKeyRef = useRef<string>('')

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const prevMonth = subMonths(currentDate, 1)

  const { data: workDays = [] } = useWorkDaysByMonth(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1
  )
  const { data: prevWorkDays = [] } = useWorkDaysByMonth(
    prevMonth.getFullYear(),
    prevMonth.getMonth() + 1
  )
  const { data: allWeeks = [] } = useWorkWeeks()
  const { data: settings } = useSettings()
  const { data: rules = [] } = useSalaryRules()

  const createWeek = useCreateWorkWeek()
  const upsertDay = useUpsertWorkDay()

  const workDaysMap = useMemo(() => {
    const map = new Map<string, typeof workDays[0]>()
    workDays.forEach(day => map.set(day.date, day))
    return map
  }, [workDays])

  const getDayInfo = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const workDay = workDaysMap.get(dateStr)
    const isHol = isNationalHoliday(date) || isFafeMunicipalHoliday(date)
    const holName = getHolidayName(date)
    const dow = date.getDay()
    const isSat = dow === 6
    const isSun = dow === 0

    let status = 'none'
    if (isHol && workDay?.worked) status = 'holiday'
    else if (isHol) status = 'holiday'
    else if (workDay?.is_vacation) status = 'vacation'
    else if (workDay?.is_absence) status = 'absence'
    else if (isSat && workDay?.worked) status = 'saturday'
    else if (workDay?.worked) status = 'worked'
    else if (isSat || isSun) status = 'weekend'
    else if (isBefore(date, new Date()) && !isToday(date)) status = 'pending'
    else status = 'none'

    let earned = 0
    if (workDay) {
      const calc = calculateDayEarnings(
        {
          id: workDay.id || '',
          user_id: '',
          week_id: '',
          date: workDay.date,
          day_of_week: workDay.day_of_week,
          worked: workDay.worked,
          destination: workDay.destination || '',
          slept_away: workDay.slept_away ?? false,
          is_holiday: workDay.is_holiday,
          is_vacation: workDay.is_vacation,
          is_absence: workDay.is_absence,
          absence_type: workDay.absence_type || '',
          earned: 0,
          notes: workDay.notes || '',
          created_at: '',
          updated_at: '',
        } as never,
        [],
        date
      )
      earned = calc.total
    }

    return {
      status,
      destination: workDay?.destination || null,
      earned,
      notes: workDay?.notes || null,
      holName,
      sleptAway: workDay?.slept_away ?? false,
      workDay,
    }
  }

  const initDayData = useCallback((date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const existing = workDaysMap.get(dateStr)
    const isHol = isNationalHoliday(date) || isFafeMunicipalHoliday(date)

    return {
      id: existing?.id,
      date: dateStr,
      dayOfWeek: date.getDay(),
      worked: existing?.worked ?? false,
      destination: existing?.destination || settings?.default_city || 'Porto',
      sleptAway: existing?.slept_away ?? false,
      isHoliday: isHol,
      isVacation: existing?.is_vacation ?? false,
      isAbsence: existing?.is_absence ?? false,
      absenceType: existing?.absence_type ?? '',
      notes: existing?.notes ?? '',
    }
  }, [workDaysMap, settings?.default_city])

  useEffect(() => {
    if (!selectedDate) {
      setDayData(null)
      setEditingNote(false)
      setNoteText('')
      setSaveMessage(null)
      lastDateKeyRef.current = ''
      isInitialLoadRef.current = true
      return
    }

    const dateKey = format(selectedDate, 'yyyy-MM-dd')
    if (dateKey !== lastDateKeyRef.current) {
      lastDateKeyRef.current = dateKey
      isInitialLoadRef.current = true
      const data = initDayData(selectedDate)
      setDayData(data)
      setEditingNote(false)
      setNoteText('')
      setSaveMessage(null)
      setTimeout(() => { isInitialLoadRef.current = false }, 100)
    }
  }, [selectedDate, initDayData])

  const updateDay = (updates: Partial<DayData>) => {
    setSaveMessage(null)
    setDayData(prev => prev ? { ...prev, ...updates } : null)
  }

  const performSave = useCallback(async (data: DayData) => {
    setIsSaving(true)
    setSaveMessage(null)
    try {
      const date = new Date(data.date)
      const weekStartDt = startOfWeek(date, { weekStartsOn: 1 })
      const weekEndDt = endOfWeek(date, { weekStartsOn: 1 })
      const weekNum = getWeekNumber(weekStartDt)
      const yr = weekStartDt.getFullYear()

      const existingWeek = allWeeks.find(w => w.year === yr && w.week_number === weekNum)
      let weekId = existingWeek?.id

      if (!weekId) {
        const newWeek = await createWeek.mutateAsync({
          week_number: weekNum,
          year: yr,
          start_date: format(weekStartDt, 'yyyy-MM-dd'),
          end_date: format(weekEndDt, 'yyyy-MM-dd'),
          destination: data.destination || 'Porto',
          status: 'active',
          total_earned: 0,
        })
        weekId = newWeek.id
      }

      const workDayForCalc = {
        id: data.id || '',
        user_id: '',
        week_id: weekId,
        date: data.date,
        day_of_week: data.dayOfWeek,
        worked: data.worked,
        destination: data.destination,
        slept_away: data.sleptAway,
        is_holiday: data.isHoliday,
        is_vacation: data.isVacation,
        is_absence: data.isAbsence,
        absence_type: data.absenceType,
        earned: 0,
        notes: data.notes,
        created_at: '',
        updated_at: '',
      }
      const dayCalc = calculateDayEarnings(workDayForCalc as never, rules, new Date(data.date))

      await upsertDay.mutateAsync({
        ...(data.id ? { id: data.id } : {}),
        week_id: weekId,
        date: data.date,
        day_of_week: data.dayOfWeek,
        worked: data.worked,
        destination: data.destination,
        slept_away: data.sleptAway,
        is_holiday: data.isHoliday,
        is_vacation: data.isVacation,
        is_absence: data.isAbsence,
        absence_type: data.absenceType || null,
        earned: dayCalc.total,
        notes: data.notes || null,
      })

      setSaveMessage({ type: 'success', text: 'Salvo' })
      setTimeout(() => setSaveMessage(null), 2000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar.'
      setSaveMessage({ type: 'error', text: msg })
    } finally {
      setIsSaving(false)
    }
  }, [allWeeks, createWeek, upsertDay, rules])

  useEffect(() => {
    if (isInitialLoadRef.current) return
    if (!dayData) return
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      performSave(dayData)
    }, 1500)
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [dayData, performSave])

  const handleDayClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const selectedStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''
    if (dateStr === selectedStr) {
      setSelectedDate(null)
    } else {
      setSelectedDate(date)
    }
  }

  const handleSetStatus = (status: DayStatus) => {
    if (!dayData) return
    switch (status) {
      case 'worked':
        updateDay({ worked: true, isHoliday: false, isVacation: false, isAbsence: false, absenceType: '' })
        break
      case 'absence':
        updateDay({ worked: false, isHoliday: false, isVacation: false, isAbsence: true, absenceType: 'other' })
        break
      case 'vacation':
        updateDay({ worked: false, isHoliday: false, isVacation: true, isAbsence: false, absenceType: '' })
        break
      case 'off':
        updateDay({ worked: false, isVacation: false, isAbsence: false, absenceType: '' })
        break
    }
  }

  const handleSetDestination = (dest: string) => {
    updateDay({ destination: dest })
  }

  const handleSaveNote = () => {
    updateDay({ notes: noteText })
    setEditingNote(false)
    setNoteText('')
  }

  const filteredDays = useMemo(() => {
    if (activeFilter === 'all') return days
    return days.filter(date => {
      const info = getDayInfo(date)
      switch (activeFilter) {
        case 'worked': return info.status === 'worked'
        case 'saturday': return info.status === 'saturday'
        case 'holiday': return info.status === 'holiday'
        case 'absence': return info.status === 'absence'
        case 'vacation': return info.status === 'vacation'
        case 'porto': return info.destination === 'Porto'
        case 'lisboa': return info.destination === 'Lisboa'
        case 'algarve': return info.destination === 'Algarve'
        case 'pending': return info.status === 'pending'
        default: return true
      }
    })
  }, [days, activeFilter, workDays])

  const monthStats = useMemo(() => {
    let worked = 0, satWorked = 0, holidays = 0, absences = 0, vacations = 0, pending = 0
    const cities: Record<string, number> = { Porto: 0, Lisboa: 0, Algarve: 0 }

    days.forEach(date => {
      const info = getDayInfo(date)
      if (info.status === 'worked') worked++
      if (info.status === 'saturday') satWorked++
      if (info.status === 'holiday') holidays++
      if (info.status === 'absence') absences++
      if (info.status === 'vacation') vacations++
      if (info.status === 'pending') pending++
      if (info.destination && info.destination in cities) {
        cities[info.destination]++
      }
    })

    const monthWorkDays = workDays.map(d => ({
      id: d.id || '',
      user_id: d.user_id || '',
      week_id: d.week_id || '',
      date: d.date,
      day_of_week: d.day_of_week,
      worked: d.worked,
      destination: d.destination || '',
      slept_away: d.slept_away ?? false,
      is_holiday: d.is_holiday,
      is_vacation: d.is_vacation,
      is_absence: d.is_absence,
      absence_type: d.absence_type || '',
      earned: 0,
      notes: d.notes || '',
      created_at: '',
      updated_at: '',
    })) as never[]

    const monthCalc = calculateMonthEarnings(monthWorkDays, rules)
    const totalEarned = monthCalc.total

    const prevMonthWorkDays = prevWorkDays.map(d => ({
      id: d.id || '',
      user_id: d.user_id || '',
      week_id: d.week_id || '',
      date: d.date,
      day_of_week: d.day_of_week,
      worked: d.worked,
      destination: d.destination || '',
      slept_away: d.slept_away ?? false,
      is_holiday: d.is_holiday,
      is_vacation: d.is_vacation,
      is_absence: d.is_absence,
      absence_type: d.absence_type || '',
      earned: 0,
      notes: d.notes || '',
      created_at: '',
      updated_at: '',
    })) as never[]

    const prevCalc = calculateMonthEarnings(prevMonthWorkDays, rules)
    const prevTotal = prevCalc.total

    return { worked, satWorked, holidays, absences, vacations, pending, totalEarned, prevTotal, cities }
  }, [days, workDays, prevWorkDays, rules])

  const weekGroups = useMemo(() => {
    const groups: { weekStart: Date; weekEnd: Date; days: Date[]; total: number; destination: string | null }[] = []
    let currentWeekStart = startOfWeek(days[0] || new Date(), { weekStartsOn: 1 })
    let currentWeekDays: Date[] = []
    let weekTotal = 0
    let weekDest: string | null = null

    days.forEach(date => {
      const weekStart = startOfWeek(date, { weekStartsOn: 1 })
      if (weekStart.getTime() !== currentWeekStart.getTime()) {
        if (currentWeekDays.length > 0) {
          groups.push({
            weekStart: currentWeekStart,
            weekEnd: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
            days: currentWeekDays,
            total: weekTotal,
            destination: weekDest,
          })
        }
        currentWeekStart = weekStart
        currentWeekDays = []
        weekTotal = 0
        weekDest = null
      }
      currentWeekDays.push(date)
      const info = getDayInfo(date)
      weekTotal += info.earned
      if (info.destination) weekDest = info.destination
    })

    if (currentWeekDays.length > 0) {
      groups.push({
        weekStart: currentWeekStart,
        weekEnd: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
        days: currentWeekDays,
        total: weekTotal,
        destination: weekDest,
      })
    }

    return groups
  }, [days, workDays])

  const comparison = useMemo(() => {
    const diff = monthStats.totalEarned - monthStats.prevTotal
    const pct = monthStats.prevTotal > 0 ? Math.round((diff / monthStats.prevTotal) * 100) : 0
    return { diff, pct, positive: diff >= 0 }
  }, [monthStats])

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'worked', label: 'Trabalho' },
    { key: 'saturday', label: 'Sábados' },
    { key: 'holiday', label: 'Feriados' },
    { key: 'absence', label: 'Faltas' },
    { key: 'vacation', label: 'Férias' },
    { key: 'porto', label: 'Porto' },
    { key: 'lisboa', label: 'Lisboa' },
    { key: 'algarve', label: 'Algarve' },
    { key: 'pending', label: 'Pendentes' },
  ]

  const selectedDayStatus = dayData ? getDayStatus(dayData) : null
  const selectedDayEarnings = useMemo(() => {
    if (!dayData) return { total: 0 }
    const workDayForCalc = {
      id: dayData.id || '',
      user_id: '',
      week_id: '',
      date: dayData.date,
      day_of_week: dayData.dayOfWeek,
      worked: dayData.worked,
      destination: dayData.destination,
      slept_away: dayData.sleptAway,
      is_holiday: dayData.isHoliday,
      is_vacation: dayData.isVacation,
      is_absence: dayData.isAbsence,
      absence_type: dayData.absenceType,
      earned: 0,
      notes: dayData.notes,
      created_at: '',
      updated_at: '',
    }
    const calc = calculateDayEarnings(workDayForCalc as never, rules, new Date(dayData.date))
    return { total: calc.total }
  }, [dayData, rules])

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
      <div className="flex-1 space-y-4">
        <motion.div variants={item} initial="hidden" animate="show" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Calendário</h1>
            <p className="text-sm md:text-base text-muted-foreground capitalize">
              {format(currentDate, "MMMM 'de' yyyy", { locale: pt })}
            </p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {!isToday(startOfMonth(currentDate)) && (
              <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>
                Voltar ao Hoje
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>

        <motion.div variants={item} initial="hidden" animate="show" className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                activeFilter === f.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f.label}
            </button>
          ))}
        </motion.div>

        <motion.div variants={item} initial="hidden" animate="show">
          <Card>
            <CardContent className="p-2 sm:p-4">
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2">
                {DAY_LABELS.map(day => (
                  <div key={day} className="text-center text-[10px] sm:text-xs font-medium text-muted-foreground py-1">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {days.map(date => {
                  const info = getDayInfo(date)
                  const config = STATUS_CONFIG_CALENDAR[info.status] || STATUS_CONFIG_CALENDAR.none
                  const isSelected = selectedDate && format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
                  const today = isToday(date)
                  const dateNum = date.getDate()
                  const isFiltered = activeFilter !== 'all' && !filteredDays.includes(date)

                  return (
                    <motion.button
                      key={date.toISOString()}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDayClick(date)}
                      className={`relative p-1 sm:p-1.5 rounded-lg border transition-all text-left ${
                        isFiltered ? 'opacity-20' : ''
                      } ${config.bg} ${config.border} ${
                        isSelected ? 'ring-2 ring-primary' : ''
                      } ${today ? 'ring-2 ring-primary/40' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] sm:text-xs font-bold text-foreground">{dateNum}</span>
                        {info.status === 'pending' && (
                          <span className="text-[8px]">🟡</span>
                        )}
                      </div>
                      <div className="hidden sm:block mt-0.5">
                        {info.status !== 'none' && info.status !== 'weekend' && (
                          <span className="text-[8px] sm:text-[9px] leading-tight block truncate">
                            {config.icon} {info.destination || config.label}
                          </span>
                        )}
                        {info.earned !== 0 && (
                          <span className={`text-[8px] sm:text-[9px] font-bold block ${
                            info.earned > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {info.earned > 0 ? '+' : ''}{formatEuro(info.earned)}
                          </span>
                        )}
                      </div>
                      <div className="sm:hidden mt-0.5 flex justify-center">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          info.status === 'worked' ? 'bg-green-500' :
                          info.status === 'saturday' ? 'bg-orange-500' :
                          info.status === 'holiday' ? 'bg-blue-500' :
                          info.status === 'vacation' ? 'bg-yellow-500' :
                          info.status === 'absence' ? 'bg-red-500' :
                          info.status === 'pending' ? 'bg-yellow-400' :
                          'bg-transparent'
                        }`} />
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {weekGroups.map((group, i) => (
          <motion.div
            key={i}
            variants={item}
            initial="hidden"
            animate="show"
            className="flex items-center justify-between px-1"
          >
            <div className="flex items-center gap-2">
              {group.destination && (
                <span className="text-xs text-muted-foreground">
                  📍 Semana {group.destination}
                </span>
              )}
            </div>
            <span className="text-xs font-medium text-foreground">
              Total: <span className="text-green-600 dark:text-green-400">{formatEuro(group.total)}</span>
            </span>
          </motion.div>
        ))}
      </div>

      <div className="lg:w-80 xl:w-96 shrink-0 space-y-4">
        <div className="lg:sticky lg:top-20 space-y-4">
          <AnimatePresence mode="wait">
            {selectedDate && dayData && selectedDayStatus ? (
              <motion.div
                key="day-panel"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-foreground capitalize">
                        {format(selectedDate, "EEEE, d 'de' MMMM", { locale: pt })}
                      </h3>
                      <button onClick={() => setSelectedDate(null)} className="p-1 rounded hover:bg-muted">
                        <XCircle className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Status do Dia</p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {([
                          { key: 'worked' as DayStatus, label: 'Trabalhou', icon: '🟢', activeBg: 'bg-green-500' },
                          { key: 'absence' as DayStatus, label: 'Falta', icon: '🔴', activeBg: 'bg-red-500' },
                          { key: 'vacation' as DayStatus, label: 'Férias', icon: '🟡', activeBg: 'bg-yellow-500' },
                          { key: 'off' as DayStatus, label: 'Folga', icon: '⚪', activeBg: 'bg-gray-500' },
                        ]).map(opt => {
                          const isActive = selectedDayStatus === opt.key
                          const isHol = isNationalHoliday(new Date(dayData.date)) || isFafeMunicipalHoliday(new Date(dayData.date))
                          const isDisabled = isHol && opt.key !== 'worked' && opt.key !== 'off'

                          return (
                            <button
                              key={opt.key}
                              onClick={() => !isDisabled && handleSetStatus(opt.key)}
                              disabled={isDisabled}
                              className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                                isActive
                                  ? `${opt.activeBg} border-transparent text-white`
                                  : isDisabled
                                    ? 'bg-muted/30 border-border opacity-40 cursor-not-allowed'
                                    : 'bg-muted/50 border-border hover:bg-muted'
                              }`}
                            >
                              <span className="text-sm">{opt.icon}</span>
                              <span className="text-[10px] font-medium">{opt.label}</span>
                            </button>
                          )
                        })}
                      </div>
                      {isNationalHoliday(new Date(dayData.date)) || isFafeMunicipalHoliday(new Date(dayData.date)) ? (
                        <Badge variant="secondary" className="mt-2 text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                          🎉 {getHolidayName(new Date(dayData.date)) || 'Feriado'}
                        </Badge>
                      ) : null}
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Destino</p>
                      <div className="flex gap-1.5">
                        {CITY_OPTIONS.map(city => (
                          <button
                            key={city}
                            onClick={() => handleSetDestination(city)}
                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                              dayData.destination === city
                                ? 'bg-primary text-primary-foreground shadow-md'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                          >
                            {city === 'Porto' ? '🏠' : city === 'Lisboa' ? '🏙️' : '🏖️'} {city}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-muted-foreground">Observação</p>
                        {!editingNote && (
                          <button
                            onClick={() => { setEditingNote(true); setNoteText(dayData.notes || '') }}
                            className="text-xs text-primary hover:underline"
                          >
                            {dayData.notes ? 'Editar' : '+ Adicionar'}
                          </button>
                        )}
                      </div>
                      {editingNote ? (
                        <div className="space-y-2">
                          <Textarea
                            placeholder="Nota opcional..."
                            value={noteText}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNoteText(e.target.value)}
                            className="min-h-[60px] text-sm"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleSaveNote} className="h-7 text-xs">
                              Salvar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setEditingNote(false); setNoteText('') }} className="h-7 text-xs">
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : dayData.notes ? (
                        <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">📝 {dayData.notes}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground/50 italic">Sem observação</p>
                      )}
                    </div>

                    <div className="border-t border-border pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">Ganho do Dia</span>
                        <span className={`text-lg font-bold ${selectedDayEarnings.total >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {selectedDayEarnings.total >= 0 ? '+' : ''}{formatEuro(selectedDayEarnings.total)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      {isSaving ? (
                        <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Salvando...</span>
                      ) : saveMessage?.type === 'success' ? (
                        <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="w-3 h-3" /> {saveMessage.text}</span>
                      ) : saveMessage?.type === 'error' ? (
                        <span className="flex items-center gap-1 text-red-600">❌ {saveMessage.text}</span>
                      ) : (
                        <span>Auto-save</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="summary-panel"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">Ganhos do Mês</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{formatEuro(monthStats.totalEarned)}</p>
                    <div className="flex items-center gap-1">
                      {comparison.positive ? (
                        <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                      )}
                      <span className={`text-xs font-medium ${comparison.positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {comparison.positive ? '+' : ''}{formatEuro(comparison.diff)} vs mês anterior
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 space-y-2">
                    <p className="text-sm font-medium text-foreground mb-2">Resumo do Mês</p>
                    <div className="space-y-1.5">
                      {[
                        { label: 'Dias Trabalhados', value: monthStats.worked, color: 'text-green-600 dark:text-green-400' },
                        { label: 'Sábados', value: monthStats.satWorked, color: 'text-orange-600 dark:text-orange-400' },
                        { label: 'Feriados', value: monthStats.holidays, color: 'text-blue-600 dark:text-blue-400' },
                        { label: 'Férias', value: monthStats.vacations, color: 'text-yellow-600 dark:text-yellow-400' },
                        { label: 'Faltas', value: monthStats.absences, color: 'text-red-600 dark:text-red-400' },
                        ...(monthStats.pending > 0 ? [{ label: 'Pendentes', value: monthStats.pending, color: 'text-yellow-500' }] : []),
                      ].map((stat, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{stat.label}</span>
                          <span className={`text-xs font-bold ${stat.color}`}>{stat.value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 space-y-2">
                    <p className="text-sm font-medium text-foreground mb-2">Ganhos por Destino</p>
                    {Object.entries(monthStats.cities).filter(([, v]) => v > 0).map(([city, days]) => (
                      <div key={city} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{city}</span>
                          <span className="text-xs font-medium text-foreground">{days} dias</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${
                              city === 'Porto' ? 'bg-green-500' : city === 'Lisboa' ? 'bg-blue-500' : 'bg-purple-500'
                            }`}
                            style={{ width: `${(days / Math.max(...Object.values(monthStats.cities))) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 space-y-3">
                    <p className="text-sm font-medium text-foreground">Legenda</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { icon: '🟢', label: 'Trabalhou', color: 'bg-green-500' },
                        { icon: '🟠', label: 'Sábado', color: 'bg-orange-500' },
                        { icon: '🎉', label: 'Feriado', color: 'bg-blue-500' },
                        { icon: '✈️', label: 'Férias', color: 'bg-yellow-500' },
                        { icon: '❌', label: 'Falta', color: 'bg-red-500' },
                        { icon: '🟡', label: 'Pendente', color: 'bg-yellow-400' },
                      ].map((legend, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <div className={`w-2.5 h-2.5 rounded-full ${legend.color}`} />
                          <span className="text-[10px] text-muted-foreground">{legend.icon} {legend.label}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 pt-1">Clique num dia para editar</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
