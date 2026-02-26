export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          created_at: string
        }
        Insert: {
          id: string
          full_name: string
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: "admin" | "employee"
        }
        Insert: {
          id?: string
          user_id: string
          role: "admin" | "employee"
        }
        Update: {
          id?: string
          user_id?: string
          role?: "admin" | "employee"
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      customers: {
        Row: {
          id: string
          name: string
          phone: string | null
          customer_type: "vip" | "regular" | "normal"
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          phone?: string | null
          customer_type?: "vip" | "regular" | "normal"
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string | null
          customer_type?: "vip" | "regular" | "normal"
          created_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          id: string
          service_id: string
          customer_id: string | null
          employee_id: string
          amount: number
          profit: number | null
          payment_status: "paid" | "unpaid"
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          service_id: string
          customer_id?: string | null
          employee_id: string
          amount?: number
          profit?: number | null
          payment_status?: "paid" | "unpaid"
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          service_id?: string
          customer_id?: string | null
          employee_id?: string
          amount?: number
          profit?: number | null
          payment_status?: "paid" | "unpaid"
          metadata?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      audit_logs: {
        Row: {
          id: string
          transaction_id: string | null
          edited_by: string
          action: string
          old_value: Json | null
          new_value: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          transaction_id?: string | null
          edited_by: string
          action: string
          old_value?: Json | null
          new_value?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          transaction_id?: string | null
          edited_by?: string
          action?: string
          old_value?: Json | null
          new_value?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _user_id: string
          _role: "admin" | "employee"
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "employee"
      customer_type: "vip" | "regular" | "normal"
      payment_status: "paid" | "unpaid"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
