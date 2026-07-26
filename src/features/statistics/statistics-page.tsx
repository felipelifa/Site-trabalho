import { useMemo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, DollarSign, MapPin, Calendar,
  ChevronDown, Clock, Briefcase, AlertTriangle, Camera,
  Star, Tag, Plus, X, Download, FileText,
  File, Trash2, Save, Award, Zap, BarChart3, Bed, TrendingUp
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

const MONTHS_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const TAG_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1']

type WorkspaceTab = 'financeiro' | 'trabalho' | 'deslocacoes' | 'diario' | 'documentos'

const WORKSPACE_TABS: { id: WorkspaceTab; label: string; emoji: string }[] = [
  { id: 'financeiro', label: 'Financeiro', emoji: '💰' },
  { id: 'trabalho', label: 'Trabalho', emoji: '📅' },
  { id: 'deslocacoes', label: 'Deslocações', emoji: '📍' },
  { id: 'diario', label: 'Diário', emoji: '📝' },
  { id: 'documentos', label: 'Documentos', emoji: '📎' },
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

  const yearWeeks = useMemo(() => workWeeks.filter(w => new Date(w.start_date).getFullYear() === selectedYear), [workWeeks, selectedYear])

  const monthData = useMemo(() => {
    const filteredDays = yearWorkDays.filter(d => new Date(d.date).getMonth() + 1 === monthNum)
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

    let maxStreak = 0, currentStreak = 0
    const sortedDays = [...filteredDays].sort((a, b) => a.date.localeCompare(b.date))
    for (const day of sortedDays) {
      if (day.worked && !day.is_absence) { currentStreak++; maxStreak = Math.max(maxStreak, currentStreak) }
      else { currentStreak = 0 }
    }

    return {
      totalEarned: calc.total, breakdown: calc.breakdown, totalWeeks: filteredWeeks.length,
      workedDays: workedDays.length, saturdays: saturdays.length, absences: absences.length,
      vacations: vacations.length, holidays: holidays.length, weekdaysWorked: weekdaysWorked.length,
      sleptAway: sleptAway.length,
      cities: Object.entries(cities).map(([name, data]) => ({ name, ...data })),
      saturdaysByCity, mostFrequentCity, mostProfitableCity, totalSleptAway: sleptAway.length,
      maxStreak, mealDays: weekdaysWorked.length, mealAllowance: weekdaysWorked.length * 4.27,
      filteredDays, filteredWeeks, absencesList: absences, vacationsList: vacations,
      holidaysList: holidays, saturdaysList: saturdays,
    }
  }, [yearWorkDays, yearWeeks, rules, selectedMonth, monthNum])

  const payment = useMemo(() => payments.find(p => p.month === monthNum && p.year === selectedYear), [payments, monthNum, selectedYear])
  const competencyStatus = useMemo(() => {
    if (!payment) return 'Competência em andamento'
    if (payment.status === 'paid') return 'Competência Finalizada'
    if (payment.status === 'partial') return 'Pagamento Parcial'
    return 'Competência em andamento'
  }, [payment])
  const paymentDate = useMemo(() => `15 ${MONTHS_FULL[monthNum === 12 ? 0 : monthNum]}`, [monthNum])

  const [noteContent, setNoteContent] = useState('')
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [newTag, setNewTag] = useState('')
  const [selectedTagColor, setSelectedTagColor] = useState(TAG_COLORS[0])

  const handleSaveNote = useCallback(() => { upsertNote.mutate({ month: monthNum, year: selectedYear, content: noteContent }) }, [noteContent, monthNum, selectedYear, upsertNote])
  const handleAddChecklistItem = useCallback(() => {
    if (!newChecklistItem.trim()) return
    createChecklistItem.mutate({ month: monthNum, year: selectedYear, item: newChecklistItem.trim(), sort_order: monthChecklist.length })
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
      createAttachment.mutate({ month: monthNum, year: selectedYear, ...uploaded, category: file.type.startsWith('image/') ? 'photo' : 'document' })
    }
    e.target.value = ''
  }, [user, monthNum, selectedYear, createAttachment])

  const periodLabel = `${MONTHS_FULL[selectedMonth]} ${selectedYear}`

  const groupedBreakdown = useMemo(() => {
    const grouped: Record<string, { name: string; count: number; total: number }> = {}
    monthData.breakdown.filter(b => b.applied).forEach(b => {
      if (!grouped[b.rule_name]) grouped[b.rule_name] = { name: b.rule_name, count: 0, total: 0 }
      grouped[b.rule_name].count++
      grouped[b.rule_name].total += b.amount
    })
    return Object.values(grouped).sort((a, b) => b.total - a.total)
  }, [monthData.breakdown])

  const selectedDayData = useMemo(() => selectedDay ? monthData.filteredDays.find(d => d.date === selectedDay) || null : null, [selectedDay, monthData.filteredDays])

  return (
    <div className="space-y-6 pb-20">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-primary" />
            Relatório Mensal
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{periodLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setShowMonthPicker(!showMonthPicker)} className="gap-1.5 h-9">
              <Calendar className="w-4 h-4" />
              {MONTHS_FULL[selectedMonth]}
              <ChevronDown className="w-3 h-3" />
            </Button>
            {showMonthPicker && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                className="absolute top-full mt-1 right-0 z-50 bg-card border border-border rounded-xl shadow-xl p-2 min-w-[180px]">
                {MONTHS_SHORT.map((_m, i) => (
                  <button key={i} onClick={() => { setSelectedMonth(i); setShowMonthPicker(false) }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${selectedMonth === i ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                    {MONTHS_FULL[i]}
                  </button>
                ))}
              </motion.div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setSelectedYear(y => y - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-semibold text-foreground min-w-[50px] text-center">{selectedYear}</span>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setSelectedYear(y => y + 1)} disabled={selectedYear >= currentYear}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5 h-9">
            <Download className="w-4 h-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* COMPETENCY CARD */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 overflow-hidden">
        <CardContent className="p-5 md:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">{periodLabel}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Competência</p>
            </div>
            <div className="flex flex-col sm:items-end gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Pagamento previsto:</span>
                <span className="text-sm font-bold text-primary">{paymentDate}</span>
              </div>
              <Badge variant={payment?.status === 'paid' ? 'default' : 'secondary'} className="w-fit text-xs">
                {competencyStatus}
              </Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3 bg-background/50 rounded-lg p-3 italic">
            {MONTHS_FULL[selectedMonth]} teve {monthData.workedDays} dias trabalhados, {monthData.saturdays} sábados
            {monthData.absences > 0 ? ` e ${monthData.absences} falta(s)` : ' e nenhum desconto'}
            {monthData.holidays > 0 ? `, ${monthData.holidays} feriado(s)` : ''}.
          </p>
        </CardContent>
      </Card>

      {/* FINANCIAL SUMMARY */}
      <Card className="border-green-500/20 bg-green-500/5">
        <CardContent className="p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-base font-bold text-foreground">Resumo Financeiro</h3>
            </div>
            <span className="text-xl font-bold text-green-600 dark:text-green-400">{formatEuro(monthData.totalEarned)}</span>
          </div>
          <div className="space-y-0">
            <div className="flex items-center justify-between py-2.5 border-b border-green-500/10">
              <span className="text-sm text-muted-foreground">Salário Base</span>
              <span className="text-sm font-semibold text-foreground">€820,00</span>
            </div>
            <div className="flex items-center justify-between py-2.5 border-b border-green-500/10">
              <span className="text-sm text-muted-foreground">Duodécimos</span>
              <span className="text-sm font-semibold text-foreground">€150,00</span>
            </div>
            <div className="flex items-center justify-between py-2.5 border-b border-green-500/10">
              <span className="text-sm text-muted-foreground">Subsídio Alimentação</span>
              <span className="text-sm font-semibold text-foreground">{formatEuro(monthData.mealAllowance)}</span>
            </div>
            {monthData.breakdown.filter(b => b.applied && !['base', 'duodecimos', 'meal_voucher'].includes(b.rule_id)).map((b, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-green-500/10 last:border-0">
                <span className="text-sm text-muted-foreground">{b.rule_name}</span>
                <span className={`text-sm font-semibold ${b.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {b.amount >= 0 ? '+' : ''}{formatEuro(b.amount)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* OPERATIONAL SUMMARY */}
      <Card>
        <CardContent className="p-5 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-base font-bold text-foreground">Resumo Operacional</h3>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-9 gap-2">
            {[
              { icon: Briefcase, label: 'Trabalhados', value: monthData.workedDays, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/5' },
              { icon: Calendar, label: 'Semanas', value: monthData.totalWeeks, color: 'text-foreground', bg: 'bg-muted/50' },
              { icon: Clock, label: 'Sábados', value: monthData.saturdays, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/5' },
              { icon: Calendar, label: 'Feriados', value: monthData.holidays, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-500/5' },
              { icon: AlertTriangle, label: 'Faltas', value: monthData.absences, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/5' },
              { icon: Calendar, label: 'Férias', value: monthData.vacations, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-500/5' },
              { icon: Bed, label: 'Fora', value: `${monthData.sleptAway}`, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/5' },
              { icon: MapPin, label: 'Frequente', value: monthData.mostFrequentCity, color: 'text-primary', bg: 'bg-primary/5' },
              { icon: Award, label: 'Sequência', value: `${monthData.maxStreak}d`, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/5' },
            ].map((stat, i) => (
              <div key={i} className={`${stat.bg} rounded-xl p-3 text-center`}>
                <stat.icon className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* TAGS */}
      {monthTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {monthTags.map((tag) => (
            <Badge key={tag.id} variant="secondary" className="gap-1 px-3 py-1" style={{ backgroundColor: `${tag.color}15`, color: tag.color, borderColor: `${tag.color}30` }}>
              <Tag className="w-3 h-3" />
              {tag.tag}
              <button onClick={() => deleteTag.mutate(tag.id)} className="ml-1 hover:opacity-70"><X className="w-3 h-3" /></button>
            </Badge>
          ))}
        </div>
      )}

      {/* WORKSPACE SELECTOR */}
      <div className="bg-muted/30 rounded-2xl p-1.5 flex gap-1 overflow-x-auto scrollbar-none">
        {WORKSPACE_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 flex-1 justify-center ${
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            }`}
          >
            <span className="text-base">{tab.emoji}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* WORKSPACE CONTENT */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {/* FINANCEIRO */}
          {activeTab === 'financeiro' && (
            <Card>
              <CardContent className="p-5 md:p-6">
                <div className="space-y-0">
                  {groupedBreakdown.map((b, i) => (
                    <div key={i} className="flex items-center gap-4 py-3.5 border-b border-border/40 last:border-0">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-muted-foreground">×{b.count}</span>
                      </div>
                      <span className="flex-1 text-sm font-medium text-foreground">{b.name}</span>
                      <span className={`text-sm font-bold ${b.total >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {b.total >= 0 ? '+' : ''}{formatEuro(b.total)}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between py-4 border-t-2 border-primary/20 mt-2">
                    <span className="text-base font-bold text-foreground">Total previsto</span>
                    <span className="text-xl font-bold text-primary">{formatEuro(monthData.totalEarned)}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-4 text-center py-2 bg-muted/30 rounded-lg">
                  O salário deste mês foi composto por {groupedBreakdown.length} componente{groupedBreakdown.length !== 1 ? 's' : ''} diferente{groupedBreakdown.length !== 1 ? 's' : ''}.
                </p>
              </CardContent>
            </Card>
          )}

          {/* TRABALHO */}
          {activeTab === 'trabalho' && (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-5 md:p-6">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Dias Trabalhados', value: monthData.workedDays, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/5' },
                      { label: 'Faltas', value: monthData.absences, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/5' },
                      { label: 'Férias', value: monthData.vacations, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-500/5' },
                      { label: 'Feriados', value: monthData.holidays, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-500/5' },
                      { label: 'Sábados', value: monthData.saturdays, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/5' },
                      { label: 'Maior Sequência', value: `${monthData.maxStreak} dias`, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/5' },
                      { label: 'Dormiu Fora', value: `${monthData.sleptAway} noites`, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/5' },
                      { label: 'Cidade Frequente', value: monthData.mostFrequentCity, color: 'text-primary', bg: 'bg-primary/5' },
                    ].map((stat, i) => (
                      <div key={i} className={`${stat.bg} rounded-xl p-3.5`}>
                        <span className="text-[10px] text-muted-foreground block mb-1">{stat.label}</span>
                        <span className={`text-base font-bold ${stat.color}`}>{stat.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 md:p-6">
                  <p className="text-sm font-bold text-foreground mb-4">Calendário</p>
                  <div className="grid grid-cols-7 gap-1.5 mb-2">
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                      <div key={i} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {Array.from({ length: getFirstDayOfMonth(selectedMonth, selectedYear) }).map((_, i) => <div key={`e-${i}`} />)}
                    {Array.from({ length: getDaysInMonth(selectedMonth, selectedYear) }).map((_, i) => {
                      const day = i + 1
                      const dateStr = `${selectedYear}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                      const d = monthData.filteredDays.find(x => x.date === dateStr)
                      let bg = 'bg-muted/20 hover:bg-muted/40'
                      let tx = 'text-muted-foreground'
                      if (d) {
                        if (d.is_absence) { bg = 'bg-red-500/15 hover:bg-red-500/25'; tx = 'text-red-600 dark:text-red-400' }
                        else if (d.is_vacation) { bg = 'bg-yellow-500/15 hover:bg-yellow-500/25'; tx = 'text-yellow-600 dark:text-yellow-400' }
                        else if (d.is_holiday) { bg = 'bg-blue-500/15 hover:bg-blue-500/25'; tx = 'text-blue-600 dark:text-blue-400' }
                        else if (d.worked && new Date(dateStr).getDay() === 6) { bg = 'bg-orange-500/15 hover:bg-orange-500/25'; tx = 'text-orange-600 dark:text-orange-400' }
                        else if (d.worked) { bg = 'bg-green-500/15 hover:bg-green-500/25'; tx = 'text-green-600 dark:text-green-400' }
                      }
                      return (
                        <button key={day} onClick={() => setSelectedDay(selectedDay === dateStr ? null : dateStr)}
                          className={`aspect-square rounded-xl flex items-center justify-center ${bg} ${tx} transition-all ${selectedDay === dateStr ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}>
                          <span className="text-xs font-semibold">{day}</span>
                        </button>
                      )
                    })}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-4 text-[10px]">
                    {[
                      { color: 'bg-green-500/30', label: 'Trabalhado' },
                      { color: 'bg-orange-500/30', label: 'Sábado' },
                      { color: 'bg-blue-500/30', label: 'Feriado' },
                      { color: 'bg-red-500/30', label: 'Falta' },
                      { color: 'bg-yellow-500/30', label: 'Férias' },
                    ].map(l => (
                      <div key={l.label} className="flex items-center gap-1.5">
                        <div className={`w-2.5 h-2.5 rounded ${l.color}`} />
                        <span className="text-muted-foreground">{l.label}</span>
                      </div>
                    ))}
                  </div>

                  {selectedDayData && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      className="mt-4 p-4 bg-primary/5 rounded-xl border border-primary/20">
                      <p className="text-xs font-bold text-primary mb-3">{formatDate(selectedDay!)}</p>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="flex justify-between"><span className="text-muted-foreground">Trabalhou</span><span className="font-semibold">{selectedDayData.worked ? 'Sim' : 'Não'}</span></div>
                        {selectedDayData.destination && <div className="flex justify-between"><span className="text-muted-foreground">Cidade</span><span className="font-semibold">{selectedDayData.destination}</span></div>}
                        {selectedDayData.is_absence && <div className="flex justify-between"><span className="text-muted-foreground">Tipo</span><span className="font-semibold text-red-500">Falta</span></div>}
                        {selectedDayData.is_vacation && <div className="flex justify-between"><span className="text-muted-foreground">Tipo</span><span className="font-semibold text-yellow-500">Férias</span></div>}
                        {selectedDayData.is_holiday && <div className="flex justify-between"><span className="text-muted-foreground">Tipo</span><span className="font-semibold text-blue-500">Feriado</span></div>}
                        {selectedDayData.slept_away && <div className="flex justify-between"><span className="text-muted-foreground">Dormiu fora</span><span className="font-semibold">Sim</span></div>}
                        {selectedDayData.earned ? <div className="flex justify-between"><span className="text-muted-foreground">Ganho</span><span className="font-semibold text-green-600">{formatEuro(selectedDayData.earned)}</span></div> : null}
                      </div>
                    </motion.div>
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
                  <Card key={city.name} className="overflow-hidden">
                    <div className="h-1.5" style={{ backgroundColor: city.name === 'Porto' ? '#10b981' : city.name === 'Lisboa' ? '#3b82f6' : '#8b5cf6' }} />
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <MapPin className="w-5 h-5" style={{ color: city.name === 'Porto' ? '#10b981' : city.name === 'Lisboa' ? '#3b82f6' : '#8b5cf6' }} />
                        <span className="text-base font-bold text-foreground">{city.name}</span>
                      </div>
                      <div className="space-y-3">
                        {[
                          { label: 'Semanas', value: city.weeks },
                          { label: 'Dias', value: city.days },
                          { label: 'Sábados', value: city.saturdays },
                          { label: 'Dormiu fora', value: city.sleptAway },
                        ].map(s => (
                          <div key={s.label} className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">{s.label}</span>
                            <span className="text-sm font-bold text-foreground">{s.value}</span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between pt-3 border-t border-border/40">
                          <span className="text-xs text-muted-foreground">Valor</span>
                          <span className="text-base font-bold text-primary">{formatEuro(city.earned)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardContent className="p-5">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-muted/30 rounded-xl">
                      <MapPin className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-[10px] text-muted-foreground mb-1">Mais Frequente</p>
                      <p className="text-sm font-bold text-primary">{monthData.mostFrequentCity}</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-xl">
                      <TrendingUp className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-[10px] text-muted-foreground mb-1">Mais Lucrativa</p>
                      <p className="text-sm font-bold text-primary">{monthData.mostProfitableCity}</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-xl">
                      <Bed className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-[10px] text-muted-foreground mb-1">Noites Fora</p>
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
                <CardContent className="p-5 md:p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">📝</span>
                    <p className="text-sm font-bold text-foreground">Diário do Mês</p>
                  </div>
                  <Textarea
                    placeholder={`Escreva sobre o mês de ${MONTHS_FULL[selectedMonth]}...`}
                    value={noteContent || monthNote?.content || ''}
                    onChange={(e) => setNoteContent(e.target.value)}
                    className="min-h-[180px] resize-y border-border/50"
                  />
                  <div className="flex justify-end mt-3">
                    <Button onClick={handleSaveNote} disabled={upsertNote.isPending} size="sm" className="gap-1.5">
                      <Save className="w-3.5 h-3.5" />
                      {upsertNote.isPending ? 'A guardar...' : 'Guardar'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 md:p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">☑️</span>
                    <p className="text-sm font-bold text-foreground">Checklist</p>
                    {monthChecklist.length > 0 && (
                      <Badge variant="secondary" className="ml-auto text-[10px]">{monthChecklist.filter(i => i.completed).length}/{monthChecklist.length}</Badge>
                    )}
                  </div>
                  <div className="space-y-1">
                    {monthChecklist.map((ci) => (
                      <div key={ci.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 group transition-colors">
                        <Checkbox checked={ci.completed} onCheckedChange={(checked) => updateChecklistItem.mutate({ id: ci.id, completed: !!checked })} />
                        <span className={`flex-1 text-sm ${ci.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{ci.item}</span>
                        <button onClick={() => deleteChecklistItem.mutate(ci.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Input placeholder="Novo item..." value={newChecklistItem} onChange={(e) => setNewChecklistItem(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()} className="flex-1 h-9" />
                    <Button onClick={handleAddChecklistItem} size="icon" variant="outline" className="h-9 w-9"><Plus className="w-4 h-4" /></Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 md:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg">⭐</span>
                    <p className="text-sm font-bold text-foreground">Avaliação</p>
                  </div>
                  <div className="flex items-center justify-center gap-2 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} onClick={() => upsertRating.mutate({ month: monthNum, year: selectedYear, rating: star, reflection: monthRating?.reflection || '' })}
                        className="transition-transform hover:scale-110 active:scale-95">
                        <Star className={`w-8 h-8 ${(monthRating?.rating || 0) >= star ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground hover:text-yellow-200'}`} />
                      </button>
                    ))}
                  </div>
                  <Textarea placeholder="O que faria diferente no próximo mês?" value={monthRating?.reflection || ''}
                    onChange={(e) => upsertRating.mutate({ month: monthNum, year: selectedYear, rating: monthRating?.rating || null, reflection: e.target.value })}
                    className="min-h-[100px] border-border/50" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 md:p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🏷️</span>
                    <p className="text-sm font-bold text-foreground">Tags</p>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {monthTags.map((tag) => (
                      <Badge key={tag.id} variant="secondary" className="gap-1 px-3 py-1" style={{ backgroundColor: `${tag.color}15`, color: tag.color }}>
                        <Tag className="w-3 h-3" />{tag.tag}
                        <button onClick={() => deleteTag.mutate(tag.id)} className="ml-1 hover:opacity-70"><X className="w-3 h-3" /></button>
                      </Badge>
                    ))}
                    {monthTags.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma tag</p>}
                  </div>
                  <div className="flex gap-2">
                    <Input placeholder="Nova tag..." value={newTag} onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTag()} className="flex-1 h-9" />
                    <div className="flex gap-1 items-center">
                      {TAG_COLORS.slice(0, 5).map((c) => (
                        <button key={c} onClick={() => setSelectedTagColor(c)}
                          className={`w-5 h-5 rounded-full border-2 transition-all ${selectedTagColor === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <Button onClick={handleAddTag} size="icon" variant="outline" className="h-9 w-9"><Plus className="w-4 h-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* DOCUMENTOS */}
          {activeTab === 'documentos' && (
            <Card>
              <CardContent className="p-5 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📎</span>
                    <p className="text-sm font-bold text-foreground">Documentos</p>
                    {monthAttachments.length > 0 && <Badge variant="secondary" className="text-[10px]">{monthAttachments.length}</Badge>}
                  </div>
                  <label>
                    <Button variant="outline" size="sm" className="gap-1.5 cursor-pointer h-8">
                      <Plus className="w-3.5 h-3.5" />Adicionar
                    </Button>
                    <input type="file" multiple accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>
                {monthAttachments.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-xl">
                    <Camera className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Nenhum documento</p>
                    <p className="text-xs mt-1">Adicione fotos, recibos ou PDFs</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {monthAttachments.map((att) => (
                      <div key={att.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors group">
                        <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {att.file_type.startsWith('image/') ? (
                            <img src={att.file_url} alt={att.file_name} className="w-full h-full object-cover" />
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
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a href={att.file_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="h-8 w-8"><FileText className="w-3.5 h-3.5" /></Button>
                          </a>
                          <a href={att.file_url} download={att.file_name}>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><Download className="w-3.5 h-3.5" /></Button>
                          </a>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteAttachment.mutate(att.id)}>
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
      </AnimatePresence>
    </div>
  )
}
