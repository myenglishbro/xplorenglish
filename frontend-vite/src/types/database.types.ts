export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      account_invitations: {
        Row: {
          accepted_at: string | null
          invited_at: string
          invited_by: string
          profile_id: string
        }
        Insert: {
          accepted_at?: string | null
          invited_at?: string
          invited_by: string
          profile_id: string
        }
        Update: {
          accepted_at?: string | null
          invited_at?: string
          invited_by?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_invitations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          created_by: string
          description: string
          expense_date: string
          id: number
          notes: string | null
          payment_method: string
          updated_at: string
        }
        Insert: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by: string
          description: string
          expense_date: string
          id?: never
          notes?: string | null
          payment_method: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by?: string
          description?: string
          expense_date?: string
          id?: never
          notes?: string | null
          payment_method?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_schedules: {
        Row: {
          classroom_id: number
          day_of_week: number
          end_time: string
          id: number
          is_active: boolean
          start_time: string
          timezone: string
        }
        Insert: {
          classroom_id: number
          day_of_week: number
          end_time: string
          id?: never
          is_active?: boolean
          start_time: string
          timezone?: string
        }
        Update: {
          classroom_id?: number
          day_of_week?: number
          end_time?: string
          id?: never
          is_active?: boolean
          start_time?: string
          timezone?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_schedules_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      classroom_students: {
        Row: {
          classroom_id: number
          enrolled_at: string
          status: Database["public"]["Enums"]["membership_status"]
          student_id: string
        }
        Insert: {
          classroom_id: number
          enrolled_at?: string
          status?: Database["public"]["Enums"]["membership_status"]
          student_id: string
        }
        Update: {
          classroom_id?: number
          enrolled_at?: string
          status?: Database["public"]["Enums"]["membership_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "classroom_students_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classroom_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      classroom_teachers: {
        Row: {
          assigned_at: string
          classroom_id: number
          id: number
          status: Database["public"]["Enums"]["membership_status"]
          teacher_id: string
          teacher_role: Database["public"]["Enums"]["classroom_teacher_role"]
        }
        Insert: {
          assigned_at?: string
          classroom_id: number
          id?: never
          status?: Database["public"]["Enums"]["membership_status"]
          teacher_id: string
          teacher_role: Database["public"]["Enums"]["classroom_teacher_role"]
        }
        Update: {
          assigned_at?: string
          classroom_id?: number
          id?: never
          status?: Database["public"]["Enums"]["membership_status"]
          teacher_id?: string
          teacher_role?: Database["public"]["Enums"]["classroom_teacher_role"]
        }
        Relationships: [
          {
            foreignKeyName: "classroom_teachers_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classroom_teachers_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      classrooms: {
        Row: {
          created_at: string
          description: string | null
          id: number
          level: Database["public"]["Enums"]["academic_level"]
          name: string
          program_id: number
          schedule_notes: string | null
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: never
          level: Database["public"]["Enums"]["academic_level"]
          name: string
          program_id: number
          schedule_notes?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: never
          level?: Database["public"]["Enums"]["academic_level"]
          name?: string
          program_id?: number
          schedule_notes?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "classrooms_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      hours_movements: {
        Row: {
          created_at: string
          created_by: string
          id: number
          minutes_delta: number
          movement_type: Database["public"]["Enums"]["hours_movement_type"]
          notes: string | null
          package_id: number | null
          session_attendance_id: number | null
          student_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: never
          minutes_delta: number
          movement_type: Database["public"]["Enums"]["hours_movement_type"]
          notes?: string | null
          package_id?: number | null
          session_attendance_id?: number | null
          student_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: never
          minutes_delta?: number
          movement_type?: Database["public"]["Enums"]["hours_movement_type"]
          notes?: string | null
          package_id?: number | null
          session_attendance_id?: number | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hours_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hours_movements_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "hours_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hours_movements_session_attendance_id_fkey"
            columns: ["session_attendance_id"]
            isOneToOne: false
            referencedRelation: "session_attendance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hours_movements_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hours_packages: {
        Row: {
          expires_at: string | null
          id: number
          package_label: string
          payment_id: number
          price_paid: number
          purchased_at: string
          status: Database["public"]["Enums"]["package_status"]
          student_id: string
          total_minutes: number
        }
        Insert: {
          expires_at?: string | null
          id?: never
          package_label: string
          payment_id: number
          price_paid: number
          purchased_at?: string
          status?: Database["public"]["Enums"]["package_status"]
          student_id: string
          total_minutes: number
        }
        Update: {
          expires_at?: string | null
          id?: never
          package_label?: string
          payment_id?: number
          price_paid?: number
          purchased_at?: string
          status?: Database["public"]["Enums"]["package_status"]
          student_id?: string
          total_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "hours_packages_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "student_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hours_packages_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          description: string | null
          id: number
          module_id: number
          order_index: number
          status: string
          title: string
        }
        Insert: {
          description?: string | null
          id?: never
          module_id: number
          order_index?: number
          status?: string
          title: string
        }
        Update: {
          description?: string | null
          id?: never
          module_id?: number
          order_index?: number
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          classroom_id: number
          description: string | null
          id: number
          order_index: number
          status: string
          title: string
        }
        Insert: {
          classroom_id: number
          description?: string | null
          id?: never
          order_index?: number
          status?: string
          title: string
        }
        Update: {
          classroom_id?: number
          description?: string | null
          id?: never
          order_index?: number
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      placement_test_attempts: {
        Row: {
          completed_at: string | null
          created_at: string
          id: number
          placement_test_id: number
          resulting_level: Database["public"]["Enums"]["academic_level"] | null
          score: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["placement_attempt_status"]
          student_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: never
          placement_test_id: number
          resulting_level?: Database["public"]["Enums"]["academic_level"] | null
          score?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["placement_attempt_status"]
          student_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: never
          placement_test_id?: number
          resulting_level?: Database["public"]["Enums"]["academic_level"] | null
          score?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["placement_attempt_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "placement_test_attempts_placement_test_id_fkey"
            columns: ["placement_test_id"]
            isOneToOne: false
            referencedRelation: "placement_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placement_test_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      placement_tests: {
        Row: {
          created_at: string
          description: string | null
          id: number
          name: string
          status: Database["public"]["Enums"]["placement_test_status"]
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: never
          name: string
          status?: Database["public"]["Enums"]["placement_test_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: never
          name?: string
          status?: Database["public"]["Enums"]["placement_test_status"]
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          dni: string
          first_name: string
          id: string
          last_name: string
          level: Database["public"]["Enums"]["academic_level"]
          must_change_password: boolean
          phone: string
          program_id: number | null
          role: Database["public"]["Enums"]["user_role"]
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dni: string
          first_name: string
          id: string
          last_name: string
          level?: Database["public"]["Enums"]["academic_level"]
          must_change_password?: boolean
          phone: string
          program_id?: number | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dni?: string
          first_name?: string
          id?: string
          last_name?: string
          level?: Database["public"]["Enums"]["academic_level"]
          must_change_password?: boolean
          phone?: string
          program_id?: number | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          created_at: string
          description: string | null
          id: number
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: never
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: never
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          id: number
          lesson_id: number
          order_index: number
          reference: string
          title: string
          type: Database["public"]["Enums"]["resource_type"]
        }
        Insert: {
          id?: never
          lesson_id: number
          order_index?: number
          reference: string
          title: string
          type: Database["public"]["Enums"]["resource_type"]
        }
        Update: {
          id?: never
          lesson_id?: number
          order_index?: number
          reference?: string
          title?: string
          type?: Database["public"]["Enums"]["resource_type"]
        }
        Relationships: [
          {
            foreignKeyName: "resources_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      role_changes: {
        Row: {
          changed_at: string
          changed_by: string
          id: number
          new_role: Database["public"]["Enums"]["user_role"]
          previous_role: Database["public"]["Enums"]["user_role"]
          profile_id: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          id?: never
          new_role: Database["public"]["Enums"]["user_role"]
          previous_role: Database["public"]["Enums"]["user_role"]
          profile_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          id?: never
          new_role?: Database["public"]["Enums"]["user_role"]
          previous_role?: Database["public"]["Enums"]["user_role"]
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_changes_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_changes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_attendance: {
        Row: {
          decided_at: string | null
          decided_by: string | null
          id: number
          minutes_charged: number | null
          session_id: number
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
        }
        Insert: {
          decided_at?: string | null
          decided_by?: string | null
          id?: never
          minutes_charged?: number | null
          session_id: number
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id: string
        }
        Update: {
          decided_at?: string | null
          decided_by?: string | null
          id?: never
          minutes_charged?: number | null
          session_id?: number
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_attendance_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_teacher_changes: {
        Row: {
          change_type: Database["public"]["Enums"]["session_teacher_change_type"]
          changed_at: string
          changed_by: string
          id: number
          new_teacher_id: string
          previous_teacher_id: string | null
          reason: string | null
          session_id: number
        }
        Insert: {
          change_type: Database["public"]["Enums"]["session_teacher_change_type"]
          changed_at?: string
          changed_by: string
          id?: never
          new_teacher_id: string
          previous_teacher_id?: string | null
          reason?: string | null
          session_id: number
        }
        Update: {
          change_type?: Database["public"]["Enums"]["session_teacher_change_type"]
          changed_at?: string
          changed_by?: string
          id?: never
          new_teacher_id?: string
          previous_teacher_id?: string | null
          reason?: string | null
          session_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "session_teacher_changes_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_teacher_changes_new_teacher_id_fkey"
            columns: ["new_teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "session_teacher_changes_previous_teacher_id_fkey"
            columns: ["previous_teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "session_teacher_changes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          actual_teacher_id: string | null
          classroom_id: number
          created_at: string
          id: number
          notes: string | null
          rescheduled_from_session_id: number | null
          scheduled_end: string
          scheduled_start: string
          scheduled_teacher_id: string
          status: Database["public"]["Enums"]["session_status"]
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          actual_teacher_id?: string | null
          classroom_id: number
          created_at?: string
          id?: never
          notes?: string | null
          rescheduled_from_session_id?: number | null
          scheduled_end: string
          scheduled_start: string
          scheduled_teacher_id: string
          status?: Database["public"]["Enums"]["session_status"]
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          actual_teacher_id?: string | null
          classroom_id?: number
          created_at?: string
          id?: never
          notes?: string | null
          rescheduled_from_session_id?: number | null
          scheduled_end?: string
          scheduled_start?: string
          scheduled_teacher_id?: string
          status?: Database["public"]["Enums"]["session_status"]
        }
        Relationships: [
          {
            foreignKeyName: "sessions_actual_teacher_id_fkey"
            columns: ["actual_teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "sessions_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_rescheduled_from_session_id_fkey"
            columns: ["rescheduled_from_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_scheduled_teacher_id_fkey"
            columns: ["scheduled_teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      skills: {
        Row: {
          created_at: string
          id: number
          name: string
        }
        Insert: {
          created_at?: string
          id?: never
          name: string
        }
        Update: {
          created_at?: string
          id?: never
          name?: string
        }
        Relationships: []
      }
      student_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: number
          idempotency_key: string
          paid_at: string | null
          payment_method: string
          reference: string | null
          status: Database["public"]["Enums"]["payment_status"]
          student_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: never
          idempotency_key: string
          paid_at?: string | null
          payment_method: string
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          student_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: never
          idempotency_key?: string
          paid_at?: string | null
          payment_method?: string
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_availability: {
        Row: {
          day_of_week: number
          end_time: string
          id: number
          start_time: string
          teacher_id: string
          timezone: string
        }
        Insert: {
          day_of_week: number
          end_time: string
          id?: never
          start_time: string
          teacher_id: string
          timezone?: string
        }
        Update: {
          day_of_week?: number
          end_time?: string
          id?: never
          start_time?: string
          teacher_id?: string
          timezone?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_availability_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      teacher_hours_log: {
        Row: {
          amount: number
          billable_minutes: number
          created_at: string
          hourly_rate_snapshot: number
          id: number
          session_id: number
          teacher_id: string
          teacher_payment_period_id: number | null
        }
        Insert: {
          amount: number
          billable_minutes: number
          created_at?: string
          hourly_rate_snapshot: number
          id?: never
          session_id: number
          teacher_id: string
          teacher_payment_period_id?: number | null
        }
        Update: {
          amount?: number
          billable_minutes?: number
          created_at?: string
          hourly_rate_snapshot?: number
          id?: never
          session_id?: number
          teacher_id?: string
          teacher_payment_period_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_hours_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_hours_log_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "teacher_hours_log_teacher_payment_period_id_fkey"
            columns: ["teacher_payment_period_id"]
            isOneToOne: false
            referencedRelation: "teacher_payment_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_payment_periods: {
        Row: {
          created_at: string
          id: number
          paid_at: string | null
          period_end: string
          period_start: string
          status: Database["public"]["Enums"]["teacher_payment_period_status"]
          teacher_id: string
          total_amount: number
          total_minutes: number
        }
        Insert: {
          created_at?: string
          id?: never
          paid_at?: string | null
          period_end: string
          period_start: string
          status?: Database["public"]["Enums"]["teacher_payment_period_status"]
          teacher_id: string
          total_amount?: number
          total_minutes?: number
        }
        Update: {
          created_at?: string
          id?: never
          paid_at?: string | null
          period_end?: string
          period_start?: string
          status?: Database["public"]["Enums"]["teacher_payment_period_status"]
          teacher_id?: string
          total_amount?: number
          total_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "teacher_payment_periods_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      teacher_profiles: {
        Row: {
          bio: string | null
          created_at: string
          hourly_rate: number
          profile_id: string
          status: string
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          hourly_rate: number
          profile_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          hourly_rate?: number
          profile_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_receipts: {
        Row: {
          file_path: string
          id: number
          teacher_id: string
          teacher_payment_period_id: number
          uploaded_at: string
        }
        Insert: {
          file_path: string
          id?: never
          teacher_id: string
          teacher_payment_period_id: number
          uploaded_at?: string
        }
        Update: {
          file_path?: string
          id?: never
          teacher_id?: string
          teacher_payment_period_id?: number
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_receipts_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "teacher_receipts_teacher_payment_period_id_fkey"
            columns: ["teacher_payment_period_id"]
            isOneToOne: true
            referencedRelation: "teacher_payment_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_skills: {
        Row: {
          created_at: string
          skill_id: number
          teacher_id: string
        }
        Insert: {
          created_at?: string
          skill_id: number
          teacher_id: string
        }
        Update: {
          created_at?: string
          skill_id?: number
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_skills_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["profile_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_provision_student_profile: {
        Args: {
          p_dni: string
          p_first_name: string
          p_last_name: string
          p_level: Database["public"]["Enums"]["academic_level"]
          p_phone: string
          p_program_id: number
          p_target_id: string
        }
        Returns: {
          created_at: string
          dni: string
          first_name: string
          id: string
          last_name: string
          level: Database["public"]["Enums"]["academic_level"]
          must_change_password: boolean
          phone: string
          program_id: number | null
          role: Database["public"]["Enums"]["user_role"]
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_reset_student_password_flag: {
        Args: { p_target_id: string }
        Returns: {
          created_at: string
          dni: string
          first_name: string
          id: string
          last_name: string
          level: Database["public"]["Enums"]["academic_level"]
          must_change_password: boolean
          phone: string
          program_id: number | null
          role: Database["public"]["Enums"]["user_role"]
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      approve_teacher_payment_period: {
        Args: { p_teacher_payment_period_id: number }
        Returns: {
          created_at: string
          id: number
          paid_at: string | null
          period_end: string
          period_start: string
          status: Database["public"]["Enums"]["teacher_payment_period_status"]
          teacher_id: string
          total_amount: number
          total_minutes: number
        }
        SetofOptions: {
          from: "*"
          to: "teacher_payment_periods"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assign_classroom_primary_teacher: {
        Args: { p_classroom_id: number; p_teacher_id: string }
        Returns: {
          assigned_at: string
          classroom_id: number
          id: number
          status: Database["public"]["Enums"]["membership_status"]
          teacher_id: string
          teacher_role: Database["public"]["Enums"]["classroom_teacher_role"]
        }
        SetofOptions: {
          from: "*"
          to: "classroom_teachers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_session: {
        Args: { p_session_id: number }
        Returns: {
          actual_end: string | null
          actual_start: string | null
          actual_teacher_id: string | null
          classroom_id: number
          created_at: string
          id: number
          notes: string | null
          rescheduled_from_session_id: number | null
          scheduled_end: string
          scheduled_start: string
          scheduled_teacher_id: string
          status: Database["public"]["Enums"]["session_status"]
        }
        SetofOptions: {
          from: "*"
          to: "sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      change_session_teacher: {
        Args: {
          p_change_type: Database["public"]["Enums"]["session_teacher_change_type"]
          p_new_teacher_id: string
          p_reason?: string
          p_session_id: number
        }
        Returns: {
          actual_end: string | null
          actual_start: string | null
          actual_teacher_id: string | null
          classroom_id: number
          created_at: string
          id: number
          notes: string | null
          rescheduled_from_session_id: number | null
          scheduled_end: string
          scheduled_start: string
          scheduled_teacher_id: string
          status: Database["public"]["Enums"]["session_status"]
        }
        SetofOptions: {
          from: "*"
          to: "sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      classroom_primary_teacher_name: {
        Args: { p_classroom_id: number }
        Returns: {
          first_name: string
          last_name: string
        }[]
      }
      complete_registration: {
        Args: {
          p_dni: string
          p_first_name: string
          p_last_name: string
          p_phone: string
          p_program_id?: number
        }
        Returns: {
          created_at: string
          dni: string
          first_name: string
          id: string
          last_name: string
          level: Database["public"]["Enums"]["academic_level"]
          must_change_password: boolean
          phone: string
          program_id: number | null
          role: Database["public"]["Enums"]["user_role"]
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_session: {
        Args: { p_session_id: number }
        Returns: {
          hours_log_id: number
          session: Database["public"]["Tables"]["sessions"]["Row"]
        }[]
      }
      create_hour_package: {
        Args: {
          p_currency?: string
          p_idempotency_key: string
          p_package_label: string
          p_payment_method: string
          p_payment_reference?: string
          p_price: number
          p_student_id: string
          p_total_minutes: number
        }
        Returns: {
          movement_id: number
          package_id: number
          payment_id: number
        }[]
      }
      create_my_teacher_availability: {
        Args: {
          p_day_of_week: number
          p_end_time: string
          p_start_time: string
        }
        Returns: {
          day_of_week: number
          end_time: string
          id: number
          start_time: string
          teacher_id: string
          timezone: string
        }
        SetofOptions: {
          from: "*"
          to: "teacher_availability"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_teacher_payment_period: {
        Args: {
          p_period_end: string
          p_period_start: string
          p_teacher_id: string
        }
        Returns: {
          created_at: string
          id: number
          paid_at: string | null
          period_end: string
          period_start: string
          status: Database["public"]["Enums"]["teacher_payment_period_status"]
          teacher_id: string
          total_amount: number
          total_minutes: number
        }
        SetofOptions: {
          from: "*"
          to: "teacher_payment_periods"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_my_teacher_availability: {
        Args: { p_id: number }
        Returns: undefined
      }
      get_user_emails: {
        Args: { p_user_ids: string[] }
        Returns: {
          email: string
          user_id: string
        }[]
      }
      initialize_session_attendance: {
        Args: { p_session_id: number }
        Returns: number
      }
      mark_invitation_accepted: {
        Args: never
        Returns: {
          accepted_at: string | null
          invited_at: string
          invited_by: string
          profile_id: string
        }
        SetofOptions: {
          from: "*"
          to: "account_invitations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_password_changed: {
        Args: never
        Returns: {
          created_at: string
          dni: string
          first_name: string
          id: string
          last_name: string
          level: Database["public"]["Enums"]["academic_level"]
          must_change_password: boolean
          phone: string
          program_id: number | null
          role: Database["public"]["Enums"]["user_role"]
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_teacher_payment_period_paid: {
        Args: { p_paid_at?: string; p_teacher_payment_period_id: number }
        Returns: {
          created_at: string
          id: number
          paid_at: string | null
          period_end: string
          period_start: string
          status: Database["public"]["Enums"]["teacher_payment_period_status"]
          teacher_id: string
          total_amount: number
          total_minutes: number
        }
        SetofOptions: {
          from: "*"
          to: "teacher_payment_periods"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      promote_user_to_teacher: {
        Args: { p_initial_hourly_rate: number; p_target_profile_id: string }
        Returns: {
          profile: Database["public"]["Tables"]["profiles"]["Row"]
          teacher_profile: Database["public"]["Tables"]["teacher_profiles"]["Row"]
        }[]
      }
      reschedule_session: {
        Args: {
          p_new_scheduled_end: string
          p_new_scheduled_start: string
          p_new_scheduled_teacher_id?: string
          p_reason?: string
          p_session_id: number
        }
        Returns: {
          actual_end: string | null
          actual_start: string | null
          actual_teacher_id: string | null
          classroom_id: number
          created_at: string
          id: number
          notes: string | null
          rescheduled_from_session_id: number | null
          scheduled_end: string
          scheduled_start: string
          scheduled_teacher_id: string
          status: Database["public"]["Enums"]["session_status"]
        }
        SetofOptions: {
          from: "*"
          to: "sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_student_session_billing: {
        Args: {
          p_attendance_status: Database["public"]["Enums"]["attendance_status"]
          p_minutes_charged: number
          p_notes?: string
          p_session_id: number
          p_student_id: string
        }
        Returns: {
          attendance_id: number
          minutes_charged: number
          movement_ids: number[]
        }[]
      }
      start_session: {
        Args: { p_actual_teacher_id?: string; p_session_id: number }
        Returns: {
          actual_end: string | null
          actual_start: string | null
          actual_teacher_id: string | null
          classroom_id: number
          created_at: string
          id: number
          notes: string | null
          rescheduled_from_session_id: number | null
          scheduled_end: string
          scheduled_start: string
          scheduled_teacher_id: string
          status: Database["public"]["Enums"]["session_status"]
        }
        SetofOptions: {
          from: "*"
          to: "sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_my_teacher_availability: {
        Args: {
          p_day_of_week: number
          p_end_time: string
          p_id: number
          p_start_time: string
        }
        Returns: {
          day_of_week: number
          end_time: string
          id: number
          start_time: string
          teacher_id: string
          timezone: string
        }
        SetofOptions: {
          from: "*"
          to: "teacher_availability"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      upload_teacher_receipt: {
        Args: { p_file_path: string; p_teacher_payment_period_id: number }
        Returns: {
          period: Database["public"]["Tables"]["teacher_payment_periods"]["Row"]
          receipt_id: number
        }[]
      }
    }
    Enums: {
      academic_level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2"
      attendance_status: "present" | "absent" | "cancelled" | "rescheduled"
      classroom_teacher_role: "PRIMARY" | "SUBSTITUTE"
      expense_category:
        | "marketing"
        | "software"
        | "services"
        | "rent"
        | "equipment"
        | "materials"
        | "administration"
        | "taxes"
        | "other"
      hours_movement_type:
        | "purchase"
        | "consumption"
        | "refund"
        | "adjustment"
        | "expiration"
      membership_status: "active" | "inactive"
      package_status: "active" | "exhausted" | "expired"
      payment_status: "pending" | "completed" | "failed" | "refunded"
      placement_attempt_status:
        | "not_started"
        | "in_progress"
        | "completed"
        | "cancelled"
      placement_test_status: "draft" | "active" | "inactive"
      resource_type:
        | "pdf"
        | "drive"
        | "docs"
        | "slides"
        | "youtube"
        | "url"
        | "embed"
        | "vimeo"
      session_status: "scheduled" | "completed" | "cancelled" | "rescheduled"
      session_teacher_change_type:
        | "SCHEDULED_TEACHER_CHANGED"
        | "ACTUAL_TEACHER_CHANGED"
      teacher_payment_period_status:
        | "pending"
        | "pending_receipt"
        | "receipt_uploaded"
        | "approved"
        | "paid"
      user_role: "admin" | "teacher" | "student"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      academic_level: ["A1", "A2", "B1", "B2", "C1", "C2"],
      attendance_status: ["present", "absent", "cancelled", "rescheduled"],
      classroom_teacher_role: ["PRIMARY", "SUBSTITUTE"],
      expense_category: [
        "marketing",
        "software",
        "services",
        "rent",
        "equipment",
        "materials",
        "administration",
        "taxes",
        "other",
      ],
      hours_movement_type: [
        "purchase",
        "consumption",
        "refund",
        "adjustment",
        "expiration",
      ],
      membership_status: ["active", "inactive"],
      package_status: ["active", "exhausted", "expired"],
      payment_status: ["pending", "completed", "failed", "refunded"],
      placement_attempt_status: [
        "not_started",
        "in_progress",
        "completed",
        "cancelled",
      ],
      placement_test_status: ["draft", "active", "inactive"],
      resource_type: [
        "pdf",
        "drive",
        "docs",
        "slides",
        "youtube",
        "url",
        "embed",
        "vimeo",
      ],
      session_status: ["scheduled", "completed", "cancelled", "rescheduled"],
      session_teacher_change_type: [
        "SCHEDULED_TEACHER_CHANGED",
        "ACTUAL_TEACHER_CHANGED",
      ],
      teacher_payment_period_status: [
        "pending",
        "pending_receipt",
        "receipt_uploaded",
        "approved",
        "paid",
      ],
      user_role: ["admin", "teacher", "student"],
    },
  },
} as const
