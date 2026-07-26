import { useMemo, useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import {
  ChevronLeft, ChevronRight, DollarSign, TrendingUp, TrendingDown, MapPin, Calendar,
  Target, ChevronDown, Clock, Briefcase, AlertTriangle, Gift, Utensils, Home,
  Star, Tag, Paperclip, Camera, CheckSquare, Plus, X, Download, FileText,
  Image, File, Trash2, Edit3, Save, MessageSquare, Award, Zap, BarChart3,
  Bed, Users, ArrowUp, ArrowDown, Minus
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16']
const MONTHS_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const TAG_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1']

function formatEuro(value: number): string {
  return `€${Math.abs(value).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
}

function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })
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
  const pageRef = useRef<HTMLDivElement>(null)

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

    const cities: Record<string, { weeks: number; earned: number; days: number; weekAmount: number }> = {}
    filteredWeeks.forEach(week => {
      const city = week.destination || 'Não definido'
      if (!cities[city]) cities[city] = { weeks: 0, earned: 0, days: 0, weekAmount: 0 }
      cities[city].weeks++
      cities[city].weekAmount += week.total_earned || 0
    })
    workedDays.forEach(day => {
      const city = day.destination || 'Não definido'
      if (cities[city]) cities[city].days++
    })

    const saturdaysByCity: Record<string, number> = {}
    saturdays.forEach(d => {
      const city = d.destination || 'Não definido'
      saturdaysByCity[city] = (saturdaysByCity[city] || 0) + 1
    })

    const cityFreq = Object.entries(cities).sort((a, b) => b[1].days - a[1].days)
    const mostFrequentCity = cityFreq.length > 0 ? cityFreq[0][0] : '-'

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
    const nextYear = monthNum === 12 ? selectedYear + 1 : selectedYear
    return `15 ${MONTHS_FULL[nextMonth - 1]}`
  }, [monthNum, selectedYear])

  const monthlyBarData = useMemo(() => {
    return MONTHS_SHORT.map((name, index) => {
      const mNum = index + 1
      const mDays = yearWorkDays.filter(d => new Date(d.date).getMonth() + 1 === mNum)
      const calc = mDays.length > 0 ? calculateMonthEarnings(mDays, rules) : { total: 0 }
      return { name, valor: calc.total }
    })
  }, [yearWorkDays, rules])

  const [noteContent, setNoteContent] = useState('')
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [newTag, setNewTag] = useState('')
  const [selectedTagColor, setSelectedTagColor] = useState(TAG_COLORS[0])
  const [activeDetailTab, setActiveDetailTab] = useState('financial')

  const handleSaveNote = useCallback(() => {
    upsertNote.mutate({
      month: monthNum,
      year: selectedYear,
      content: noteContent,
    })
  }, [noteContent, monthNum, selectedYear, upsertNote])

  const handleAddChecklistItem = useCallback(() => {
    if (!newChecklistItem.trim()) return
    createChecklistItem.mutate({
      month: monthNum,
      year: selectedYear,
      item: newChecklistItem.trim(),
      sort_order: monthChecklist.length,
    })
    setNewChecklistItem('')
  }, [newChecklistItem, monthNum, selectedYear, monthChecklist.length, createChecklistItem])

  const handleAddTag = useCallback(() => {
    if (!newTag.trim()) return
    createTag.mutate({
      month: monthNum,
      year: selectedYear,
      tag: newTag.trim(),
      color: selectedTagColor,
    })
    setNewTag('')
  }, [newTag, monthNum, selectedYear, selectedTagColor, createTag])

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !user) return
    for (const file of Array.from(files)) {
      const uploaded = await receiptsService.upload(file, user.id)
      createAttachment.mutate({
        month: monthNum,
        year: selectedYear,
        ...uploaded,
        category: file.type.startsWith('image/') ? 'photo' : 'document',
      })
    }
    e.target.value = ''
  }, [user, monthNum, selectedYear, createAttachment])

  const handleExport = useCallback((format: 'print' | 'json') => {
    if (format === 'print') {
      window.print()
      return
    }
    const data = {
      period: `${MONTHS_FULL[selectedMonth]} ${selectedYear}`,
      financial: {
        totalEarned: monthData.totalEarned,
        breakdown: monthData.breakdown,
      },
      operational: {
        workedDays: monthData.workedDays,
        weeks: monthData.totalWeeks,
        saturdays: monthData.saturdays,
        absences: monthData.absences,
        vacations: monthData.vacations,
        holidays: monthData.holidays,
        sleptAway: monthData.sleptAway,
        mostFrequentCity: monthData.mostFrequentCity,
      },
      cities: monthData.cities,
      note: monthNote?.content || '',
      checklist: monthChecklist,
      tags: monthTags,
      rating: monthRating,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-${MONTHS_SHORT[selectedMonth]}-${selectedYear}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [selectedMonth, selectedYear, monthData, monthNote, monthChecklist, monthTags, monthRating])

  const periodLabel = `${MONTHS_FULL[selectedMonth]} ${selectedYear}`

  const prevDiff = monthData.totalEarned - prevMonthData.total
  const prevDiffPct = prevMonthData.total > 0 ? Math.round((prevDiff / prevMonthData.total) * 100) : 0

  return (
    <motion.div ref={pageRef} variants={container} initial="hidden" animate="show" className="space-y-4 lg:space-y-6 pb-20">
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
          <Button variant="outline" size="sm" onClick={() => handleExport('print')} className="gap-1.5">
            <Download className="w-3.5 h-3.5" />
            Exportar
          </Button>
        </div>
      </motion.div>

      {/* COMPETENCY HEADER CARD */}
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

      {/* MAIN CONTENT TABS */}
      <motion.div variants={item}>
        <Tabs defaultValue="financial" className="space-y-4">
          <div className="overflow-x-auto">
            <TabsList className="h-auto flex-wrap">
              <TabsTrigger value="financial">Financeiro</TabsTrigger>
              <TabsTrigger value="timeline">Linha do Tempo</TabsTrigger>
              <TabsTrigger value="calendar">Calendário</TabsTrigger>
              <TabsTrigger value="cities">Cidades</TabsTrigger>
              <TabsTrigger value="composition">Composição</TabsTrigger>
              <TabsTrigger value="evolution">Evolução</TabsTrigger>
              <TabsTrigger value="performance">Desempenho</TabsTrigger>
              <TabsTrigger value="diary">Diário</TabsTrigger>
              <TabsTrigger value="checklist">Checklist</TabsTrigger>
              <TabsTrigger value="attachments">Anexos</TabsTrigger>
              <TabsTrigger value="rating">Avaliação</TabsTrigger>
            </TabsList>
          </div>

          {/* TAB: Financial Detail */}
          <TabsContent value="financial">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-blue-500" />
                    <p className="text-sm font-medium text-foreground">Salário Base</p>
                  </div>
                  <div className="p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-foreground">Base Mensal</span>
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">€820,00</span>
                    </div>
                    {monthData.absences > 0 && (
                      <div className="flex items-center justify-between text-sm text-red-500">
                        <span>Descontos por faltas</span>
                        <span>-{formatEuro(monthData.absencesList.reduce((sum, a) => sum + (a.day_of_week === 1 || a.day_of_week === 5 ? 240 : 80), 0))}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-purple-500" />
                    <p className="text-sm font-medium text-foreground">Duodécimos</p>
                  </div>
                  <div className="p-3 bg-purple-500/5 rounded-lg border border-purple-500/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Valor Mensal Fixo</span>
                      <span className="text-sm font-bold text-purple-600 dark:text-purple-400">€150,00</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Utensils className="w-4 h-4 text-orange-500" />
                    <p className="text-sm font-medium text-foreground">Subsídio Alimentação</p>
                  </div>
                  <div className="p-3 bg-orange-500/5 rounded-lg border border-orange-500/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Dias elegíveis</span>
                      <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{monthData.mealDays} dias</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Valor por dia</span>
                      <span className="text-sm text-foreground">€4,27</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-orange-500/20 pt-2">
                      <span className="text-sm font-medium text-foreground">Total</span>
                      <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{formatEuro(monthData.mealAllowance)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-green-500" />
                    <p className="text-sm font-medium text-foreground">Sábados Trabalhados</p>
                  </div>
                  <div className="p-3 bg-green-500/5 rounded-lg border border-green-500/20 space-y-2">
                    {Object.entries(monthData.saturdaysByCity).length > 0 ? (
                      Object.entries(monthData.saturdaysByCity).map(([city, count]) => (
                        <div key={city} className="flex items-center justify-between">
                          <span className="text-sm text-foreground">{city} ({count}×)</span>
                          <span className="text-sm font-bold text-green-600 dark:text-green-400">
                            {formatEuro(city === 'Porto' ? count * 80 : count * 110)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-2">Nenhum sábado trabalhado</p>
                    )}
                  </div>
                </CardContent>
              </Card>
              {monthData.absencesList.length > 0 && (
                <Card className="lg:col-span-2">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <p className="text-sm font-medium text-foreground">Faltas Registadas</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {monthData.absencesList.map((absence, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-red-500/5 rounded-lg border border-red-500/20">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-foreground">{formatDate(absence.date)}</span>
                            <span className="text-xs text-muted-foreground">({DAY_NAMES[new Date(absence.date).getDay()]})</span>
                          </div>
                          <span className="text-sm font-bold text-red-600 dark:text-red-400">
                            -{formatEuro(absence.day_of_week === 1 || absence.day_of_week === 5 ? 240 : 80)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* TAB: Timeline */}
          <TabsContent value="timeline">
            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                  <div className="space-y-4">
                    {(() => {
                      const events: { date: string; label: string; icon: typeof Calendar; color: string }[] = []
                      events.push({ date: `${selectedYear}-${String(monthNum).padStart(2, '0')}-01`, label: 'Competência iniciada.', icon: Calendar, color: 'text-blue-500 bg-blue-500/10' })

                      const sortedWeeks = [...monthData.filteredWeeks].sort((a, b) => a.start_date.localeCompare(b.start_date))
                      sortedWeeks.forEach(week => {
                        events.push({
                          date: week.start_date,
                          label: `Semana ${week.destination || 'Não definido'}`,
                          icon: MapPin,
                          color: 'text-indigo-500 bg-indigo-500/10',
                        })
                      })

                      monthData.saturdaysList.forEach(d => {
                        events.push({
                          date: d.date,
                          label: `Sábado Trabalhado (${d.destination || '-'})`,
                          icon: Clock,
                          color: 'text-orange-500 bg-orange-500/10',
                        })
                      })

                      monthData.holidaysList.forEach(d => {
                        events.push({
                          date: d.date,
                          label: `Feriado (${d.destination || '-'})`,
                          icon: Calendar,
                          color: 'text-cyan-500 bg-cyan-500/10',
                        })
                      })

                      if (payment?.status === 'paid') {
                        events.push({
                          date: payment.payment_date || `${selectedYear}-${String(monthNum).padStart(2, '0')}-15`,
                          label: 'Pagamento Recebido.',
                          icon: DollarSign,
                          color: 'text-green-500 bg-green-500/10',
                        })
                      }

                      const lastDay = getDaysInMonth(selectedMonth, selectedYear)
                      events.push({ date: `${selectedYear}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`, label: 'Competência encerrada.', icon: Calendar, color: 'text-red-500 bg-red-500/10' })

                      const uniqueEvents = events.filter((e, i, arr) => arr.findIndex(x => x.date === e.date && x.label === e.label) === i)
                      uniqueEvents.sort((a, b) => a.date.localeCompare(b.date))

                      return uniqueEvents.map((event, i) => (
                        <div key={i} className="flex items-start gap-4 relative">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${event.color}`}>
                            <event.icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 pb-4">
                            <p className="text-xs text-muted-foreground">{formatDateFull(event.date)}</p>
                            <p className="text-sm font-medium text-foreground">{event.label}</p>
                          </div>
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Calendar */}
          <TabsContent value="calendar">
            <Card>
              <CardContent className="p-4 md:p-6">
                <p className="text-sm font-medium text-foreground mb-4">Calendário {periodLabel}</p>
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                    <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
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
                    let bgColor = 'bg-muted/30'
                    let textColor = 'text-muted-foreground'
                    let tooltip = 'Folga'

                    if (dayData) {
                      if (dayData.is_absence) {
                        bgColor = 'bg-red-500/20'
                        textColor = 'text-red-600 dark:text-red-400'
                        tooltip = 'Falta'
                      } else if (dayData.is_vacation) {
                        bgColor = 'bg-yellow-500/20'
                        textColor = 'text-yellow-600 dark:text-yellow-400'
                        tooltip = 'Férias'
                      } else if (dayData.is_holiday) {
                        bgColor = 'bg-blue-500/20'
                        textColor = 'text-blue-600 dark:text-blue-400'
                        tooltip = 'Feriado'
                      } else if (dayData.worked && new Date(dateStr).getDay() === 6) {
                        bgColor = 'bg-orange-500/20'
                        textColor = 'text-orange-600 dark:text-orange-400'
                        tooltip = 'Sábado'
                      } else if (dayData.worked) {
                        bgColor = 'bg-green-500/20'
                        textColor = 'text-green-600 dark:text-green-400'
                        tooltip = 'Trabalhado'
                      }
                    }

                    return (
                      <div key={day} className={`aspect-square rounded-lg flex flex-col items-center justify-center ${bgColor} relative group cursor-default`} title={tooltip}>
                        <span className={`text-xs font-medium ${textColor}`}>{day}</span>
                        {dayData?.destination && (
                          <span className="text-[8px] text-muted-foreground truncate max-w-full px-0.5">{dayData.destination.slice(0, 3)}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
                <div className="flex flex-wrap gap-3 mt-4 text-[10px]">
                  <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-green-500/30" /><span>Trabalhado</span></div>
                  <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-orange-500/30" /><span>Sábado</span></div>
                  <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-blue-500/30" /><span>Feriado</span></div>
                  <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-red-500/30" /><span>Falta</span></div>
                  <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-yellow-500/30" /><span>Férias</span></div>
                  <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-muted/50" /><span>Folga</span></div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Cities */}
          <TabsContent value="cities">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-foreground mb-4">Distribuição por Cidade</p>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={monthData.cities} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="weekAmount"
                          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                          {monthData.cities.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                          formatter={(value) => [formatEuro(Number(value)), 'Ganho']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-medium text-foreground">Resumo por Cidade</p>
                  {monthData.cities.map((city) => (
                    <div key={city.name} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-foreground">{city.name}</span>
                        <span className="text-sm font-medium text-foreground">{formatEuro(city.weekAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{city.weeks} semanas · {city.days} dias</span>
                        <span className="text-xs text-muted-foreground">
                          {city.days > 0 ? formatEuro(city.weekAmount / city.days) : '€0'}/dia
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${COLORS[monthData.cities.indexOf(city) % COLORS.length]}`}
                          style={{ width: `${(city.weekAmount / Math.max(...monthData.cities.map(c => c.weekAmount), 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB: Composition */}
          <TabsContent value="composition">
            <Card>
              <CardContent className="p-4 md:p-6">
                <p className="text-sm font-medium text-foreground mb-4">Composição do Salário</p>
                <div className="space-y-4">
                  {(() => {
                    const grouped: Record<string, number> = {}
                    monthData.breakdown.filter(b => b.applied).forEach(b => {
                      const name = b.rule_name
                      grouped[name] = (grouped[name] || 0) + b.amount
                    })
                    const maxVal = Math.max(...Object.values(grouped).map(Math.abs), 1)
                    return Object.entries(grouped).sort((a, b) => b[1] - a[1]).map(([name, amount]) => (
                      <div key={name} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-foreground">{name}</span>
                          <span className={`text-sm font-bold ${amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {amount >= 0 ? '+' : ''}{formatEuro(amount)}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full ${amount >= 0 ? 'bg-primary' : 'bg-red-500'}`}
                            style={{ width: `${(Math.abs(amount) / maxVal) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))
                  })()}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <span className="text-base font-bold text-foreground">Total</span>
                    <span className="text-lg font-bold text-primary">{formatEuro(monthData.totalEarned)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Evolution */}
          <TabsContent value="evolution">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 md:p-6">
                  <p className="text-sm font-medium text-foreground mb-4">Comparação com Mês Anterior</p>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-xs text-muted-foreground">Mês Anterior</p>
                        <p className="text-lg font-bold text-foreground">{MONTHS_FULL[selectedMonth === 0 ? 11 : selectedMonth - 1]}</p>
                      </div>
                      <p className="text-lg font-bold text-foreground">{formatEuro(prevMonthData.total)}</p>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <div>
                        <p className="text-xs text-muted-foreground">Mês Atual</p>
                        <p className="text-lg font-bold text-primary">{MONTHS_FULL[selectedMonth]}</p>
                      </div>
                      <p className="text-lg font-bold text-primary">{formatEuro(monthData.totalEarned)}</p>
                    </div>
                    <div className={`flex items-center justify-center gap-2 p-3 rounded-lg ${prevDiff >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      {prevDiff >= 0 ? <ArrowUp className="w-5 h-5 text-green-500" /> : <ArrowDown className="w-5 h-5 text-red-500" />}
                      <span className={`text-lg font-bold ${prevDiff >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {prevDiff >= 0 ? '+' : ''}{formatEuro(prevDiff)} ({prevDiffPct}%)
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 md:p-6">
                  <p className="text-sm font-medium text-foreground mb-4">Outras Comparações</p>
                  <div className="space-y-3">
                    {[
                      { label: 'Dias Trabalhados', current: monthData.workedDays, prev: prevMonthData.worked },
                      { label: 'Sábados', current: monthData.saturdays, prev: prevMonthData.saturdays },
                      { label: 'Faltas', current: monthData.absences, prev: prevMonthData.absences },
                    ].map((comp) => {
                      const diff = comp.current - comp.prev
                      return (
                        <div key={comp.label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                          <span className="text-sm text-foreground">{comp.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">{comp.prev}</span>
                            <Minus className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm font-bold text-foreground">{comp.current}</span>
                            {diff !== 0 && (
                              <span className={`text-xs font-medium ${diff > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {diff > 0 ? '+' : ''}{diff}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
              <Card className="lg:col-span-2">
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-foreground mb-4">Ganhos Mensais {selectedYear}</p>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyBarData}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-20" vertical={false} />
                        <XAxis dataKey="name" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `€${v}`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                          formatter={(value) => [formatEuro(Number(value)), 'Ganho']}
                        />
                        <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} opacity={0.8} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB: Performance */}
          <TabsContent value="performance">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(() => {
                const weekEarnings: Record<string, number> = {}
                monthData.filteredWeeks.forEach(w => {
                  weekEarnings[w.id] = w.total_earned || 0
                })
                const weekValues = Object.values(weekEarnings)
                const bestWeek = weekValues.length > 0 ? Math.max(...weekValues) : 0
                const bestDay = monthData.filteredDays.filter(d => d.worked).length > 0
                  ? Math.max(...monthData.filteredDays.filter(d => d.worked).map(d => d.earned || 0))
                  : 0
                const avgPerWeek = monthData.totalWeeks > 0 ? monthData.totalEarned / monthData.totalWeeks : 0
                const avgPerDay = monthData.workedDays > 0 ? monthData.totalEarned / monthData.workedDays : 0
                const workRate = monthData.filteredDays.length > 0
                  ? Math.round((monthData.workedDays / monthData.filteredDays.length) * 100)
                  : 0

                return [
                  { icon: Award, label: 'Maior Semana', value: formatEuro(bestWeek), color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-500/5 border-yellow-500/20' },
                  { icon: Zap, label: 'Maior Dia', value: formatEuro(bestDay), color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/5 border-amber-500/20' },
                  { icon: BarChart3, label: 'Média Semanal', value: formatEuro(avgPerWeek), color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/5 border-blue-500/20' },
                  { icon: Target, label: 'Média Diária', value: formatEuro(avgPerDay), color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/5 border-green-500/20' },
                  { icon: TrendingUp, label: 'Taxa de Trabalho', value: `${workRate}%`, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/5 border-purple-500/20' },
                  { icon: Users, label: 'Cidades Visitadas', value: String(monthData.cities.length), color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/5 border-indigo-500/20' },
                ].map((stat, i) => (
                  <Card key={i} className={`border ${stat.bg}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <stat.icon className={`w-4 h-4 ${stat.color}`} />
                        <span className="text-xs text-muted-foreground">{stat.label}</span>
                      </div>
                      <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                    </CardContent>
                  </Card>
                ))
              })()}
            </div>
          </TabsContent>

          {/* TAB: Diary */}
          <TabsContent value="diary">
            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  <h3 className="text-base font-bold text-foreground">Diário do Mês</h3>
                </div>
                <Textarea
                  placeholder={`Escreva sobre o mês de ${MONTHS_FULL[selectedMonth]}...\n\nExemplo:\n- Este mês foi tranquilo.\n- Lisboa rendeu muito.\n- Preciso comprar novas ferramentas.\n- Gostei da equipa do Porto.\n- Tive problemas com combustível.`}
                  value={noteContent || monthNote?.content || ''}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="min-h-[250px] resize-y"
                />
                <div className="flex justify-end mt-3">
                  <Button onClick={handleSaveNote} disabled={upsertNote.isPending} className="gap-1.5">
                    <Save className="w-3.5 h-3.5" />
                    {upsertNote.isPending ? 'A guardar...' : 'Guardar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Checklist */}
          <TabsContent value="checklist">
            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckSquare className="w-5 h-5 text-primary" />
                  <h3 className="text-base font-bold text-foreground">Checklist do Mês</h3>
                </div>
                <div className="space-y-2">
                  {monthChecklist.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 group">
                      <Checkbox
                        checked={item.completed}
                        onCheckedChange={(checked) => updateChecklistItem.mutate({ id: item.id, completed: !!checked })}
                      />
                      <span className={`flex-1 text-sm ${item.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {item.item}
                      </span>
                      <button onClick={() => deleteChecklistItem.mutate(item.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <Input
                    placeholder="Adicionar item..."
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                    className="flex-1"
                  />
                  <Button onClick={handleAddChecklistItem} size="icon" variant="outline">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {monthChecklist.length > 0 && (
                  <div className="mt-3 text-xs text-muted-foreground">
                    {monthChecklist.filter(i => i.completed).length}/{monthChecklist.length} concluídos
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Attachments */}
          <TabsContent value="attachments">
            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-5 h-5 text-primary" />
                    <h3 className="text-base font-bold text-foreground">Anexos e Galeria</h3>
                  </div>
                  <label>
                    <Button variant="outline" size="sm" className="gap-1.5 cursor-pointer">
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar
                    </Button>
                    <input type="file" multiple accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>
                {monthAttachments.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Camera className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Nenhum anexo neste mês</p>
                    <p className="text-xs mt-1">Adicione fotos, recibos ou documentos</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {monthAttachments.map((att) => (
                      <div key={att.id} className="relative group">
                        <div className="aspect-square rounded-lg overflow-hidden bg-muted border border-border">
                          {att.file_type.startsWith('image/') ? (
                            <img src={att.file_url} alt={att.file_name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2">
                              {att.file_type.includes('pdf') ? (
                                <FileText className="w-8 h-8 text-red-400" />
                              ) : (
                                <File className="w-8 h-8 text-blue-400" />
                              )}
                              <span className="text-[9px] text-muted-foreground text-center truncate w-full">{att.file_name}</span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => deleteAttachment.mutate(att.id)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Rating */}
          <TabsContent value="rating">
            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Star className="w-5 h-5 text-primary" />
                  <h3 className="text-base font-bold text-foreground">Avaliação do Mês</h3>
                </div>
                <div className="text-center mb-6">
                  <p className="text-sm text-muted-foreground mb-4">Como você avalia este mês?</p>
                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => upsertRating.mutate({ month: monthNum, year: selectedYear, rating: star, reflection: monthRating?.reflection || '' })}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-8 h-8 ${(monthRating?.rating || 0) >= star
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-muted-foreground'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  {monthRating?.rating && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {monthRating.rating}/5 estrela{monthRating.rating > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">O que faria diferente no próximo mês?</p>
                  <Textarea
                    placeholder="Reflexão sobre o mês..."
                    value={monthRating?.reflection || ''}
                    onChange={(e) => upsertRating.mutate({ month: monthNum, year: selectedYear, rating: monthRating?.rating || null, reflection: e.target.value })}
                    className="min-h-[120px]"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* ADD TAG */}
      <motion.div variants={item}>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Adicionar Tag</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Input
                placeholder="Nome da tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                className="flex-1 min-w-[150px]"
              />
              <div className="flex gap-1">
                {TAG_COLORS.slice(0, 6).map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedTagColor(color)}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${selectedTagColor === color ? 'border-foreground scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <Button onClick={handleAddTag} size="icon" variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
