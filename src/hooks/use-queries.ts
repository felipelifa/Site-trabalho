import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthContext } from '@/hooks/use-auth-context'
import {
  profileService,
  settingsService,
  salaryRulesService,
  workWeeksService,
  workDaysService,
  paymentsService,
  notesService,
  checklistsService,
  remindersService,
  competenciesService,
} from '@/services/api'
import { calculateWeekEarnings } from '@/utils/rules-engine'

export function useProfile() {
  const { user } = useAuthContext()
  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => profileService.get(user!.id),
    enabled: !!user,
  })
}

export function useSettings() {
  const { user } = useAuthContext()
  return useQuery({
    queryKey: ['settings', user?.id],
    queryFn: () => settingsService.get(user!.id),
    enabled: !!user,
  })
}

export function useSalaryRules() {
  const { user } = useAuthContext()
  return useQuery({
    queryKey: ['salary-rules', user?.id],
    queryFn: () => salaryRulesService.getAll(user!.id),
    enabled: !!user,
  })
}

export function useWorkWeeks() {
  const { user } = useAuthContext()
  return useQuery({
    queryKey: ['work-weeks', user?.id],
    queryFn: () => workWeeksService.getAll(user!.id),
    enabled: !!user,
  })
}

export function useCurrentWeek() {
  const { user } = useAuthContext()
  const now = new Date()
  const weekNumber = Math.ceil(((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000 + new Date(now.getFullYear(), 0, 1).getDay() + 1) / 7)
  const year = now.getFullYear()

  return useQuery({
    queryKey: ['current-week', user?.id, year, weekNumber],
    queryFn: () => workWeeksService.getByWeek(user!.id, year, weekNumber),
    enabled: !!user,
  })
}

export function useWorkWeek(year: number, weekNumber: number) {
  const { user } = useAuthContext()
  return useQuery({
    queryKey: ['work-week', user?.id, year, weekNumber],
    queryFn: () => workWeeksService.getByWeek(user!.id, year, weekNumber),
    enabled: !!user,
  })
}

export function useWorkDaysByWeek(year: number, weekNumber: number) {
  const { data: week } = useWorkWeek(year, weekNumber)
  const { user } = useAuthContext()
  return useQuery({
    queryKey: ['work-days', user?.id, week?.id],
    queryFn: () => workDaysService.getByWeek(user!.id, week!.id),
    enabled: !!user && !!week?.id,
  })
}

export function useWorkDays(weekId: string) {
  const { user } = useAuthContext()
  return useQuery({
    queryKey: ['work-days', user?.id, weekId],
    queryFn: () => workDaysService.getByWeek(user!.id, weekId),
    enabled: !!user && !!weekId,
  })
}

export function useWorkDaysByMonth(year: number, month: number) {
  const { user } = useAuthContext()
  return useQuery({
    queryKey: ['work-days-month', user?.id, year, month],
    queryFn: () => workDaysService.getByMonth(user!.id, year, month),
    enabled: !!user,
  })
}

export function usePayments() {
  const { user } = useAuthContext()
  return useQuery({
    queryKey: ['payments', user?.id],
    queryFn: () => paymentsService.getAll(user!.id),
    enabled: !!user,
  })
}

export function useNotes(date: string) {
  const { user } = useAuthContext()
  return useQuery({
    queryKey: ['notes', user?.id, date],
    queryFn: () => notesService.getByDate(user!.id, date),
    enabled: !!user,
  })
}

export function useChecklist(date: string) {
  const { user } = useAuthContext()
  return useQuery({
    queryKey: ['checklist', user?.id, date],
    queryFn: () => checklistsService.getByDate(user!.id, date),
    enabled: !!user,
  })
}

export function useReminders() {
  const { user } = useAuthContext()
  return useQuery({
    queryKey: ['reminders', user?.id],
    queryFn: () => remindersService.getAll(user!.id),
    enabled: !!user,
  })
}

export function useWeekEarnings(weekId: string) {
  const { data: workDays } = useWorkDays(weekId)
  const { data: rules } = useSalaryRules()

  if (!workDays || !rules) return { total: 0, breakdown: [] }

  return calculateWeekEarnings(workDays, rules)
}

// Mutations
export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const { user } = useAuthContext()

  return useMutation({
    mutationFn: (profile: Record<string, unknown>) =>
      profileService.upprofile(user!.id, profile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] })
    },
  })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()
  const { user } = useAuthContext()

  return useMutation({
    mutationFn: (settings: Record<string, unknown>) =>
      settingsService.upsert(user!.id, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', user?.id] })
    },
  })
}

