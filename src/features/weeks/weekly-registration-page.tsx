import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval } from 'date-fns'
import { pt } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Save, Loader2, MapPin, Home, CheckCircle2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useWorkWeek, useWorkDaysByWeek, useSettings, useSalaryRules } from '@/hooks/use-queries'
import { useCreateWorkWeek, useUpsertWorkDay } from '@/hooks/use-queries'
import { calculateWeekEarnings, calculateDayEarnings } from '@/utils/rules-engine'
import { isNationalHoliday, isFafeMunicipalHoliday, getHolidayName } from '@/utils/holidays'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

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

export function WeeklyRegistrationPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
  const weekNumber = getWeekNumber(weekStart)
  const year = weekStart.getFullYear()

  const { data: existingWeek } = useWorkWeek(year, weekNumber)
  const { data: existingDays = [] } = useWorkDaysByWeek(year, weekNumber)
  const { data: settings } = useSettings()
  const { data: rules = [] } = useSalaryRules()

  const createWeek = useCreateWorkWeek()
  const upsertDay = useUpsertWorkDay()

  const weekDays = useMemo(() => {
    return eachDayOfInterval({ start: weekStart, end: weekEnd })
      .filter(date => date.getDay() >= 1 && date.getDay() <= 5)
  }, [weekStart, weekEnd])

  const [daysData, setDaysData] = useState<DayData[]>([])
  const lastWeekKeyRef = useRef<string>('')
  const initialLoadDoneRef = useRef(false)

  // Only reset from DB when week changes, not when existingDays changes after save
  const weekKey = `${year}-${weekNumber}`
  useEffect(() => {
    if (weekKey !== lastWeekKeyRef.current) {
      lastWeekKeyRef.current = weekKey
      initialLoadDoneRef.current = false
    }

    if (!initialLoadDoneRef.current && existingDays.length > 0) {
      initialLoadDoneRef.current = true
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
      // No data for this week yet, initialize empty
      initialLoadDoneRef.current = true
      setDaysData(weekDays.map(date => ({
        date: format(date, 'yyyy-MM-dd'),
        dayOfWeek: date.getDay(),
        worked: false,
        destination: settings?.default_city || 'Porto',
        sleptAway: false,
        isHoliday: isNationalHoliday(date) || isFafeMunicipalHoliday(date),
        isVacation: false,
        isAbsence: false,
        absenceType: '',
        notes: '',
      })))
    }
    setSaveMessage(null)
  }, [weekKey, existingDays, weekDays, settings?.default_city, existingWeek])

  const updateDay = (index: number, updates: Partial<DayData>) => {
    setDaysData(prev => prev.map((day, i) => i === index ? { ...day, ...updates } : day))
  }

  const weekEarnings = useMemo(() => {
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

  const handleSave = async () => {
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
          destination: daysData[0]?.destination || 'Porto',
          status: 'active',
          total_earned: weekEarnings.total,
        })
        weekId = newWeek.id
      }

      for (const day of daysData) {
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
      setSaveMessage({ type: 'success', text: 'Semana salva com sucesso!' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar.'
      setSaveMessage({ type: 'error', text: msg })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Registro Semanal</h1>
          <p className="text-muted-foreground">
            {format(weekStart, "d 'de' MMMM", { locale: pt })} - {format(weekEnd, "d 'de' MMMM", { locale: pt })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Badge variant="secondary" className="px-4 py-1">
            Semana {weekNumber}
          </Badge>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>

      {saveMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
            saveMessage.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
          }`}
        >
          {saveMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {saveMessage.text}
        </motion.div>
      )}

      <motion.div variants={item}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Destino da Semana</CardTitle>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <Select
                value={daysData[0]?.destination || 'Porto'}
                onValueChange={(value) => {
                  if (!value) return
                  setDaysData(prev => prev.map(day => ({ ...day, destination: value })))
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Porto">Porto</SelectItem>
                  <SelectItem value="Lisboa">Lisboa</SelectItem>
                  <SelectItem value="Algarve">Algarve</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {weekDays.map((date, index) => {
            const dayData = daysData[index]
            if (!dayData) return null
            const isHoliday = isNationalHoliday(date)
            const holidayName = getHolidayName(date)

            return (
              <motion.div
                key={date.toISOString()}
                variants={item}
                layout
              >
                <Card className={`transition-all ${dayData.worked ? 'border-green-500/30' : ''}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          dayData.worked
                            ? 'bg-green-500/10 text-green-600'
                            : isHoliday
                            ? 'bg-purple-500/10 text-purple-600'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          <span className="text-sm font-bold">
                            {format(date, 'EEE', { locale: pt })}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {format(date, "EEEE, d 'de' MMMM", { locale: pt })}
                          </p>
                          {isHoliday && holidayName && (
                            <p className="text-sm text-purple-600 dark:text-purple-400">
                              {holidayName}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant={dayData.worked ? 'default' : 'secondary'}>
                        {dayData.worked ? 'Trabalhou' : 'Não trabalhou'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Trabalhou?</Label>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={dayData.worked}
                            onCheckedChange={(checked: boolean) => updateDay(index, { worked: checked })}
                          />
                          <span className="text-sm">{dayData.worked ? 'Sim' : 'Não'}</span>
                        </div>
                      </div>

                      {dayData.worked && (
                        <>
                          <div className="space-y-2">
                            <Label className="text-sm text-muted-foreground">Destino</Label>
                            <Select
                              value={dayData.destination}
                              onValueChange={(value) => { if (value) updateDay(index, { destination: value }) }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Porto">Porto</SelectItem>
                                <SelectItem value="Lisboa">Lisboa</SelectItem>
                                <SelectItem value="Algarve">Algarve</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm text-muted-foreground">Dormiu fora?</Label>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={dayData.sleptAway}
                                onCheckedChange={(checked: boolean) => updateDay(index, { sleptAway: checked })}
                              />
                              <Home className="w-4 h-4 text-muted-foreground" />
                            </div>
                          </div>
                        </>
                      )}

                      {!dayData.worked && (
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">Tipo</Label>
                          <Select
                            value={dayData.absenceType}
                            onValueChange={(value) => {
                              if (value) updateDay(index, { 
                                absenceType: value,
                                isAbsence: value !== '',
                                isVacation: value === 'vacation'
                              })
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecionar..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="vacation">Férias</SelectItem>
                              <SelectItem value="sick">Baixa médica</SelectItem>
                              <SelectItem value="other">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Observações</Label>
                        <Textarea
                          placeholder="Nota opcional..."
                          value={dayData.notes}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateDay(index, { notes: e.target.value })}
                          className="h-10 resize-none"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      <motion.div variants={item}>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total da Semana</p>
                <p className="text-3xl font-bold text-foreground">
                  €{weekEarnings.total.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <Button onClick={handleSave} disabled={isSaving} size="lg">
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
