import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthContext } from '@/hooks/use-auth-context'
import {
  vehiclesService,
  employeesService,
  teamsService,
  operationsService,
  operationHistoryService,
  employeeDailyRecordsService,
  adminStatsService,
} from '@/services/admin-api'

// =====================================================
// VEHICLES HOOKS
// =====================================================
export function useVehicles() {
  const { user } = useAuthContext()
  return useQuery({
    queryKey: ['admin-vehicles', user?.id],
    queryFn: () => vehiclesService.getAll(user!.id),
    enabled: !!user,
  })
}

export function useCreateVehicle() {
  const queryClient = useQueryClient()
  const { user } = useAuthContext()

  return useMutation({
    mutationFn: (vehicle: { name: string; license_plate?: string }) =>
      vehiclesService.create({ ...vehicle, admin_id: user!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vehicles'] })
    },
  })
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...vehicle }: { id: string } & Record<string, unknown>) =>
      vehiclesService.update(id, vehicle),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vehicles'] })
    },
  })
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => vehiclesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vehicles'] })
    },
  })
}

// =====================================================
// EMPLOYEES HOOKS
// =====================================================
export function useEmployees() {
  const { user } = useAuthContext()
  return useQuery({
    queryKey: ['admin-employees', user?.id],
    queryFn: () => employeesService.getAll(user!.id),
    enabled: !!user,
  })
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: ['admin-employee', id],
    queryFn: () => employeesService.getById(id),
    enabled: !!id,
  })
}

export function useCreateEmployee() {
  const queryClient = useQueryClient()
  const { user } = useAuthContext()

  return useMutation({
    mutationFn: (employee: { full_name: string; phone?: string; role?: string; city?: string }) =>
      employeesService.create({ ...employee, admin_id: user!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-employees'] })
    },
  })
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...employee }: { id: string } & Record<string, unknown>) =>
      employeesService.update(id, employee),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-employees'] })
    },
  })
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => employeesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-employees'] })
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] })
    },
  })
}

export function useSearchEmployees(query: string) {
  const { user } = useAuthContext()
  return useQuery({
    queryKey: ['admin-employees-search', user?.id, query],
    queryFn: () => employeesService.searchByName(user!.id, query),
    enabled: !!user && query.length >= 2,
  })
}

// =====================================================
// TEAMS HOOKS
// =====================================================
export function useTeams() {
  const { user } = useAuthContext()
  return useQuery({
    queryKey: ['admin-teams', user?.id],
    queryFn: () => teamsService.getAll(user!.id),
    enabled: !!user,
  })
}

export function useTeam(id: string) {
  return useQuery({
    queryKey: ['admin-team', id],
    queryFn: () => teamsService.getById(id),
    enabled: !!id,
  })
}

export function useCreateTeam() {
  const queryClient = useQueryClient()
  const { user } = useAuthContext()

  return useMutation({
    mutationFn: (team: { name: string; color?: string; notes?: string }) =>
      teamsService.create({ ...team, admin_id: user!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] })
    },
  })
}

export function useUpdateTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...team }: { id: string } & Record<string, unknown>) =>
      teamsService.update(id, team),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] })
    },
  })
}

export function useDeleteTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => teamsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] })
      queryClient.invalidateQueries({ queryKey: ['admin-operations'] })
    },
  })
}

export function useAddTeamMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ teamId, employeeId }: { teamId: string; employeeId: string }) =>
      teamsService.addMember(teamId, employeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] })
      queryClient.invalidateQueries({ queryKey: ['admin-employees'] })
    },
  })
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ teamId, employeeId }: { teamId: string; employeeId: string }) =>
      teamsService.removeMember(teamId, employeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] })
      queryClient.invalidateQueries({ queryKey: ['admin-employees'] })
    },
  })
}

export function useSetTeamMembers() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ teamId, employeeIds }: { teamId: string; employeeIds: string[] }) =>
      teamsService.setMembers(teamId, employeeIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] })
      queryClient.invalidateQueries({ queryKey: ['admin-employees'] })
    },
  })
}

