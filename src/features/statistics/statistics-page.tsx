import { useMemo, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, DollarSign, MapPin, Calendar,
  Target, ChevronDown, Clock, Briefcase, AlertTriangle, Gift, Utensils,
  Star, Tag, Paperclip, Camera, CheckSquare, Plus, X, Download, FileText,
  File, Trash2, Save, Award, Zap, BarChart3, Bed, Users, TrendingUp,
  ArrowUp, ArrowDown
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  useWorkWeeks, useWorkDaysByYear, useSalaryRules, usePayments,
  useMonthNotes, useUpsertMonthNote,
  useMonthChecklists, useCreateMonthChecklistItem, useUpdateMonthChecklistItem, useDeleteMonthChecklistItem,
  useMonthTags, useCreateMonthTag, useDeleteMonthTag,
  useMonthAttachments, useCreateMonthAttachment, useDeleteMonthAttachment,
  useMonthRating, useUpsertMonthRating,
} from '@/hooks/use-queries'
import { calculateMonthEarnings } from '@/utils/rules-engine'
import { receiptsService } from '@/services/api'
import { useAuthContext } from '@/hooks/use-auth-context'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
}

const MONTHS_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const TAG_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1']

type WorkspaceTab = 'financeiro' | 'trabalho' | 'deslocacoes' | 'diario' | 'documentos'

