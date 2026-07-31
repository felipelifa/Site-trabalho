import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval } from 'date-fns'
import { pt } from 'date-fns/locale'
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Zap,
  Copy,
  Plane,
  Briefcase,
  X,
  StickyNote,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { useWorkWeek, useWorkDaysByWeek, useWorkWeeks, useSettings, useSalaryRules } from '@/hooks/use-queries'
import { useCreateWorkWeek, useUpdateWorkWeek, useUpsertWorkDay } from '@/hooks/use-queries'
import { calculateWeekEarnings, calculateDayEarnings } from '@/utils/rules-engine'
import { isNationalHoliday, isFafeMunicipalHoliday, getHolidayName } from '@/utils/holidays'

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

function cycleDayStatus(current: DayStatus, isHoliday: boolean): { status: DayStatus; updates: Partial<DayData> } {
  if (isHoliday) {
    switch (current) {
      case 'worked': return { status: 'off', updates: { worked: false, isHoliday: true, isVacation: false, isAbsence: false, absenceType: '' } }
      case 'off': return { status: 'worked', updates: { worked: true, isHoliday: true, isVacation: false, isAbsence: false, absenceType: '' } }
      default: return { status: 'off', updates: { worked: false, isHoliday: true, isVacation: false, isAbsence: false, absenceType: '' } }
    }
  }
  switch (current) {
    case 'worked': return { status: 'absence', updates: { worked: false, isHoliday: false, isVacation: false, isAbsence: true, absenceType: 'other' } }
    case 'absence': return { status: 'vacation', updates: { worked: false, isHoliday: false, isVacation: true, isAbsence: false, absenceType: '' } }
    case 'vacation': return { status: 'off', updates: { worked: false, isHoliday: false, isVacation: false, isAbsence: false, absenceType: '' } }
    case 'off': return { status: 'worked', updates: { worked: true, isHoliday: false, isVacation: false, isAbsence: false, absenceType: '' } }
  }
}