export function useCreateWorkWeek() {
  const queryClient = useQueryClient()
  const { user } = useAuthContext()

  return useMutation({
    mutationFn: (week: Record<string, unknown>) =>
      workWeeksService.create({ ...week, user_id: user!.id } as never),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-weeks', user?.id] })
    },
  })
}

export function useUpdateWorkWeek() {
  const queryClient = useQueryClient()
  const { user } = useAuthContext()

  return useMutation({
    mutationFn: ({ id, ...week }: { id: string } & Record<string, unknown>) =>
      workWeeksService.update(id, week),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-weeks', user?.id] })
    },
  })
}

export function useUpsertWorkDay() {
  const queryClient = useQueryClient()
  const { user } = useAuthContext()

  return useMutation({
    mutationFn: (day: Record<string, unknown>) =>
      workDaysService.upsert({ ...day, user_id: user!.id } as never),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-days'] })
      queryClient.invalidateQueries({ queryKey: ['work-weeks'] })
      queryClient.invalidateQueries({ queryKey: ['work-week'] })
    },
  })
}

export function useUpdateWorkDay() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...day }: { id: string } & Record<string, unknown>) =>
      workDaysService.update(id, day),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-days'] })
    },
  })
}

export function useUpsertPayment() {
  const queryClient = useQueryClient()
  const { user } = useAuthContext()

  return useMutation({
    mutationFn: (payment: Record<string, unknown>) =>
      paymentsService.upsert({ ...payment, user_id: user!.id } as never),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', user?.id] })
    },
  })
}

export function useCreateNote() {
  const queryClient = useQueryClient()
  const { user } = useAuthContext()

  return useMutation({
    mutationFn: (note: Record<string, unknown>) =>
      notesService.create({ ...note, user_id: user!.id } as never),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })
}

export function useUpdateNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...note }: { id: string } & Record<string, unknown>) =>
      notesService.update(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })
}

export function useDeleteNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => notesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })
}

export function useCreateChecklistItem() {
  const queryClient = useQueryClient()
  const { user } = useAuthContext()

  return useMutation({
    mutationFn: (item: Record<string, unknown>) =>
      checklistsService.create({ ...item, user_id: user!.id } as never),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist'] })
    },
  })
}

export function useUpdateChecklistItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...item }: { id: string } & Record<string, unknown>) =>
      checklistsService.update(id, item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist'] })
    },
  })
}

export function useDeleteChecklistItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => checklistsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist'] })
    },
  })
}

export function useCreateReminder() {
  const queryClient = useQueryClient()
  const { user } = useAuthContext()

  return useMutation({
    mutationFn: (reminder: Record<string, unknown>) =>
      remindersService.create({ ...reminder, user_id: user!.id } as never),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders', user?.id] })
    },
  })
}

export function useUpdateReminder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...reminder }: { id: string } & Record<string, unknown>) =>
      remindersService.update(id, reminder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
    },
  })
}

export function useDeleteReminder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => remindersService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
    },
  })
}

// Competencies hooks
export function useCompetencies() {
  const { user } = useAuthContext()
  return useQuery({
    queryKey: ['competencies', user?.id],
    queryFn: () => competenciesService.getAll(user!.id),
    enabled: !!user,
  })
}

export function useActiveCompetency() {
  const { user } = useAuthContext()
  return useQuery({
    queryKey: ['competency', 'active', user?.id],
    queryFn: () => competenciesService.getActive(user!.id),
    enabled: !!user,
  })
}

export function useEnsureCompetency() {
  const queryClient = useQueryClient()
  const { user } = useAuthContext()

  return useMutation({
    mutationFn: () => competenciesService.ensureCurrentCompetency(user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competencies'] })
      queryClient.invalidateQueries({ queryKey: ['competency'] })
    },
  })
}

export function useUpdateCompetency() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...updates }: { id: string } & Record<string, unknown>) =>
      competenciesService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competencies'] })
      queryClient.invalidateQueries({ queryKey: ['competency'] })
    },
  })
}
