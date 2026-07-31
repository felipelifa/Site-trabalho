import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  Search,
  MapPin,
  Clock,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAllProfiles } from '@/hooks/use-admin-queries'
import { useAuthContext } from '@/hooks/use-auth-context'

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export function EmployeesPage() {
  const { user } = useAuthContext()
  const { data: allProfiles = [], isLoading } = useAllProfiles()

  const employees = allProfiles.filter(p => p.user_id !== user?.id)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = (emp.full_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

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
      </motion.div>

      <motion.div variants={item} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
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
          {filteredEmployees.map((employee) => (
            <Card key={employee.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    {employee.avatar_url ? (
                      <img src={employee.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-primary">
                        {employee.full_name?.charAt(0).toUpperCase() || '?'}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{employee.full_name || 'Sem nome'}</p>
                    <p className="text-xs text-muted-foreground truncate">{employee.email}</p>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" />
                    <span>{employee.role || 'Funcionário'}</span>
                  </div>
                  {employee.company_name && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{employee.company_name}</span>
                    </div>
                  )}
                  {employee.created_at && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Registado: {new Date(employee.created_at).toLocaleDateString('pt-PT')}</span>
                    </div>
                  )}
                </div>

                <div className="mt-3">
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
                    <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5" />
                    {employee.role || 'Funcionário'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}
