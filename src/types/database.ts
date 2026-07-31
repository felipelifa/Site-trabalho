export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string | null
          email: string | null
          avatar_url: string | null
          company_name: string | null
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name?: string | null
          email?: string | null
          avatar_url?: string | null
          company_name?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string | null
          email?: string | null
          avatar_url?: string | null
          company_name?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          id: string
          user_id: string
          name: string
          nif: string | null
          address: string | null
          phone: string | null
          email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          nif?: string | null
          address?: string | null
          phone?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          nif?: string | null
          address?: string | null
          phone?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      salary_rules: {
        Row: {
          id: string
          user_id: string
          name: string
          type: 'base' | 'bonus' | 'deduction' | 'overtime'
          amount: number
          condition_type: string | null
          condition_value: string | null
          city: string | null
          day_of_week: number | null
          is_holiday: boolean
          is_vacation: boolean
          is_absence: boolean
          active: boolean
          priority: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: 'base' | 'bonus' | 'deduction' | 'overtime'
          amount: number
          condition_type?: string | null
          condition_value?: string | null
          city?: string | null
          day_of_week?: number | null
          is_holiday?: boolean
          is_vacation?: boolean
          is_absence?: boolean
          active?: boolean
          priority?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: 'base' | 'bonus' | 'deduction' | 'overtime'
          amount?: number
          condition_type?: string | null
          condition_value?: string | null
          city?: string | null
          day_of_week?: number | null
          is_holiday?: boolean
          is_vacation?: boolean
          is_absence?: boolean
          active?: boolean
          priority?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      work_weeks: {
        Row: {
          id: string
          user_id: string
          week_number: number
          year: number
          start_date: string
          end_date: string
          destination: string | null
          status: 'active' | 'completed' | 'archived'
          total_earned: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          week_number: number
          year: number
          start_date: string
          end_date: string
          destination?: string | null
          status?: 'active' | 'completed' | 'archived'
          total_earned?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          week_number?: number
          year?: number
          start_date?: string
          end_date?: string
          destination?: string | null
          status?: 'active' | 'completed' | 'archived'
          total_earned?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      work_days: {
        Row: {
          id: string
          user_id: string
          week_id: string
          date: string
          day_of_week: number
          worked: boolean
          destination: string | null
          slept_away: boolean
          is_holiday: boolean
          is_vacation: boolean
          is_absence: boolean
          absence_type: string | null
          earned: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          week_id: string
          date: string
          day_of_week: number
          worked?: boolean
          destination?: string | null
          slept_away?: boolean
          is_holiday?: boolean
          is_vacation?: boolean
          is_absence?: boolean
          absence_type?: string | null
          earned?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          week_id?: string
          date?: string
          day_of_week?: number
          worked?: boolean
          destination?: string | null
          slept_away?: boolean
          is_holiday?: boolean
          is_vacation?: boolean
          is_absence?: boolean
          absence_type?: string | null
          earned?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_days_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "work_weeks"
            referencedColumns: ["id"]
          }
        ]
      }
      payments: {
        Row: {
          id: string
          user_id: string
          month: number
          year: number
          expected_amount: number
          received_amount: number | null
          payment_date: string | null
          status: 'pending' | 'paid' | 'partial'
          notes: string | null
          receipt_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          month: number
          year: number
          expected_amount: number
          received_amount?: number | null
          payment_date?: string | null
          status?: 'pending' | 'paid' | 'partial'
          notes?: string | null
          receipt_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          month?: number
          year?: number
          expected_amount?: number
          received_amount?: number | null
          payment_date?: string | null
          status?: 'pending' | 'paid' | 'partial'
          notes?: string | null
          receipt_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      receipts: {
        Row: {
          id: string
          user_id: string
          payment_id: string | null
          file_name: string
          file_url: string
          file_type: string
          file_size: number
          ocr_data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          payment_id?: string | null
          file_name: string
          file_url: string
          file_type: string
          file_size: number
          ocr_data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          payment_id?: string | null
          file_name?: string
          file_url?: string
          file_type?: string
          file_size?: number
          ocr_data?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          }
        ]
      }
      notes: {
        Row: {
          id: string
          user_id: string
          date: string
          content: string
          category: string | null
          priority: 'low' | 'medium' | 'high'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          content: string
          category?: string | null
          priority?: 'low' | 'medium' | 'high'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          content?: string
          category?: string | null
          priority?: 'low' | 'medium' | 'high'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      checklists: {
        Row: {
          id: string
          user_id: string
          date: string
          item: string
          completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          item: string
          completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          item?: string
          completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: string
          user_id: string
          base_salary: number
          meal_allowance: number
          thirteenth_month: boolean
          fourteenth_month: boolean
          default_city: string
          payment_day: number
          payment_month: number
          theme: 'light' | 'dark' | 'system'
          language: string
          currency: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          base_salary?: number
          meal_allowance?: number
          thirteenth_month?: boolean
          fourteenth_month?: boolean
          default_city?: string
          payment_day?: number
          payment_month?: number
          theme?: 'light' | 'dark' | 'system'
          language?: string
          currency?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          base_salary?: number
          meal_allowance?: number
          thirteenth_month?: boolean
          fourteenth_month?: boolean
          default_city?: string
          payment_day?: number
          payment_month?: number
          theme?: 'light' | 'dark' | 'system'
          language?: string
          currency?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      municipal_holidays: {
        Row: {
          id: string
          user_id: string
          name: string
          date: string
          municipality: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          date: string
          municipality: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          date?: string
          municipality?: string
          created_at?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          due_date: string
          completed: boolean
          priority: 'low' | 'medium' | 'high'
          category: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          due_date: string
          completed?: boolean
          priority?: 'low' | 'medium' | 'high'
          category?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          due_date?: string
          completed?: boolean
          priority?: 'low' | 'medium' | 'high'
          category?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      competencies: {
        Row: {
          id: string
          user_id: string
          month: number
          year: number
          expected_amount: number
          received_amount: number | null
          payment_date: string | null
          status: 'active' | 'completed' | 'archived'
          days_worked: number
          total_hours: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          month: number
          year: number
          expected_amount?: number
          received_amount?: number | null
          payment_date?: string | null
          status?: 'active' | 'completed' | 'archived'
          days_worked?: number
          total_hours?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          month?: number
          year?: number
          expected_amount?: number
          received_amount?: number | null
          payment_date?: string | null
          status?: 'active' | 'completed' | 'archived'
          days_worked?: number
          total_hours?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      month_notes: {
        Row: {
          id: string
          user_id: string
          month: number
          year: number
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          month: number
          year: number
          content?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          month?: number
          year?: number
          content?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      month_checklists: {
        Row: {
          id: string
          user_id: string
          month: number
          year: number
          item: string
          completed: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          month: number
          year: number
          item: string
          completed?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          month?: number
          year?: number
          item?: string
          completed?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      month_tags: {
        Row: {
          id: string
          user_id: string
          month: number
          year: number
          tag: string
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          month: number
          year: number
          tag: string
          color?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          month?: number
          year?: number
          tag?: string
          color?: string
          created_at?: string
        }
        Relationships: []
      }
      month_attachments: {
        Row: {
          id: string
          user_id: string
          month: number
          year: number
          file_name: string
          file_url: string
          file_type: string
          file_size: number
          category: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          month: number
          year: number
          file_name: string
          file_url: string
          file_type: string
          file_size?: number
          category?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          month?: number
          year?: number
          file_name?: string
          file_url?: string
          file_type?: string
          file_size?: number
          category?: string
          created_at?: string
        }
        Relationships: []
      }
      month_ratings: {
        Row: {
          id: string
          user_id: string
          month: number
          year: number
          rating: number | null
          reflection: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          month: number
          year: number
          rating?: number | null
          reflection?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          month?: number
          year?: number
          rating?: number | null
          reflection?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          id: string
          admin_id: string
          name: string
          license_plate: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          name: string
          license_plate?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          admin_id?: string
          name?: string
          license_plate?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          id: string
          admin_id: string
          user_id: string | null
          full_name: string
          phone: string | null
          role: string
          city: string | null
          status: 'active' | 'vacation' | 'away' | 'inactive'
          photo_url: string | null
          last_access: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          user_id?: string | null
          full_name: string
          phone?: string | null
          role?: string
          city?: string | null
          status?: 'active' | 'vacation' | 'away' | 'inactive'
          photo_url?: string | null
          last_access?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          admin_id?: string
          user_id?: string | null
          full_name?: string
          phone?: string | null
          role?: string
          city?: string | null
          status?: 'active' | 'vacation' | 'away' | 'inactive'
          photo_url?: string | null
          last_access?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          id: string
          admin_id: string
          name: string
          color: string
          leader_id: string | null
          vehicle_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          name: string
          color?: string
          leader_id?: string | null
          vehicle_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          admin_id?: string
          name?: string
          color?: string
          leader_id?: string | null
          vehicle_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          }
        ]
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          employee_id: string
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          employee_id: string
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          employee_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          }
        ]
      }
      operations: {
        Row: {
          id: string
          admin_id: string
          team_id: string
          week_number: number
          year: number
          destination: 'Porto' | 'Lisboa' | 'Algarve'
          company_name: string | null
          company_location: string | null
          leader_id: string | null
          vehicle_id: string | null
          notes: string | null
          status: 'draft' | 'published'
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          team_id: string
          week_number: number
          year: number
          destination: 'Porto' | 'Lisboa' | 'Algarve'
          company_name?: string | null
          company_location?: string | null
          leader_id?: string | null
          vehicle_id?: string | null
          notes?: string | null
          status?: 'draft' | 'published'
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          admin_id?: string
          team_id?: string
          week_number?: number
          year?: number
          destination?: 'Porto' | 'Lisboa' | 'Algarve'
          company_name?: string | null
          company_location?: string | null
          leader_id?: string | null
          vehicle_id?: string | null
          notes?: string | null
          status?: 'draft' | 'published'
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          }
        ]
      }
      operation_history: {
        Row: {
          id: string
          operation_id: string
          admin_id: string
          field_name: string
          old_value: string | null
          new_value: string | null
          created_at: string
        }
        Insert: {
          id?: string
          operation_id: string
          admin_id: string
          field_name: string
          old_value?: string | null
          new_value?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          operation_id?: string
          admin_id?: string
          field_name?: string
          old_value?: string | null
          new_value?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operation_history_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          }
        ]
      }
      employee_daily_records: {
        Row: {
          id: string
          employee_id: string
          operation_id: string | null
          date: string
          confirmed_presence: boolean
          work_started: boolean
          work_ended: boolean
          slept_away: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          operation_id?: string | null
          date: string
          confirmed_presence?: boolean
          work_started?: boolean
          work_ended?: boolean
          slept_away?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          operation_id?: string | null
          date?: string
          confirmed_presence?: boolean
          work_started?: boolean
          work_ended?: boolean
          slept_away?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_daily_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_daily_records_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
