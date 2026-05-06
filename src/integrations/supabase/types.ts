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
      documents: {
        Row: {
          doc_type: string | null
          file_path: string
          id: string
          name: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          doc_type?: string | null
          file_path: string
          id?: string
          name: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          doc_type?: string | null
          file_path?: string
          id?: string
          name?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string
          created_by: string | null
          current_value: number | null
          description: string | null
          id: string
          reference_month: number
          reference_year: number
          target_value: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_value?: number | null
          description?: string | null
          id?: string
          reference_month: number
          reference_year: number
          target_value?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_value?: number | null
          description?: string | null
          id?: string
          reference_month?: number
          reference_year?: number
          target_value?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          recipient_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_broadcast: boolean
          is_read: boolean
          message: string
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_broadcast?: boolean
          is_read?: boolean
          message: string
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_broadcast?: boolean
          is_read?: boolean
          message?: string
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payslips: {
        Row: {
          absence_deduction: number
          absent_days: number
          admin_response: string | null
          base_salary: number
          bonus: number
          created_at: string
          id: string
          late_deduction: number
          overtime_pay: number
          reference_month: number
          reference_year: number
          rejection_reason: string | null
          responded_at: string | null
          signature_path: string | null
          signed_at: string | null
          signed_document_path: string | null
          status: Database["public"]["Enums"]["payslip_status"]
          total_late_minutes: number
          total_net: number
          total_overtime_minutes: number
          user_id: string
        }
        Insert: {
          absence_deduction?: number
          absent_days?: number
          admin_response?: string | null
          base_salary?: number
          bonus?: number
          created_at?: string
          id?: string
          late_deduction?: number
          overtime_pay?: number
          reference_month: number
          reference_year: number
          rejection_reason?: string | null
          responded_at?: string | null
          signature_path?: string | null
          signed_at?: string | null
          signed_document_path?: string | null
          status?: Database["public"]["Enums"]["payslip_status"]
          total_late_minutes?: number
          total_net?: number
          total_overtime_minutes?: number
          user_id: string
        }
        Update: {
          absence_deduction?: number
          absent_days?: number
          admin_response?: string | null
          base_salary?: number
          bonus?: number
          created_at?: string
          id?: string
          late_deduction?: number
          overtime_pay?: number
          reference_month?: number
          reference_year?: number
          rejection_reason?: string | null
          responded_at?: string | null
          signature_path?: string | null
          signed_at?: string | null
          signed_document_path?: string | null
          status?: Database["public"]["Enums"]["payslip_status"]
          total_late_minutes?: number
          total_net?: number
          total_overtime_minutes?: number
          user_id?: string
        }
        Relationships: []
      }
      positions: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          avatar_url: string | null
          base_salary: number | null
          birth_date: string | null
          cnpj: string | null
          cpf: string | null
          created_at: string
          default_bonus: number | null
          default_commission: number
          email: string
          full_name: string
          hire_date: string | null
          id: string
          is_mei: boolean
          overtime_hour_rate: number
          phone: string | null
          pix_key: string | null
          position: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          base_salary?: number | null
          birth_date?: string | null
          cnpj?: string | null
          cpf?: string | null
          created_at?: string
          default_bonus?: number | null
          default_commission?: number
          email: string
          full_name?: string
          hire_date?: string | null
          id: string
          is_mei?: boolean
          overtime_hour_rate?: number
          phone?: string | null
          pix_key?: string | null
          position?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          base_salary?: number | null
          birth_date?: string | null
          cnpj?: string | null
          cpf?: string | null
          created_at?: string
          default_bonus?: number | null
          default_commission?: number
          email?: string
          full_name?: string
          hire_date?: string | null
          id?: string
          is_mei?: boolean
          overtime_hour_rate?: number
          phone?: string | null
          pix_key?: string | null
          position?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          balance_minutes: number | null
          break_in: string | null
          break_out: string | null
          clock_in: string | null
          clock_out: string | null
          created_at: string
          entry_date: string
          id: string
          is_absent: boolean
          late_minutes: number | null
          lunch_in: string | null
          lunch_out: string | null
          notes: string | null
          overtime_minutes: number | null
          updated_at: string
          user_id: string
          worked_minutes: number | null
        }
        Insert: {
          balance_minutes?: number | null
          break_in?: string | null
          break_out?: string | null
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          entry_date: string
          id?: string
          is_absent?: boolean
          late_minutes?: number | null
          lunch_in?: string | null
          lunch_out?: string | null
          notes?: string | null
          overtime_minutes?: number | null
          updated_at?: string
          user_id: string
          worked_minutes?: number | null
        }
        Update: {
          balance_minutes?: number | null
          break_in?: string | null
          break_out?: string | null
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          entry_date?: string
          id?: string
          is_absent?: boolean
          late_minutes?: number | null
          lunch_in?: string | null
          lunch_out?: string | null
          notes?: string | null
          overtime_minutes?: number | null
          updated_at?: string
          user_id?: string
          worked_minutes?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vacations: {
        Row: {
          acquisition_end: string
          acquisition_start: string
          base_salary: number
          created_at: string
          created_by: string | null
          id: string
          inss_deduction: number
          irrf_deduction: number
          notes: string | null
          one_third_bonus: number
          sold_days: number
          sold_days_pay: number
          status: Database["public"]["Enums"]["vacation_status"]
          total_gross: number
          total_net: number
          updated_at: string
          user_id: string
          vacation_days: number
          vacation_end: string
          vacation_pay: number
          vacation_start: string
        }
        Insert: {
          acquisition_end: string
          acquisition_start: string
          base_salary?: number
          created_at?: string
          created_by?: string | null
          id?: string
          inss_deduction?: number
          irrf_deduction?: number
          notes?: string | null
          one_third_bonus?: number
          sold_days?: number
          sold_days_pay?: number
          status?: Database["public"]["Enums"]["vacation_status"]
          total_gross?: number
          total_net?: number
          updated_at?: string
          user_id: string
          vacation_days?: number
          vacation_end: string
          vacation_pay?: number
          vacation_start: string
        }
        Update: {
          acquisition_end?: string
          acquisition_start?: string
          base_salary?: number
          created_at?: string
          created_by?: string | null
          id?: string
          inss_deduction?: number
          irrf_deduction?: number
          notes?: string | null
          one_third_bonus?: number
          sold_days?: number
          sold_days_pay?: number
          status?: Database["public"]["Enums"]["vacation_status"]
          total_gross?: number
          total_net?: number
          updated_at?: string
          user_id?: string
          vacation_days?: number
          vacation_end?: string
          vacation_pay?: number
          vacation_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_birthdays_this_month: {
        Args: never
        Returns: {
          avatar_url: string
          birth_date: string
          full_name: string
          id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      notify_admins_payslip_response: {
        Args: {
          _agreed: boolean
          _employee_name: string
          _payslip_id: string
          _reason?: string
        }
        Returns: undefined
      }
      notify_today_birthdays: { Args: never; Returns: number }
      reopen_payslip: {
        Args: { _admin_response: string; _payslip_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "employee"
      payslip_status: "pending" | "signed" | "rejected"
      vacation_status:
        | "scheduled"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "requested"
        | "rejected"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "employee"],
      payslip_status: ["pending", "signed", "rejected"],
      vacation_status: [
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
        "requested",
        "rejected",
      ],
    },
  },
} as const