// =====================================================
// OPERATIONS HOOKS
// =====================================================
export function useOperationsByWeek(year: number, weekNumber: number) {
  const { user } = useAuthContext()
  return useQuery({
    queryKey: ['admin-operations', user?.id, year, weekNumber],
    queryFn: () => operationsService.getByWeek(user!.id, year, weekNumber),
    enabled: !!user,
  })
}

export function useAllOperations() {
  const { user } = useAuthContext()
  return useQuery({
    queryKey: ['admin-operations', user?.id],
    queryFn: () => operationsService.getAll(user!.id),
    enabled: !!user,
  })
}

export function useCreateOperation() {
  const queryClient = useQueryClient()
  const { user } = useAuthContext()

  return useMutation({
    mutationFn: (operation: {
      team_id: string
      week_number: number
      year: number
      destination: 'Porto' | 'Lisboa' | 'Algarve'
      company_name?: string
      company_location?: string
      leader_id?: string
      vehicle_id?: string
      notes?: string
    }) =>
      operationsService.create({ ...operation, admin_id: user!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-operations'] })
    },
  })
}

export function useUpdateOperation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...operation }: { id: string } & Record<string, unknown>) =>
      operationsService.update(id, operation),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-operations'] })
    },
  })
}

export function useDeleteOperation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => operationsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-operations'] })
    },
  })
}

export function usePublishOperation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => operationsService.publish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-operations'] })
    },
  })
}

export function useUnpublishOperation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => operationsService.unpublish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-operations'] })
    },
  })
}

// =====================================================
// OPERATION HISTORY HOOKS
// =====================================================
export function useOperationHistory(operationId: string) {
  return useQuery({
    queryKey: ['admin-operation-history', operationId],
    queryFn: () => operationHistoryService.getByOperation(operationId),
    enabled: !!operationId,
  })
}

export function useAllOperationHistory(limit?: number) {
  const { user } = useAuthContext()
  return useQuery({
    queryKey: ['admin-operation-history', user?.id, limit],
    queryFn: () => operationHistoryService.getAll(user!.id, limit),
    enabled: !!user,
  })
}

export function useLogOperationChange() {
  return useMutation({
    mutationFn: ({
      operationId,
      adminId,
      fieldName,
      oldValue,
      newValue,
    }: {
      operationId: string
      adminId: string
      fieldName: string
      oldValue: string | null
      newValue: string | null
    }) => operationHistoryService.logChange(operationId, adminId, fieldName, oldValue, newValue),
  })
}

// =====================================================
// EMPLOYEE DAILY RECORDS HOOKS
// =====================================================
export function useEmployeeDailyRecord(employeeId: string, date: string) {
  return useQuery({
    queryKey: ['employee-daily-record', employeeId, date],
    queryFn: () => employeeDailyRecordsService.getByDate(employeeId, date),
    enabled: !!employeeId && !!date,
  })
}

export function useEmployeeDailyRecords(employeeId: string) {
  return useQuery({
    queryKey: ['employee-daily-records', employeeId],
    queryFn: () => employeeDailyRecordsService.getByEmployee(employeeId),
    enabled: !!employeeId,
  })
}

export function useUpsertDailyRecord() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (record: {
      employee_id: string
      date: string
      operation_id?: string
      confirmed_presence?: boolean
      work_started?: boolean
      work_ended?: boolean
      slept_away?: boolean
      notes?: string
    }) => employeeDailyRecordsService.upsert(record),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-daily-record'] })
      queryClient.invalidateQueries({ queryKey: ['employee-daily-records'] })
    },
  })
}

export function useUpdateDailyRecord() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...record }: { id: string } & Record<string, unknown>) =>
      employeeDailyRecordsService.update(id, record),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-daily-record'] })
      queryClient.invalidateQueries({ queryKey: ['employee-daily-records'] })
    },
  })
}

// =====================================================
// ADMIN DASHBOARD HOOKS
// =====================================================
export function useAdminDashboardStats() {
  const { user } = useAuthContext()
  return useQuery({
    queryKey: ['admin-dashboard-stats', user?.id],
    queryFn: () => adminStatsService.getDashboardStats(user!.id),
    enabled: !!user,
  })
}
