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