const WORKSPACE_TABS: { id: WorkspaceTab; label: string; icon: typeof DollarSign }[] = [
  { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
  { id: 'trabalho', label: 'Trabalho', icon: Briefcase },
  { id: 'deslocacoes', label: 'Deslocações', icon: MapPin },
  { id: 'diario', label: 'Diário', icon: FileText },
  { id: 'documentos', label: 'Documentos', icon: Paperclip },
]

function formatEuro(value: number): string {
  return `€${Math.abs(value).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
}

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(month: number, year: number): number {
  return new Date(year, month, 1).getDay()
}

export function StatisticsPage() {
  const { user } = useAuthContext()
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth)
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('financeiro')
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const { data: workWeeks = [] } = useWorkWeeks()
  const { data: yearWorkDays = [] } = useWorkDaysByYear(selectedYear)
  const { data: rules = [] } = useSalaryRules()
  const { data: payments = [] } = usePayments()

  const monthNum = selectedMonth + 1
  const { data: monthNote } = useMonthNotes(monthNum, selectedYear)
  const { data: monthChecklist = [] } = useMonthChecklists(monthNum, selectedYear)
  const { data: monthTags = [] } = useMonthTags(monthNum, selectedYear)
  const { data: monthAttachments = [] } = useMonthAttachments(monthNum, selectedYear)
  const { data: monthRating } = useMonthRating(monthNum, selectedYear)

  const upsertNote = useUpsertMonthNote()
  const createChecklistItem = useCreateMonthChecklistItem()
  const updateChecklistItem = useUpdateMonthChecklistItem()
  const deleteChecklistItem = useDeleteMonthChecklistItem()
  const createTag = useCreateMonthTag()
  const deleteTag = useDeleteMonthTag()
  const createAttachment = useCreateMonthAttachment()
  const deleteAttachment = useDeleteMonthAttachment()
  const upsertRating = useUpsertMonthRating()

  const yearWeeks = useMemo(() => {
    return workWeeks.filter(w => new Date(w.start_date).getFullYear() === selectedYear)
  }, [workWeeks, selectedYear])

  const monthData = useMemo(() => {
    const filteredDays = yearWorkDays.filter(d => {
      const date = new Date(d.date)
      return date.getMonth() + 1 === monthNum
    })
    const filteredWeeks = yearWeeks.filter(w => new Date(w.start_date).getMonth() === selectedMonth)
    const calc = filteredDays.length > 0 ? calculateMonthEarnings(filteredDays, rules) : { total: 0, breakdown: [] }

    const workedDays = filteredDays.filter(d => d.worked)
    const absences = filteredDays.filter(d => d.is_absence)
    const vacations = filteredDays.filter(d => d.is_vacation)
    const holidays = filteredDays.filter(d => d.is_holiday)
    const saturdays = workedDays.filter(d => new Date(d.date).getDay() === 6)
    const weekdaysWorked = workedDays.filter(d => {
      const day = new Date(d.date).getDay()
      return day >= 1 && day <= 5 && !d.is_holiday && !d.is_vacation
    })
    const sleptAway = workedDays.filter(d => d.slept_away)

    const cities: Record<string, { weeks: number; earned: number; days: number; saturdays: number; sleptAway: number }> = {}
    filteredWeeks.forEach(week => {
      const city = week.destination || 'Não definido'
      if (!cities[city]) cities[city] = { weeks: 0, earned: 0, days: 0, saturdays: 0, sleptAway: 0 }
      cities[city].weeks++
    })
    workedDays.forEach(day => {
      const city = day.destination || 'Não definido'
      if (!cities[city]) cities[city] = { weeks: 0, earned: 0, days: 0, saturdays: 0, sleptAway: 0 }
      cities[city].days++
      if (day.slept_away) cities[city].sleptAway++
      if (new Date(day.date).getDay() === 6) cities[city].saturdays++
    })

    Object.keys(cities).forEach(city => {
      const cityDays = filteredDays.filter(d => d.destination === city)
      const cityCalc = cityDays.length > 0 ? calculateMonthEarnings(cityDays, rules) : { total: 0 }
      cities[city].earned = cityCalc.total
    })

    const saturdaysByCity: Record<string, number> = {}
    saturdays.forEach(d => {
      const city = d.destination || 'Não definido'
      saturdaysByCity[city] = (saturdaysByCity[city] || 0) + 1
    })

    const cityFreq = Object.entries(cities).sort((a, b) => b[1].days - a[1].days)
    const mostFrequentCity = cityFreq.length > 0 ? cityFreq[0][0] : '-'
    const cityEarned = Object.entries(cities).sort((a, b) => b[1].earned - a[1].earned)
    const mostProfitableCity = cityEarned.length > 0 ? cityEarned[0][0] : '-'
    const totalSleptAway = sleptAway.length

    let maxStreak = 0
    let currentStreak = 0
    const sortedDays = [...filteredDays].sort((a, b) => a.date.localeCompare(b.date))
    for (const day of sortedDays) {
      if (day.worked && !day.is_absence) {
        currentStreak++
        maxStreak = Math.max(maxStreak, currentStreak)
      } else {
        currentStreak = 0
      }
    }

    const mealDays = weekdaysWorked.length
    const mealAllowance = mealDays * 4.27

    return {
      totalEarned: calc.total,
      breakdown: calc.breakdown,
      totalWeeks: filteredWeeks.length,
      workedDays: workedDays.length,
      saturdays: saturdays.length,
      absences: absences.length,
      vacations: vacations.length,
      holidays: holidays.length,
      weekdaysWorked: weekdaysWorked.length,
      sleptAway: sleptAway.length,
      cities: Object.entries(cities).map(([name, data]) => ({ name, ...data })),
      saturdaysByCity,
      mostFrequentCity,
      mostProfitableCity,
      totalSleptAway,
      maxStreak,
      mealDays,
      mealAllowance,
      filteredDays,
      filteredWeeks,
      absencesList: absences,
      vacationsList: vacations,
      holidaysList: holidays,
      saturdaysList: saturdays,
    }
  }, [yearWorkDays, yearWeeks, rules, selectedMonth, monthNum])

  const prevMonthData = useMemo(() => {
    const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1
    const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear
    const prevMonthNum = prevMonth + 1
    const prevDays = yearWorkDays.filter(d => {
      const date = new Date(d.date)
      return date.getMonth() + 1 === prevMonthNum && date.getFullYear() === prevYear
    })
    const prevCalc = prevDays.length > 0 ? calculateMonthEarnings(prevDays, rules) : { total: 0 }
    return {
      total: prevCalc.total,
      worked: prevDays.filter(d => d.worked).length,
      saturdays: prevDays.filter(d => new Date(d.date).getDay() === 6 && d.worked).length,
      absences: prevDays.filter(d => d.is_absence).length,
    }
  }, [yearWorkDays, rules, selectedMonth, selectedYear])

  const payment = useMemo(() => {
    return payments.find(p => p.month === monthNum && p.year === selectedYear)
  }, [payments, monthNum, selectedYear])

  const competencyStatus = useMemo(() => {
    if (!payment) return 'Competência em andamento'
    if (payment.status === 'paid') return 'Competência Finalizada'
    if (payment.status === 'partial') return 'Pagamento Parcial'
    return 'Competência em andamento'
  }, [payment])

  const paymentDate = useMemo(() => {
    const nextMonth = monthNum === 12 ? 1 : monthNum + 1
    return `15 ${MONTHS_FULL[nextMonth - 1]}`
  }, [monthNum, selectedYear])

  const [noteContent, setNoteContent] = useState('')
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [newTag, setNewTag] = useState('')
  const [selectedTagColor, setSelectedTagColor] = useState(TAG_COLORS[0])

  const handleSaveNote = useCallback(() => {
    upsertNote.mutate({ month: monthNum, year: selectedYear, content: noteContent })
  }, [noteContent, monthNum, selectedYear, upsertNote])

  const handleAddChecklistItem = useCallback(() => {
    if (!newChecklistItem.trim()) return
    createChecklistItem.mutate({
      month: monthNum, year: selectedYear,
      item: newChecklistItem.trim(), sort_order: monthChecklist.length,
    })
    setNewChecklistItem('')
  }, [newChecklistItem, monthNum, selectedYear, monthChecklist.length, createChecklistItem])

  const handleAddTag = useCallback(() => {
    if (!newTag.trim()) return
    createTag.mutate({ month: monthNum, year: selectedYear, tag: newTag.trim(), color: selectedTagColor })
    setNewTag('')
  }, [newTag, monthNum, selectedYear, selectedTagColor, createTag])

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !user) return
    for (const file of Array.from(files)) {
      const uploaded = await receiptsService.upload(file, user.id)
      createAttachment.mutate({
        month: monthNum, year: selectedYear, ...uploaded,
        category: file.type.startsWith('image/') ? 'photo' : 'document',
      })
    }
    e.target.value = ''
  }, [user, monthNum, selectedYear, createAttachment])

  const handleExport = useCallback(() => {
    window.print()
  }, [])

  const periodLabel = `${MONTHS_FULL[selectedMonth]} ${selectedYear}`
  const prevDiff = monthData.totalEarned - prevMonthData.total
  const prevDiffPct = prevMonthData.total > 0 ? Math.round((prevDiff / prevMonthData.total) * 100) : 0

  const groupedBreakdown = useMemo(() => {
    const grouped: Record<string, { name: string; count: number; total: number; type: string }> = {}
    monthData.breakdown.filter(b => b.applied).forEach(b => {
      const key = b.rule_name
      if (!grouped[key]) grouped[key] = { name: b.rule_name, count: 0, total: 0, type: b.rule_id }
      grouped[key].count++
      grouped[key].total += b.amount
    })
    return Object.values(grouped).sort((a, b) => b.total - a.total)
  }, [monthData.breakdown])

  const selectedDayData = useMemo(() => {
    if (!selectedDay) return null
    return monthData.filteredDays.find(d => d.date === selectedDay) || null
  }, [selectedDay, monthData.filteredDays])

  const totalSalaryComponents = groupedBreakdown.length

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4 lg:space-y-6 pb-20">
      {/* HEADER */}
      <motion.div variants={item} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Relatório Mensal
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">{periodLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setShowMonthPicker(!showMonthPicker)} className="gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {MONTHS_FULL[selectedMonth]}
              <ChevronDown className="w-3 h-3" />
            </Button>
            {showMonthPicker && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                className="absolute top-full mt-1 right-0 z-50 bg-card border border-border rounded-xl shadow-xl p-2 min-w-[180px]">
                {MONTHS_SHORT.map((_m, i) => (
                  <button key={i} onClick={() => { setSelectedMonth(i); setShowMonthPicker(false) }}
                    className={`w-full text-left px-3 py-1.5 text-sm rounded-lg transition-colors ${selectedMonth === i ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                    {MONTHS_FULL[i]}
                  </button>
                ))}
              </motion.div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedYear(y => y - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium text-foreground min-w-[50px] text-center">{selectedYear}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedYear(y => y + 1)} disabled={selectedYear >= currentYear}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
            <Download className="w-3.5 h-3.5" />
            Exportar
          </Button>
        </div>
      </motion.div>

      {/* COMPETENCY HEADER */}
      <motion.div variants={item}>
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg md:text-xl font-bold text-foreground">{periodLabel}</h2>
                <p className="text-sm text-muted-foreground">Competência</p>
              </div>
              <div className="flex flex-col sm:items-end gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Pagamento previsto:</span>
                  <span className="text-sm font-bold text-primary">{paymentDate}</span>
                </div>
                <Badge variant={payment?.status === 'paid' ? 'default' : 'secondary'} className="w-fit">
                  {competencyStatus}
                </Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-3 italic">
              {MONTHS_FULL[selectedMonth]} teve {monthData.workedDays} dias trabalhados, {monthData.saturdays} sábados
              {monthData.absences > 0 ? ` e ${monthData.absences} falta(s)` : ' e nenhum desconto'}
              {monthData.holidays > 0 ? `, ${monthData.holidays} feriado(s)` : ''}.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* FINANCIAL SUMMARY */}
      <motion.div variants={item}>
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-primary" />
              <h3 className="text-base font-bold text-foreground">Resumo Financeiro</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-lg font-bold text-primary">{formatEuro(monthData.totalEarned)}</span>
                <span className="text-xs text-muted-foreground">Recebimento previsto</span>
              </div>
              {monthData.breakdown.filter(b => b.applied && b.rule_id !== 'base' && b.rule_id !== 'duodecimos' && b.rule_id !== 'meal_voucher').map((b, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                  <span className="text-sm text-foreground">{b.rule_name}</span>
                  <span className={`text-sm font-bold ${b.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {b.amount >= 0 ? '+' : ''}{formatEuro(b.amount)}
                  </span>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Salário Base</span>
                  <span className="text-sm font-medium text-foreground">€820,00</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Subsídio Alimentação</span>
                  <span className="text-sm font-medium text-foreground">{formatEuro(monthData.mealAllowance)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Duodécimos</span>
                  <span className="text-sm font-medium text-foreground">€150,00</span>
                </div>
                {monthData.absences > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Descontos</span>
                    <span className="text-sm font-medium text-red-600 dark:text-red-400">
                      -{formatEuro(monthData.absencesList.reduce((sum, a) => sum + (a.day_of_week === 1 || a.day_of_week === 5 ? 240 : 80), 0))}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* OPERATIONAL SUMMARY */}
      <motion.div variants={item}>
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-blue-500" />
              <h3 className="text-base font-bold text-foreground">Resumo Operacional</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[
                { icon: Briefcase, label: 'Dias Trabalhados', value: monthData.workedDays, color: 'text-green-600 dark:text-green-400' },
                { icon: Calendar, label: 'Semanas', value: monthData.totalWeeks, color: 'text-foreground' },
                { icon: Clock, label: 'Sábados', value: monthData.saturdays, color: 'text-orange-600 dark:text-orange-400' },
                { icon: Calendar, label: 'Feriados', value: monthData.holidays, color: 'text-cyan-600 dark:text-cyan-400' },
                { icon: AlertTriangle, label: 'Faltas', value: monthData.absences, color: 'text-red-600 dark:text-red-400' },
                { icon: Calendar, label: 'Férias', value: monthData.vacations, color: 'text-yellow-600 dark:text-yellow-400' },
                { icon: Bed, label: 'Dormiu Fora', value: `${monthData.sleptAway} noites`, color: 'text-purple-600 dark:text-purple-400' },
                { icon: MapPin, label: 'Cidade Frequente', value: monthData.mostFrequentCity, color: 'text-primary' },
                { icon: Award, label: 'Maior Sequência', value: `${monthData.maxStreak} dias`, color: 'text-amber-600 dark:text-amber-400' },
              ].map((stat, i) => (
                <div key={i} className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-1.5 mb-1">
                    <stat.icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">{stat.label}</span>
                  </div>
                  <p className={`text-sm font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* TAGS */}
      {monthTags.length > 0 && (
        <motion.div variants={item} className="flex flex-wrap gap-2">
          {monthTags.map((tag) => (
            <Badge key={tag.id} variant="secondary" className="gap-1" style={{ backgroundColor: `${tag.color}20`, color: tag.color, borderColor: `${tag.color}40` }}>
              <Tag className="w-3 h-3" />
              {tag.tag}
              <button onClick={() => deleteTag.mutate(tag.id)} className="ml-1 hover:opacity-70">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </motion.div>
      )}

      {/* WORKSPACE CATEGORY SELECTOR */}
      <motion.div variants={item}>
        <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          {WORKSPACE_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* WORKSPACE CONTENT */}
      <motion.div variants={item}>
        {/* FINANCEIRO */}
        {activeTab === 'financeiro' && (
          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="space-y-0">
                {groupedBreakdown.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-border/40 last:border-0">
                    <div className="flex-1">
                      <span className="text-sm font-medium text-foreground">{item.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">×{item.count}</span>
                    </div>
                    <span className={`text-sm font-bold ${item.total >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {item.total >= 0 ? '+' : ''}{formatEuro(item.total)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between py-3 border-t-2 border-primary/30 mt-1">
                  <span className="text-base font-bold text-foreground">Total previsto</span>
                  <span className="text-lg font-bold text-primary">{formatEuro(monthData.totalEarned)}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4 text-center">
                O salário deste mês foi composto por {totalSalaryComponents} componente{totalSalaryComponents !== 1 ? 's' : ''} diferente{totalSalaryComponents !== 1 ? 's' : ''}.
              </p>
            </CardContent>
          </Card>
        )}

        {/* TRABALHO */}
        {activeTab === 'trabalho' && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Dias Trabalhados', value: monthData.workedDays, color: 'text-green-600 dark:text-green-400' },
                    { label: 'Faltas', value: monthData.absences, color: 'text-red-600 dark:text-red-400' },
                    { label: 'Férias', value: monthData.vacations, color: 'text-yellow-600 dark:text-yellow-400' },
                    { label: 'Feriados', value: monthData.holidays, color: 'text-cyan-600 dark:text-cyan-400' },
                    { label: 'Sábados', value: monthData.saturdays, color: 'text-orange-600 dark:text-orange-400' },
                    { label: 'Maior Sequência', value: `${monthData.maxStreak} dias`, color: 'text-amber-600 dark:text-amber-400' },
                    { label: 'Dormiu Fora', value: `${monthData.sleptAway} noites`, color: 'text-purple-600 dark:text-purple-400' },
                    { label: 'Cidade Frequente', value: monthData.mostFrequentCity, color: 'text-primary' },
                  ].map((stat, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-xs text-muted-foreground">{stat.label}</span>
                      <span className={`text-sm font-bold ${stat.color}`}>{stat.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 md:p-6">
                <p className="text-sm font-medium text-foreground mb-3">Calendário</p>
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                    <div key={i} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: getFirstDayOfMonth(selectedMonth, selectedYear) }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                  {Array.from({ length: getDaysInMonth(selectedMonth, selectedYear) }).map((_, i) => {
                    const day = i + 1
                    const dateStr = `${selectedYear}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                    const dayData = monthData.filteredDays.find(d => d.date === dateStr)
                    let bg = 'bg-muted/20'
                    let tx = 'text-muted-foreground'
                    if (dayData) {
                      if (dayData.is_absence) { bg = 'bg-red-500/20'; tx = 'text-red-600 dark:text-red-400' }
                      else if (dayData.is_vacation) { bg = 'bg-yellow-500/20'; tx = 'text-yellow-600 dark:text-yellow-400' }
                      else if (dayData.is_holiday) { bg = 'bg-blue-500/20'; tx = 'text-blue-600 dark:text-blue-400' }
                      else if (dayData.worked && new Date(dateStr).getDay() === 6) { bg = 'bg-orange-500/20'; tx = 'text-orange-600 dark:text-orange-400' }
                      else if (dayData.worked) { bg = 'bg-green-500/20'; tx = 'text-green-600 dark:text-green-400' }
                    }
                    const isSelected = selectedDay === dateStr
                    return (
                      <button key={day} onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                        className={`aspect-square rounded-lg flex flex-col items-center justify-center ${bg} ${tx} transition-all ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''}`}>
                        <span className="text-xs font-medium">{day}</span>
                      </button>
                    )
                  })}
                </div>
                <div className="flex flex-wrap gap-2 mt-3 text-[9px]">
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-green-500/30" />Trabalhado</div>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-orange-500/30" />Sábado</div>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-blue-500/30" />Feriado</div>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-red-500/30" />Falta</div>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-yellow-500/30" />Férias</div>
                </div>

                {selectedDayData && (
                  <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <p className="text-xs font-medium text-primary mb-2">{formatDate(selectedDay!)}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Trabalhou:</span> <span className="font-medium">{selectedDayData.worked ? 'Sim' : 'Não'}</span></div>
                      {selectedDayData.destination && <div><span className="text-muted-foreground">Cidade:</span> <span className="font-medium">{selectedDayData.destination}</span></div>}
                      {selectedDayData.is_absence && <div><span className="text-muted-foreground">Tipo:</span> <span className="font-medium text-red-500">Falta</span></div>}
                      {selectedDayData.is_vacation && <div><span className="text-muted-foreground">Tipo:</span> <span className="font-medium text-yellow-500">Férias</span></div>}
                      {selectedDayData.is_holiday && <div><span className="text-muted-foreground">Tipo:</span> <span className="font-medium text-blue-500">Feriado</span></div>}
                      {selectedDayData.slept_away && <div><span className="text-muted-foreground">Dormiu fora:</span> <span className="font-medium">Sim</span></div>}
                      {selectedDayData.earned ? <div><span className="text-muted-foreground">Ganho:</span> <span className="font-medium">{formatEuro(selectedDayData.earned)}</span></div> : null}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* DESLOCAÇÕES */}
        {activeTab === 'deslocacoes' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {monthData.cities.map((city) => (
                <Card key={city.name}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="text-sm font-bold text-foreground">{city.name}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Semanas</span>
                        <span className="text-sm font-bold text-foreground">{city.weeks}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Dias</span>
                        <span className="text-sm font-bold text-foreground">{city.days}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Sábados</span>
                        <span className="text-sm font-bold text-orange-500">{city.saturdays}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Dormiu fora</span>
                        <span className="text-sm font-bold text-purple-500">{city.sleptAway}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-border/40">
                        <span className="text-xs text-muted-foreground">Valor</span>
                        <span className="text-sm font-bold text-primary">{formatEuro(city.earned)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <p className="text-[10px] text-muted-foreground mb-1">Cidade Mais Frequente</p>
                    <p className="text-sm font-bold text-primary">{monthData.mostFrequentCity}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <p className="text-[10px] text-muted-foreground mb-1">Cidade Mais Lucrativa</p>
                    <p className="text-sm font-bold text-primary">{monthData.mostProfitableCity}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <p className="text-[10px] text-muted-foreground mb-1">Total Noites Fora</p>
                    <p className="text-sm font-bold text-purple-500">{monthData.totalSleptAway}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* DIÁRIO */}
        {activeTab === 'diario' && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 md:p-6">
                <p className="text-sm font-medium text-foreground mb-3">Diário do Mês</p>
                <Textarea
                  placeholder={`Escreva sobre o mês de ${MONTHS_FULL[selectedMonth]}...`}
                  value={noteContent || monthNote?.content || ''}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="min-h-[180px] resize-y"
                />
                <div className="flex justify-end mt-2">
                  <Button onClick={handleSaveNote} disabled={upsertNote.isPending} size="sm" className="gap-1.5">
                    <Save className="w-3.5 h-3.5" />
                    {upsertNote.isPending ? 'A guardar...' : 'Guardar'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 md:p-6">
                <p className="text-sm font-medium text-foreground mb-3">Checklist</p>
                <div className="space-y-1.5">
                  {monthChecklist.map((ci) => (
                    <div key={ci.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 group">
                      <Checkbox checked={ci.completed} onCheckedChange={(checked) => updateChecklistItem.mutate({ id: ci.id, completed: !!checked })} />
                      <span className={`flex-1 text-sm ${ci.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{ci.item}</span>
                      <button onClick={() => deleteChecklistItem.mutate(ci.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-3">
                  <Input placeholder="Adicionar item..." value={newChecklistItem} onChange={(e) => setNewChecklistItem(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()} className="flex-1" />
                  <Button onClick={handleAddChecklistItem} size="icon" variant="outline"><Plus className="w-4 h-4" /></Button>
                </div>
                {monthChecklist.length > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-2">{monthChecklist.filter(i => i.completed).length}/{monthChecklist.length} concluídos</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 md:p-6">
                <p className="text-sm font-medium text-foreground mb-3">Avaliação</p>
                <div className="flex items-center justify-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => upsertRating.mutate({ month: monthNum, year: selectedYear, rating: star, reflection: monthRating?.reflection || '' })}>
                      <Star className={`w-7 h-7 ${(monthRating?.rating || 0) >= star ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`} />
                    </button>
                  ))}
                </div>
                <Textarea placeholder="O que faria diferente no próximo mês?" value={monthRating?.reflection || ''}
                  onChange={(e) => upsertRating.mutate({ month: monthNum, year: selectedYear, rating: monthRating?.rating || null, reflection: e.target.value })}
                  className="min-h-[100px]" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-medium text-foreground mb-3">Tags</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {monthTags.map((tag) => (
                    <Badge key={tag.id} variant="secondary" className="gap-1" style={{ backgroundColor: `${tag.color}20`, color: tag.color }}>
                      <Tag className="w-3 h-3" />{tag.tag}
                      <button onClick={() => deleteTag.mutate(tag.id)} className="ml-1 hover:opacity-70"><X className="w-3 h-3" /></button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Nova tag..." value={newTag} onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()} className="flex-1" />
                  <div className="flex gap-1">
                    {TAG_COLORS.slice(0, 5).map((c) => (
                      <button key={c} onClick={() => setSelectedTagColor(c)}
                        className={`w-5 h-5 rounded-full border-2 transition-all ${selectedTagColor === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <Button onClick={handleAddTag} size="icon" variant="outline"><Plus className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* DOCUMENTOS */}
        {activeTab === 'documentos' && (
          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-foreground">Documentos</p>
                <label>
                  <Button variant="outline" size="sm" className="gap-1.5 cursor-pointer">
                    <Plus className="w-3.5 h-3.5" />Adicionar
                  </Button>
                  <input type="file" multiple accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
              {monthAttachments.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Camera className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum documento</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {monthAttachments.map((att) => (
                    <div key={att.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        {att.file_type.startsWith('image/') ? (
                          <img src={att.file_url} alt={att.file_name} className="w-full h-full object-cover rounded-lg" />
                        ) : att.file_type.includes('pdf') ? (
                          <FileText className="w-5 h-5 text-red-400" />
                        ) : (
                          <File className="w-5 h-5 text-blue-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{att.file_name}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDate(att.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <a href={att.file_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="h-7 w-7"><FileText className="w-3.5 h-3.5" /></Button>
                        </a>
                        <a href={att.file_url} download={att.file_name}>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><Download className="w-3.5 h-3.5" /></Button>
                        </a>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteAttachment.mutate(att.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </motion.div>
    </motion.div>
  )
}
