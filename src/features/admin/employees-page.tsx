import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  Plus,
  Search,
  MapPin,
  Phone,
  Clock,
  Edit,
  Trash2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  useEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
} from '@/hooks/use-admin-queries'

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

type EmployeeStatus = 'active' | 'vacation' | 'away' | 'inactive'

const STATUS_CONFIG: Record<EmployeeStatus, { label: string; color: string; dot: string }> = {
  active: { label: 'Trabalhando', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', dot: 'bg-green-500' },
  vacation: { label: 'Férias', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', dot: 'bg-blue-500' },
  away: { label: 'Afastado', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', dot: 'bg-red-500' },
  inactive: { label: 'Inativo', color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400', dot: 'bg-gray-500' },
}

const FILTER_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Ativos' },
  { value: 'vacation', label: 'Férias' },
  { value: 'away', label: 'Afastados' },
  { value: 'inactive', label: 'Sem equipe' },
]

interface EmployeeFormData {
  full_name: string
  phone: string
  role: string
  city: string
}

const DEFAULT_FORM: EmployeeFormData = {
  full_name: '',
  phone: '',
  role: 'Funcionário',
  city: '',
}

export function EmployeesPage() {
  const { data: employees = [], isLoading } = useEmployees()
  const createEmployee = useCreateEmployee()
  const updateEmployee = useUpdateEmployee()
  const deleteEmployee = useDeleteEmployee()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null)
  const [formData, setFormData] = useState<EmployeeFormData>(DEFAULT_FORM)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = activeFilter === 'all' || emp.status === activeFilter
    return matchesSearch && matchesFilter
  })

  const handleOpenForm = (employee?: typeof employees[0]) => {
    if (employee) {
      setEditingEmployee(employee.id)
      setFormData({
        full_name: employee.full_name,
        phone: employee.phone || '',
        role: employee.role || 'Funcionário',
        city: employee.city || '',
      })
    } else {
      setEditingEmployee(null)
      setFormData(DEFAULT_FORM)
    }
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!formData.full_name.trim()) return

    if (editingEmployee) {
      await updateEmployee.mutateAsync({ id: editingEmployee, ...formData })
    } else {
      await createEmployee.mutateAsync(formData)
    }
    setShowForm(false)
    setFormData(DEFAULT_FORM)
    setEditingEmployee(null)
  }

  const handleDelete = async () => {
    if (!deleteConfirmId) return
    await deleteEmployee.mutateAsync(deleteConfirmId)
    setDeleteConfirmId(null)
  }

  const getTeamName = (emp: typeof employees[0]) => {
    const teams = emp.teams as Array<{ team: { id: string; name: string; color: string } }> | null
    if (!teams || teams.length === 0) return 'Sem equipe'
    return teams[0].team?.name || 'Sem equipe'
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.06 } } }}
      className="space-y-4"
    >
      <motion.div variants={item} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6" />
            Funcionários
          </h1>
          <p className="text-sm text-muted-foreground">
            {employees.length} funcionário(s) registado(s)
          </p>
        </div>
        <Button onClick={() => handleOpenForm()}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Funcionário
        </Button>
      </motion.div>

      <motion.div variants={item} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {FILTER_OPTIONS.map((filter) => (
            <Button
              key={filter.value}
              variant={activeFilter === filter.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredEmployees.length === 0 ? (
        <motion.div variants={item}>
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {searchQuery ? 'Nenhum funcionário encontrado para esta pesquisa.' : 'Nenhum funcionário registado.'}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredEmployees.map((employee) => {
            const statusConfig = STATUS_CONFIG[employee.status as EmployeeStatus] || STATUS_CONFIG.active
            return (
              <Card key={employee.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        {employee.photo_url ? (
                          <img src={employee.photo_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                        ) : (
                          <span className="text-lg font-bold text-primary">
                            {employee.full_name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{employee.full_name}</p>
                        <p className="text-xs text-muted-foreground">{employee.role}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => handleOpenForm(employee)}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => setDeleteConfirmId(employee.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5" />
                      <span>{getTeamName(employee)}</span>
                    </div>
                    {employee.city && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{employee.city}</span>
                      </div>
                    )}
                    {employee.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{employee.phone}</span>
                      </div>
                    )}
                    {employee.last_access && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Último acesso: {new Date(employee.last_access).toLocaleDateString('pt-PT')}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3">
                    <Badge className={`${statusConfig.color} border-0`}>
                      <span className={`w-2 h-2 rounded-full ${statusConfig.dot} mr-1.5`} />
                      {statusConfig.label}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </motion.div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEmployee ? 'Editar Funcionário' : 'Novo Funcionário'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Nome *</label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Telefone</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="912 345 678"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Cargo</label>
              <Input
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                placeholder="Funcionário"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Cidade</label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Porto, Lisboa, Algarve..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!formData.full_name.trim()}>
              {editingEmployee ? 'Guardar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminação</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja eliminar este funcionário? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
