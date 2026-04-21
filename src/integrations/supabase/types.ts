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
      chat_messages: {
        Row: {
          attachment_mime: string | null
          attachment_name: string | null
          attachment_path: string | null
          attachment_size: number | null
          body: string | null
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          sender_id: string
          thread_id: string
        }
        Insert: {
          attachment_mime?: string | null
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_size?: number | null
          body?: string | null
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          sender_id: string
          thread_id: string
        }
        Update: {
          attachment_mime?: string | null
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_size?: number | null
          body?: string | null
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_reads: {
        Row: {
          last_read_at: string
          thread_id: string
          user_id: string
        }
        Insert: {
          last_read_at?: string
          thread_id: string
          user_id: string
        }
        Update: {
          last_read_at?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_reads_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          project_id: string | null
          ticket_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          project_id?: string | null
          ticket_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          project_id?: string | null
          ticket_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_threads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_threads_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverables: {
        Row: {
          created_at: string
          file_name: string
          file_size: number
          id: string
          milestone_id: string
          mime_type: string | null
          note: string | null
          project_id: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size: number
          id?: string
          milestone_id: string
          mime_type?: string | null
          note?: string | null
          project_id: string
          storage_path: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number
          id?: string
          milestone_id?: string
          mime_type?: string | null
          note?: string | null
          project_id?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverables_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverables_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          approved_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          position: number
          price: number | null
          project_id: string
          requires_approval: boolean
          status: Database["public"]["Enums"]["milestone_status"]
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          price?: number | null
          project_id: string
          requires_approval?: boolean
          status?: Database["public"]["Enums"]["milestone_status"]
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          price?: number | null
          project_id?: string
          requires_approval?: boolean
          status?: Database["public"]["Enums"]["milestone_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: Database["public"]["Enums"]["project_event_type"]
          from_value: string | null
          id: string
          message: string | null
          milestone_id: string | null
          project_id: string
          to_value: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: Database["public"]["Enums"]["project_event_type"]
          from_value?: string | null
          id?: string
          message?: string | null
          milestone_id?: string | null
          project_id: string
          to_value?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: Database["public"]["Enums"]["project_event_type"]
          from_value?: string | null
          id?: string
          message?: string | null
          milestone_id?: string | null
          project_id?: string
          to_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_events_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          assigned_expert_id: string | null
          brief: string
          completed_at: string | null
          created_at: string
          deadline: string | null
          id: string
          status: Database["public"]["Enums"]["project_status"]
          student_id: string
          subject: string
          title: string
          total_budget: number | null
          updated_at: string
        }
        Insert: {
          assigned_expert_id?: string | null
          brief: string
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          id?: string
          status?: Database["public"]["Enums"]["project_status"]
          student_id: string
          subject: string
          title: string
          total_budget?: number | null
          updated_at?: string
        }
        Update: {
          assigned_expert_id?: string | null
          brief?: string
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          id?: string
          status?: Database["public"]["Enums"]["project_status"]
          student_id?: string
          subject?: string
          title?: string
          total_budget?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      ticket_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number
          id: string
          mime_type: string | null
          storage_path: string
          ticket_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size: number
          id?: string
          mime_type?: string | null
          storage_path: string
          ticket_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number
          id?: string
          mime_type?: string | null
          storage_path?: string
          ticket_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: Database["public"]["Enums"]["ticket_event_type"]
          from_value: string | null
          id: string
          message: string | null
          ticket_id: string
          to_value: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: Database["public"]["Enums"]["ticket_event_type"]
          from_value?: string | null
          id?: string
          message?: string | null
          ticket_id: string
          to_value?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: Database["public"]["Enums"]["ticket_event_type"]
          from_value?: string | null
          id?: string
          message?: string | null
          ticket_id?: string
          to_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_events_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_expert_id: string | null
          category: Database["public"]["Enums"]["ticket_category"]
          closed_at: string | null
          created_at: string
          description: string
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          student_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_expert_id?: string | null
          category: Database["public"]["Enums"]["ticket_category"]
          closed_at?: string | null
          created_at?: string
          description: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          student_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_expert_id?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          closed_at?: string | null
          created_at?: string
          description?: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          student_id?: string
          title?: string
          updated_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_project: {
        Args: { _expert_id: string; _project_id: string }
        Returns: {
          assigned_expert_id: string | null
          brief: string
          completed_at: string | null
          created_at: string
          deadline: string | null
          id: string
          status: Database["public"]["Enums"]["project_status"]
          student_id: string
          subject: string
          title: string
          total_budget: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "projects"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assign_ticket: {
        Args: { _expert_id: string; _ticket_id: string }
        Returns: {
          assigned_expert_id: string | null
          category: Database["public"]["Enums"]["ticket_category"]
          closed_at: string | null
          created_at: string
          description: string
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          student_id: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "tickets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      can_access_thread: {
        Args: { _thread_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_project: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_ticket: {
        Args: { _ticket_id: string; _user_id: string }
        Returns: boolean
      }
      claim_project: {
        Args: { _project_id: string }
        Returns: {
          assigned_expert_id: string | null
          brief: string
          completed_at: string | null
          created_at: string
          deadline: string | null
          id: string
          status: Database["public"]["Enums"]["project_status"]
          student_id: string
          subject: string
          title: string
          total_budget: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "projects"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_ticket: {
        Args: { _ticket_id: string }
        Returns: {
          assigned_expert_id: string | null
          category: Database["public"]["Enums"]["ticket_category"]
          closed_at: string | null
          created_at: string
          description: string
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          student_id: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "tickets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ensure_thread: {
        Args: { _project_id: string; _ticket_id: string }
        Returns: {
          created_at: string
          id: string
          last_message_at: string | null
          project_id: string | null
          ticket_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "chat_threads"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      set_milestone_status: {
        Args: {
          _milestone_id: string
          _new_status: Database["public"]["Enums"]["milestone_status"]
        }
        Returns: {
          approved_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          position: number
          price: number | null
          project_id: string
          requires_approval: boolean
          status: Database["public"]["Enums"]["milestone_status"]
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "milestones"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "student" | "expert" | "admin"
      milestone_status:
        | "pending"
        | "in_progress"
        | "submitted"
        | "approved"
        | "rejected"
      project_event_type:
        | "created"
        | "status_changed"
        | "assigned"
        | "unassigned"
        | "claimed"
        | "milestone_added"
        | "milestone_status_changed"
        | "milestone_approved"
        | "milestone_rejected"
        | "deliverable_added"
        | "commented"
      project_status:
        | "draft"
        | "open"
        | "in_progress"
        | "review"
        | "completed"
        | "cancelled"
      ticket_category: "hardware" | "software" | "network" | "account" | "other"
      ticket_event_type:
        | "created"
        | "status_changed"
        | "assigned"
        | "unassigned"
        | "claimed"
        | "commented"
        | "attachment_added"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status:
        | "open"
        | "assigned"
        | "in_progress"
        | "waiting_on_student"
        | "resolved"
        | "closed"
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
      app_role: ["student", "expert", "admin"],
      milestone_status: [
        "pending",
        "in_progress",
        "submitted",
        "approved",
        "rejected",
      ],
      project_event_type: [
        "created",
        "status_changed",
        "assigned",
        "unassigned",
        "claimed",
        "milestone_added",
        "milestone_status_changed",
        "milestone_approved",
        "milestone_rejected",
        "deliverable_added",
        "commented",
      ],
      project_status: [
        "draft",
        "open",
        "in_progress",
        "review",
        "completed",
        "cancelled",
      ],
      ticket_category: ["hardware", "software", "network", "account", "other"],
      ticket_event_type: [
        "created",
        "status_changed",
        "assigned",
        "unassigned",
        "claimed",
        "commented",
        "attachment_added",
      ],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: [
        "open",
        "assigned",
        "in_progress",
        "waiting_on_student",
        "resolved",
        "closed",
      ],
    },
  },
} as const