const STATUS_CONFIG: Record<DayStatus, { color: string; bg: string; label: string; icon: string }> = {
  worked: { color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500', label: 'Trabalhou', icon: '🟢' },
  absence: { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500', label: 'Falta', icon: '🔴' },
  vacation: { color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-500', label: 'Férias', icon: '🟡' },
  off: { color: 'text-muted-foreground', bg: 'bg-gray-400 dark:bg-gray-600', label: 'Folga', icon: '⚪' },
}

const HOLIDAY_COLOR = 'bg-blue-500'

const DAY_LABELS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB']
const CITY_OPTIONS = ['Porto', 'Lisboa', 'Algarve']

export function WeeklyRegistrationPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [selectedDestination, setSelectedDestination] = useState<string>('Porto')
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null)
  const [contextMenu, setContextMenu] = useState<{ dayIndex: number; x: number; y: number } | null>(null)
  const [editingNote, setEditingNote] = useState<number | null>(null)
  const [noteText, setNoteText] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isInitialLoadRef = useRef(true)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
  const weekNumber = getWeekNumber(weekStart)
  const year = weekStart.getFullYear()

  const weekOfMonth = useMemo(() => {
    const firstDayOfMonth = new Date(weekStart.getFullYear(), weekStart.getMonth(), 1)
    const firstWeekStart = startOfWeek(firstDayOfMonth, { weekStartsOn: 1 })
    const diffWeeks = Math.floor((weekStart.getTime() - firstWeekStart.getTime()) / (7 * 86400000))
    return diffWeeks + 1
  }, [weekStart])

  const monthName = useMemo(() => {
    return format(weekStart, 'MMMM', { locale: pt })
  }, [weekStart])

  const { data: existingWeek } = useWorkWeek(year, weekNumber)
  const { data: existingDays = [] } = useWorkDaysByWeek(year, weekNumber)
  const { data: allWeeks = [] } = useWorkWeeks()
  const { data: settings } = useSettings()
  const { data: rules = [] } = useSalaryRules()

  const createWeek = useCreateWorkWeek()
  const updateWeek = useUpdateWorkWeek()
  const upsertDay = useUpsertWorkDay()

  const weekDays = useMemo(() => {
    return eachDayOfInterval({ start: weekStart, end: weekEnd })
      .filter(date => date.getDay() >= 1 && date.getDay() <= 6)
  }, [weekStart, weekEnd])

  const [daysData, setDaysData] = useState<DayData[]>([])
  const lastWeekKeyRef = useRef<string>('')
  const initialLoadDoneRef = useRef(false)

  const weekKey = `${year}-${weekNumber}`
  useEffect(() => {
    if (weekKey !== lastWeekKeyRef.current) {
      lastWeekKeyRef.current = weekKey
      initialLoadDoneRef.current = false
    }

    if (!initialLoadDoneRef.current && existingDays.length > 0) {
      initialLoadDoneRef.current = true
      isInitialLoadRef.current = false
      setDaysData(weekDays.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd')
        const existing = existingDays.find(d => d.date === dateStr)
        return {
          id: existing?.id,
          date: dateStr,
          dayOfWeek: date.getDay(),
          worked: existing?.worked ?? false,
          destination: existing?.destination || settings?.default_city || 'Porto',
          sleptAway: existing?.slept_away ?? false,
          isHoliday: isNationalHoliday(date) || isFafeMunicipalHoliday(date),
          isVacation: existing?.is_vacation ?? false,
          isAbsence: existing?.is_absence ?? false,
          absenceType: existing?.absence_type ?? '',
          notes: existing?.notes ?? '',
        }
      }))
    } else if (!initialLoadDoneRef.current && existingWeek === null && existingDays.length === 0) {
      initialLoadDoneRef.current = true
      isInitialLoadRef.current = false
      setDaysData([])
    }
    setSaveMessage(null)
  }, [weekKey, existingDays, weekDays, settings?.default_city, existingWeek])

  const updateDay = (index: number, updates: Partial<DayData>) => {
    setSaveMessage(null)
    setDaysData(prev => prev.map((day, i) => i === index ? { ...day, ...updates } : day))
  }

  const weekEarnings = useMemo(() => {
    if (!daysData.length) return { total: 0, breakdown: [] }
    const workDays = daysData.map(day => ({
      id: '',
      user_id: '',
      week_id: '',
      date: day.date,
      day_of_week: day.dayOfWeek,
      worked: day.worked,
      destination: day.destination,
      slept_away: day.sleptAway,
      is_holiday: day.isHoliday,
      is_vacation: day.isVacation,
      is_absence: day.isAbsence,
      absence_type: day.absenceType,
      earned: 0,
      notes: day.notes,
      created_at: '',
      updated_at: '',
    }))
    return calculateWeekEarnings(workDays, rules, settings ?? undefined)
  }, [daysData, rules])

  const performSave = useCallback(async (data: DayData[]) => {
    if (!data.length) return
    setIsSaving(true)
    setSaveMessage(null)
    try {
      let weekId = existingWeek?.id

      if (!weekId) {
        const newWeek = await createWeek.mutateAsync({
          week_number: weekNumber,
          year,
          start_date: format(weekStart, 'yyyy-MM-dd'),
          end_date: format(weekEnd, 'yyyy-MM-dd'),
          destination: data[0]?.destination || 'Porto',
          status: 'active',
          total_earned: weekEarnings.total,
        })
        weekId = newWeek.id
      }

      for (const day of data) {
        const workDayForCalc = {
          id: day.id || '',
          user_id: '',
          week_id: weekId,
          date: day.date,
          day_of_week: day.dayOfWeek,
          worked: day.worked,
          destination: day.destination,
          slept_away: day.sleptAway,
          is_holiday: day.isHoliday,
          is_vacation: day.isVacation,
          is_absence: day.isAbsence,
          absence_type: day.absenceType,
          earned: 0,
          notes: day.notes,
          created_at: '',
          updated_at: '',
        }
        const dayCalc = calculateDayEarnings(workDayForCalc as never, rules, new Date(day.date))

        await upsertDay.mutateAsync({
          ...(day.id ? { id: day.id } : {}),
          week_id: weekId,
          date: day.date,
          day_of_week: day.dayOfWeek,
          worked: day.worked,
          destination: day.destination,
          slept_away: day.sleptAway,
          is_holiday: day.isHoliday,
          is_vacation: day.isVacation,
          is_absence: day.isAbsence,
          absence_type: day.absenceType || null,
          earned: dayCalc.total,
          notes: day.notes || null,
        })
      }

      if (weekId && weekEarnings.total !== 0) {
        await updateWeek.mutateAsync({ id: weekId, total_earned: weekEarnings.total })
      }

      setSaveMessage({ type: 'success', text: 'Salvo' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar.'
      setSaveMessage({ type: 'error', text: msg })
    } finally {
      setIsSaving(false)
    }
  }, [existingWeek, weekNumber, year, weekStart, weekEnd, createWeek, updateWeek, upsertDay, rules, weekEarnings.total])

  useEffect(() => {
    if (isInitialLoadRef.current) return
    if (!daysData.length) return
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      performSave(daysData)
    }, 1500)
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [daysData, performSave])

  const handleCreateWeek = async () => {
    setIsCreating(true)
    const newDays = weekDays.map(date => ({
      date: format(date, 'yyyy-MM-dd'),
      dayOfWeek: date.getDay(),
      worked: true,
      destination: selectedDestination,
      sleptAway: false,
      isHoliday: isNationalHoliday(date) || isFafeMunicipalHoliday(date),
      isVacation: false,
      isAbsence: false,
      absenceType: '',
      notes: '',
    }))
    setDaysData(newDays)
    isInitialLoadRef.current = false
    setTimeout(() => setIsCreating(false), 300)
  }

  const handleStandardWeek = () => {
    if (!daysData.length) return
    setDaysData(prev => prev.map((day, i) => {
      if (i < 5) {
        return { ...day, worked: true, isHoliday: isNationalHoliday(new Date(day.date)) || isFafeMunicipalHoliday(new Date(day.date)), isVacation: false, isAbsence: false, absenceType: '' }
      }
      return day
    }))
  }

  const handleCopyPreviousWeek = () => {
    const prevWeekNum = weekNumber - 1
    const prevYear = prevWeekNum < 1 ? year - 1 : year
    const actualPrevWeekNum = prevWeekNum < 1 ? 52 : prevWeekNum
    const prevWeek = allWeeks.find(w => w.week_number === actualPrevWeekNum && w.year === prevYear)
    if (!prevWeek) {
      setSaveMessage({ type: 'error', text: 'Semana anterior não encontrada' })
      return
    }

    const prevDays = existingDays.length > 0 ? existingDays : []
    if (prevDays.length > 0) {
      setDaysData(weekDays.map((date, i) => {
        const dateStr = format(date, 'yyyy-MM-dd')
        const prevDay = prevDays.find(d => d.date === dateStr)
        return {
          date: dateStr,
          dayOfWeek: date.getDay(),
          worked: prevDay?.worked ?? (i < 5),
          destination: prevDay?.destination || prevWeek.destination || selectedDestination,
          sleptAway: prevDay?.slept_away ?? false,
          isHoliday: isNationalHoliday(date) || isFafeMunicipalHoliday(date),
          isVacation: prevDay?.is_vacation ?? false,
          isAbsence: prevDay?.is_absence ?? false,
          absenceType: prevDay?.absence_type ?? '',
          notes: prevDay?.notes ?? '',
        }
      }))
      setSelectedDestination(prevWeek.destination || selectedDestination)
    } else {
      setSelectedDestination(prevWeek.destination || selectedDestination)
      handleCreateWeek()
    }
  }

  const handleDayClick = (index: number) => {
    if (contextMenu) return
    const day = daysData[index]
    if (!day) return
    const isHol = isNationalHoliday(new Date(day.date)) || isFafeMunicipalHoliday(new Date(day.date))
    const currentStatus = getDayStatus(day)
    const { updates } = cycleDayStatus(currentStatus, isHol)
    updateDay(index, updates)
  }

  const handleDayLongPress = (index: number, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    let clientX = 0, clientY = 0
    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }
    setContextMenu({ dayIndex: index, x: clientX, y: clientY })
  }

  const handleRegisterAbsence = () => {
    if (selectedDayIndex === null) return
    updateDay(selectedDayIndex, { worked: false, isHoliday: false, isVacation: false, isAbsence: true, absenceType: 'other' })
    setSelectedDayIndex(null)
  }

  const handleRegisterJustifiedAbsence = () => {
    if (selectedDayIndex === null) return
    updateDay(selectedDayIndex, { worked: false, isHoliday: false, isVacation: false, isAbsence: true, absenceType: 'justified' })
    setSelectedDayIndex(null)
  }

  const handleRegisterVacation = () => {
    if (selectedDayIndex === null) return
    updateDay(selectedDayIndex, { worked: false, isHoliday: false, isVacation: true, isAbsence: false, absenceType: '' })
    setSelectedDayIndex(null)
  }

  const handleWorkedSaturday = () => {
    const satIndex = daysData.findIndex(d => new Date(d.date).getDay() === 6)
    if (satIndex >= 0) {
      updateDay(satIndex, { worked: true, isHoliday: false, isVacation: false, isAbsence: false, absenceType: '' })
    }
  }

  const handleAddNote = () => {
    if (selectedDayIndex === null) return
    setEditingNote(selectedDayIndex)
    setNoteText(daysData[selectedDayIndex]?.notes || '')
    setSelectedDayIndex(null)
  }

  const handleSaveNote = () => {
    if (editingNote !== null) {
      updateDay(editingNote, { notes: noteText })
      setEditingNote(null)
      setNoteText('')
    }
  }

  const handleContextAction = (action: string) => {
    if (!contextMenu) return
    const idx = contextMenu.dayIndex
    switch (action) {
      case 'note':
        setEditingNote(idx)
        setNoteText(daysData[idx]?.notes || '')
        break
      case 'destination':
        const day = daysData[idx]
        const currentDest = day.destination
        const nextDest = currentDest === 'Porto' ? 'Lisboa' : currentDest === 'Lisboa' ? 'Algarve' : 'Porto'
        updateDay(idx, { destination: nextDest })
        break
    }
    setContextMenu(null)
  }

  useEffect(() => {
    const handler = () => setContextMenu(null)
    window.addEventListener('click', handler)
    window.addEventListener('scroll', handler)
    return () => {
      window.removeEventListener('click', handler)
      window.removeEventListener('scroll', handler)
    }
  }, [])

  const stats = useMemo(() => {
    const worked = daysData.filter(d => d.worked && !d.isHoliday).length
    const absence = daysData.filter(d => d.isAbsence).length
    const vacation = daysData.filter(d => d.isVacation).length
    const sat = daysData.find(d => new Date(d.date).getDay() === 6)
    const satWorked = sat?.worked ?? false
    return { worked, absence, vacation, satWorked }
  }, [daysData])

  const hasWeek = existingWeek !== null || daysData.length > 0

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
      <div className="flex-1 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Registro Semanal</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              {format(weekStart, "d 'de' MMMM", { locale: pt })} - {format(weekEnd, "d 'de' MMMM", { locale: pt })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(subWeeks(currentDate, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Badge variant="secondary" className="px-3 sm:px-4 py-1 text-sm">
              Semana {weekOfMonth} do mês {monthName}
            </Badge>
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(addWeeks(currentDate, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {saveMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                saveMessage.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
              }`}
            >
              {saveMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {saveMessage.text}
            </motion.div>
          )}
        </AnimatePresence>

        {!hasWeek ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-6 sm:p-8 text-center space-y-6">
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-foreground">Semana {weekOfMonth} do mês {monthName}</h2>
                  <p className="text-muted-foreground">Selecione o destino e crie a semana</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                  <div className="flex gap-2">
                    {CITY_OPTIONS.map(city => (
                      <button
                        key={city}
                        onClick={() => setSelectedDestination(city)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedDestination === city
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    size="lg"
                    onClick={handleCreateWeek}
                    disabled={isCreating}
                    className="w-full sm:w-auto px-8"
                  >
                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                    Criar Semana
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleCopyPreviousWeek}
                    className="w-full sm:w-auto"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Semana Anterior
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Seg-Sex serão marcados automaticamente como trabalhados
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedDayIndex !== null ? 'default' : 'outline'}
                size="sm"
                onClick={handleRegisterAbsence}
                disabled={selectedDayIndex === null}
              >
                <X className="w-3.5 h-3.5 mr-1.5" />
                Registrar Falta
              </Button>
              <Button
                variant={selectedDayIndex !== null ? 'default' : 'outline'}
                size="sm"
                onClick={handleRegisterJustifiedAbsence}
                disabled={selectedDayIndex === null}
              >
                <X className="w-3.5 h-3.5 mr-1.5" />
                Falta Justificada
              </Button>
              <Button
                variant={selectedDayIndex !== null ? 'default' : 'outline'}
                size="sm"
                onClick={handleRegisterVacation}
                disabled={selectedDayIndex === null}
              >
                <Plane className="w-3.5 h-3.5 mr-1.5" />
                Registrar Férias
              </Button>
              <Button variant="outline" size="sm" onClick={handleWorkedSaturday}>
                <Briefcase className="w-3.5 h-1 mr-1.5" />
                Trabalhei Sábado
              </Button>
              <Button
                variant={selectedDayIndex !== null ? 'default' : 'outline'}
                size="sm"
                onClick={handleAddNote}
                disabled={selectedDayIndex === null}
              >
                <StickyNote className="w-3.5 h-3.5 mr-1.5" />
                Observação
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={handleStandardWeek}>
                <Zap className="w-3.5 h-3.5 mr-1.5" />
                Semana Padrão
              </Button>
              <Button variant="secondary" size="sm" onClick={handleCopyPreviousWeek}>
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                Copiar Anterior
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>Clicar no dia para alternar estado:</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Trabalhou</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Falta</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500" /> Férias</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-400 dark:bg-gray-600" /> Folga</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Feriado</span>
            </div>

            <div className="space-y-2">
              {weekDays.map((date, index) => {
                const day = daysData[index]
                if (!day) return null
                const status = getDayStatus(day)
                const config = STATUS_CONFIG[status]
                const isHol = isNationalHoliday(date) || isFafeMunicipalHoliday(date)
                const holName = getHolidayName(date)
                const isSelected = selectedDayIndex === index
                const isToday = format(new Date(), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')

                return (
                  <motion.div
                    key={date.toISOString()}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <div
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                        isSelected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                          : 'border-border bg-card hover:bg-muted/50'
                      } ${isToday ? 'ring-2 ring-primary/30' : ''}`}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedDayIndex(null)
                        } else {
                          setSelectedDayIndex(index)
                        }
                      }}
                      onDoubleClick={() => handleDayClick(index)}
                      onContextMenu={(e) => handleDayLongPress(index, e)}
                      onTouchStart={(e) => {
                        longPressTimerRef.current = setTimeout(() => {
                          handleDayLongPress(index, e)
                        }, 500)
                      }}
                      onTouchEnd={() => {
                        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
                      }}
                    >
                      <div className="flex flex-col items-center gap-1 min-w-[40px]">
                        <span className="text-xs font-bold text-muted-foreground">
                          {DAY_LABELS[index]}
                        </span>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          isHol && status === 'off' ? HOLIDAY_COLOR :
                          isHol && status === 'worked' ? HOLIDAY_COLOR :
                          config.bg
                        }`}>
                          {status === 'worked' && <CheckCircle2 className="w-4 h-4 text-white" />}
                          {status === 'absence' && <X className="w-4 h-4 text-white" />}
                          {status === 'vacation' && <Plane className="w-4 h-4 text-white" />}
                          {status === 'off' && !isHol && <div className="w-2 h-2 rounded-full bg-white/60" />}
                          {status === 'off' && isHol && <div className="w-2 h-2 rounded-full bg-white/80" />}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${config.color}`}>
                            {config.label}
                          </span>
                          {isHol && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                              {holName || 'Feriado'}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          📍 {day.destination}
                          {day.notes && <span className="ml-2 opacity-60">📝 {day.notes}</span>}
                        </p>
                      </div>

                      <span className="text-xs text-muted-foreground">
                        {format(date, 'd/MM')}
                      </span>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {editingNote !== null && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <p className="text-sm font-medium text-foreground">
                      Observação - {DAY_LABELS[editingNote]} {daysData[editingNote] && format(new Date(daysData[editingNote].date), 'd/MM')}
                    </p>
                    <Textarea
                      placeholder="Nota opcional..."
                      value={noteText}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNoteText(e.target.value)}
                      className="min-h-[60px]"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveNote}>Salvar</Button>
                      <Button size="sm" variant="outline" onClick={() => { setEditingNote(null); setNoteText('') }}>
                        Cancelar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </>
        )}

        {contextMenu && (
          <>
            <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)} />
            <div
              className="fixed z-50 bg-card border border-border rounded-xl shadow-xl p-1 min-w-[160px]"
              style={{ left: Math.min(contextMenu.x, window.innerWidth - 180), top: Math.min(contextMenu.y, window.innerHeight - 150) }}
            >
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-muted text-left"
                onClick={() => handleContextAction('note')}
              >
                <StickyNote className="w-4 h-4" /> Editar observação
              </button>
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-muted text-left"
                onClick={() => handleContextAction('destination')}
              >
                <MapPin className="w-4 h-4" /> Alterar destino
              </button>
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-muted text-left"
                onClick={() => setContextMenu(null)}
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>

      <div className="lg:w-72 xl:w-80 shrink-0">
        <div className="lg:sticky lg:top-20 space-y-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Competência</span>
                <span className="text-sm font-bold text-foreground capitalize">
                  {format(new Date(), 'MMMM yyyy', { locale: pt })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Destino</span>
                <span className="text-sm font-medium text-foreground">
                  📍 {daysData[0]?.destination || selectedDestination}
                </span>
              </div>
              <div className="border-t border-border pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Dias Trabalhados</span>
                  <span className="text-sm font-bold text-foreground">{stats.worked}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Sábado</span>
                  <span className={`text-sm font-medium ${stats.satWorked ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                    {stats.satWorked ? 'Sim' : 'Não'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Faltas</span>
                  <span className={`text-sm font-medium ${stats.absence > 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                    {stats.absence}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Férias</span>
                  <span className={`text-sm font-medium ${stats.vacation > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-foreground'}`}>
                    {stats.vacation}
                  </span>
                </div>
              </div>
              <div className="border-t border-border pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Alimentação</span>
                  <span className="text-sm font-medium text-foreground">
                    €{(stats.worked * 4.50).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Bônus Semanal</span>
                  <span className="text-sm font-medium text-foreground">
                    €{weekEarnings.breakdown
                      .filter(b => b.rule_id.startsWith('week_city') || b.rule_id.startsWith('saturday'))
                      .reduce((sum, b) => sum + b.amount, 0)
                      .toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">Total Semana</span>
                  <span className="text-lg font-bold text-foreground">
                    €{weekEarnings.total.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {isSaving ? (
              <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Salvando...</span>
            ) : saveMessage?.type === 'success' ? (
              <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="w-3 h-3" /> Salvo</span>
            ) : (
              <span>Auto-save</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
