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
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      cleaning_photos: {
        Row: {
          cleaning_task_id: string
          created_at: string
          id: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          cleaning_task_id: string
          created_at?: string
          id?: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          cleaning_task_id?: string
          created_at?: string
          id?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cleaning_photos_cleaning_task_id_fkey"
            columns: ["cleaning_task_id"]
            isOneToOne: false
            referencedRelation: "cleaning_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaning_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cleaning_tasks: {
        Row: {
          assignee_id: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          needs_attention: boolean
          note: string | null
          planned_date: string | null
          property_id: string
          scheduled_date: string
          source_reservation_id: string | null
          status: Database["public"]["Enums"]["cleaning_status"]
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          needs_attention?: boolean
          note?: string | null
          planned_date?: string | null
          property_id: string
          scheduled_date: string
          source_reservation_id?: string | null
          status?: Database["public"]["Enums"]["cleaning_status"]
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          needs_attention?: boolean
          note?: string | null
          planned_date?: string | null
          property_id?: string
          scheduled_date?: string
          source_reservation_id?: string | null
          status?: Database["public"]["Enums"]["cleaning_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleaning_tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaning_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaning_tasks_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaning_tasks_source_reservation_id_fkey"
            columns: ["source_reservation_id"]
            isOneToOne: true
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_attachments: {
        Row: {
          comment_id: string
          created_at: string
          file_name: string | null
          id: string
          storage_path: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          file_name?: string | null
          id?: string
          storage_path: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          file_name?: string | null
          id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_attachments_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["entity_type"]
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          expires_at: string
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          entity_id: string | null
          entity_type: Database["public"]["Enums"]["entity_type"] | null
          id: string
          kind: string
          read_at: string | null
          sent_email_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: Database["public"]["Enums"]["entity_type"] | null
          id?: string
          kind: string
          read_at?: string | null
          sent_email_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: Database["public"]["Enums"]["entity_type"] | null
          id?: string
          kind?: string
          read_at?: string | null
          sent_email_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string
          id: string
          is_active?: boolean
          name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string | null
          color: string
          created_at: string
          external_id: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          color?: string
          created_at?: string
          external_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          color?: string
          created_at?: string
          external_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      reservation_changes: {
        Row: {
          detected_at: string
          field: string
          id: number
          new_value: string | null
          old_value: string | null
          reservation_id: string
        }
        Insert: {
          detected_at?: string
          field: string
          id?: number
          new_value?: string | null
          old_value?: string | null
          reservation_id: string
        }
        Update: {
          detected_at?: string
          field?: string
          id?: number
          new_value?: string | null
          old_value?: string | null
          reservation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_changes_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_finance: {
        Row: {
          gross_amount: number
          net_amount: number
          platform_fee: number
          reservation_id: string
          updated_at: string
        }
        Insert: {
          gross_amount?: number
          net_amount?: number
          platform_fee?: number
          reservation_id: string
          updated_at?: string
        }
        Update: {
          gross_amount?: number
          net_amount?: number
          platform_fee?: number
          reservation_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_finance_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: true
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_private: {
        Row: {
          guest_memo: string | null
          guest_name: string | null
          guest_phone: string | null
          raw: Json
          reservation_id: string
          updated_at: string
        }
        Insert: {
          guest_memo?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          raw?: Json
          reservation_id: string
          updated_at?: string
        }
        Update: {
          guest_memo?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          raw?: Json
          reservation_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_private_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: true
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          checkin_date: string
          checkin_time: string | null
          checkout_date: string
          checkout_time: string | null
          external_id: string
          first_seen_at: string
          id: string
          last_synced_at: string
          nights: number | null
          property_id: string
          public_note: string | null
          status: Database["public"]["Enums"]["reservation_status"]
          updated_at: string
        }
        Insert: {
          checkin_date: string
          checkin_time?: string | null
          checkout_date: string
          checkout_time?: string | null
          external_id: string
          first_seen_at?: string
          id?: string
          last_synced_at?: string
          nights?: number | null
          property_id: string
          public_note?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
          updated_at?: string
        }
        Update: {
          checkin_date?: string
          checkin_time?: string | null
          checkout_date?: string
          checkout_time?: string | null
          external_id?: string
          first_seen_at?: string
          id?: string
          last_synced_at?: string
          nights?: number | null
          property_id?: string
          public_note?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_items: {
        Row: {
          amount: number
          created_at: string
          id: string
          kind: string
          memo: string | null
          reservation_id: string | null
          settlement_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          kind: string
          memo?: string | null
          reservation_id?: string | null
          settlement_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          kind?: string
          memo?: string | null
          reservation_id?: string | null
          settlement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlement_items_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_items_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "settlements"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          gross: number
          id: string
          memo: string | null
          net: number
          other_cost: number
          period_month: string
          platform_fee: number
          property_id: string
          status: Database["public"]["Enums"]["settlement_status"]
          updated_at: string
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          gross?: number
          id?: string
          memo?: string | null
          net?: number
          other_cost?: number
          period_month: string
          platform_fee?: number
          property_id: string
          status?: Database["public"]["Enums"]["settlement_status"]
          updated_at?: string
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          gross?: number
          id?: string
          memo?: string | null
          net?: number
          other_cost?: number
          period_month?: string
          platform_fee?: number
          property_id?: string
          status?: Database["public"]["Enums"]["settlement_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlements_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_runs: {
        Row: {
          created_count: number
          error_message: string | null
          finished_at: string | null
          found_count: number
          id: number
          started_at: string
          status: Database["public"]["Enums"]["sync_status"]
          updated_count: number
        }
        Insert: {
          created_count?: number
          error_message?: string | null
          finished_at?: string | null
          found_count?: number
          id?: number
          started_at?: string
          status?: Database["public"]["Enums"]["sync_status"]
          updated_count?: number
        }
        Update: {
          created_count?: number
          error_message?: string | null
          finished_at?: string | null
          found_count?: number
          id?: number
          started_at?: string
          status?: Database["public"]["Enums"]["sync_status"]
          updated_count?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      app_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      can_edit_attachment: { Args: { p_comment_id: string }; Returns: boolean }
      can_see_attachment: { Args: { p_comment_id: string }; Returns: boolean }
      can_see_thread: {
        Args: { t: Database["public"]["Enums"]["entity_type"] }
        Returns: boolean
      }
      claim_cleaning_task: {
        Args: { p_claim?: boolean; p_task_id: string }
        Returns: {
          assignee_id: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          needs_attention: boolean
          note: string | null
          planned_date: string | null
          property_id: string
          scheduled_date: string
          source_reservation_id: string | null
          status: Database["public"]["Enums"]["cleaning_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "cleaning_tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_comment: { Args: { p_comment_id: string }; Returns: undefined }
      is_member: { Args: never; Returns: boolean }
      is_owner: { Args: never; Returns: boolean }
      set_cleaning_done: {
        Args: { p_done?: boolean; p_note?: string; p_task_id: string }
        Returns: {
          assignee_id: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          needs_attention: boolean
          note: string | null
          planned_date: string | null
          property_id: string
          scheduled_date: string
          source_reservation_id: string | null
          status: Database["public"]["Enums"]["cleaning_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "cleaning_tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_cleaning_planned_date: {
        Args: { p_date: string; p_task_id: string }
        Returns: {
          assignee_id: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          needs_attention: boolean
          note: string | null
          planned_date: string | null
          property_id: string
          scheduled_date: string
          source_reservation_id: string | null
          status: Database["public"]["Enums"]["cleaning_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "cleaning_tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      cleaning_status: "pending" | "done" | "skipped"
      entity_type: "reservation" | "cleaning" | "settlement"
      reservation_status: "confirmed" | "cancelled" | "completed"
      settlement_status: "draft" | "confirmed"
      sync_status: "running" | "success" | "failed"
      user_role: "owner" | "reservation" | "settlement" | "cleaning"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      cleaning_status: ["pending", "done", "skipped"],
      entity_type: ["reservation", "cleaning", "settlement"],
      reservation_status: ["confirmed", "cancelled", "completed"],
      settlement_status: ["draft", "confirmed"],
      sync_status: ["running", "success", "failed"],
      user_role: ["owner", "reservation", "settlement", "cleaning"],
    },
  },
} as const
