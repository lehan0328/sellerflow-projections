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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      bank_accounts: {
        Row: {
          account_id: string
          account_name: string
          account_type: string
          available_balance: number | null
          balance: number
          created_at: string
          currency_code: string | null
          encrypted_access_token: string | null
          encrypted_account_number: string | null
          encrypted_plaid_item_id: string | null
          id: string
          institution_name: string
          is_active: boolean
          last_sync: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          account_name: string
          account_type: string
          available_balance?: number | null
          balance?: number
          created_at?: string
          currency_code?: string | null
          encrypted_access_token?: string | null
          encrypted_account_number?: string | null
          encrypted_plaid_item_id?: string | null
          id?: string
          institution_name: string
          is_active?: boolean
          last_sync?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          account_name?: string
          account_type?: string
          available_balance?: number | null
          balance?: number
          created_at?: string
          currency_code?: string | null
          encrypted_access_token?: string | null
          encrypted_account_number?: string | null
          encrypted_plaid_item_id?: string | null
          id?: string
          institution_name?: string
          is_active?: boolean
          last_sync?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cash_flow_events: {
        Row: {
          amount: number
          created_at: string
          customer_id: string | null
          description: string | null
          event_date: string
          id: string
          type: string
          updated_at: string
          user_id: string
          vendor_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id?: string | null
          description?: string | null
          event_date: string
          id?: string
          type: string
          updated_at?: string
          user_id: string
          vendor_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string | null
          description?: string | null
          event_date?: string
          id?: string
          type?: string
          updated_at?: string
          user_id?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_events_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_cards: {
        Row: {
          account_name: string
          account_type: string
          annual_fee: number | null
          available_credit: number
          balance: number
          created_at: string
          credit_limit: number
          currency_code: string
          encrypted_access_token: string | null
          encrypted_account_number: string | null
          encrypted_plaid_item_id: string | null
          id: string
          institution_name: string
          interest_rate: number | null
          is_active: boolean
          last_sync: string
          masked_account_number: string | null
          minimum_payment: number | null
          payment_due_date: string | null
          plaid_account_id: string | null
          statement_close_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name: string
          account_type?: string
          annual_fee?: number | null
          available_credit?: number
          balance?: number
          created_at?: string
          credit_limit?: number
          currency_code?: string
          encrypted_access_token?: string | null
          encrypted_account_number?: string | null
          encrypted_plaid_item_id?: string | null
          id?: string
          institution_name: string
          interest_rate?: number | null
          is_active?: boolean
          last_sync?: string
          masked_account_number?: string | null
          minimum_payment?: number | null
          payment_due_date?: string | null
          plaid_account_id?: string | null
          statement_close_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string
          account_type?: string
          annual_fee?: number | null
          available_credit?: number
          balance?: number
          created_at?: string
          credit_limit?: number
          currency_code?: string
          encrypted_access_token?: string | null
          encrypted_account_number?: string | null
          encrypted_plaid_item_id?: string | null
          id?: string
          institution_name?: string
          interest_rate?: number | null
          is_active?: boolean
          last_sync?: string
          masked_account_number?: string | null
          minimum_payment?: number | null
          payment_due_date?: string | null
          plaid_account_id?: string | null
          statement_close_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          id: string
          name: string
          net_terms_days: number | null
          payment_terms: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          net_terms_days?: number | null
          payment_terms?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          net_terms_days?: number | null
          payment_terms?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      income: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          description: string
          id: string
          is_recurring: boolean
          notes: string | null
          payment_date: string
          recurring_frequency: string | null
          source: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          description: string
          id?: string
          is_recurring?: boolean
          notes?: string | null
          payment_date: string
          recurring_frequency?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          description?: string
          id?: string
          is_recurring?: boolean
          notes?: string | null
          payment_date?: string
          recurring_frequency?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          amazon_marketplaces: string[] | null
          company: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          monthly_revenue: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amazon_marketplaces?: string[] | null
          company?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          monthly_revenue?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amazon_marketplaces?: string[] | null
          company?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          monthly_revenue?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          customer_id: string | null
          description: string | null
          due_date: string | null
          id: string
          status: string | null
          transaction_date: string
          type: string
          updated_at: string
          user_id: string
          vendor_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string | null
          transaction_date?: string
          type: string
          updated_at?: string
          user_id: string
          vendor_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string | null
          transaction_date?: string
          type?: string
          updated_at?: string
          user_id?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string
          id: string
          total_cash: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          total_cash?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          total_cash?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          net_terms_days: number | null
          next_payment_amount: number | null
          next_payment_date: string | null
          notes: string | null
          payment_schedule: Json | null
          payment_type: string | null
          po_name: string | null
          source: string | null
          status: string | null
          total_owed: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          net_terms_days?: number | null
          next_payment_amount?: number | null
          next_payment_date?: string | null
          notes?: string | null
          payment_schedule?: Json | null
          payment_type?: string | null
          po_name?: string | null
          source?: string | null
          status?: string | null
          total_owed?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          net_terms_days?: number | null
          next_payment_amount?: number | null
          next_payment_date?: string | null
          notes?: string | null
          payment_schedule?: Json | null
          payment_type?: string | null
          po_name?: string | null
          source?: string | null
          status?: string | null
          total_owed?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      secure_bank_accounts: {
        Row: {
          access_token: string | null
          account_name: string | null
          account_number: string | null
          account_type: string | null
          available_balance: number | null
          balance: number | null
          created_at: string | null
          currency_code: string | null
          id: string | null
          institution_name: string | null
          is_active: boolean | null
          last_sync: string | null
          masked_account_number: string | null
          plaid_item_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          access_token?: never
          account_name?: string | null
          account_number?: never
          account_type?: string | null
          available_balance?: number | null
          balance?: number | null
          created_at?: string | null
          currency_code?: string | null
          id?: string | null
          institution_name?: string | null
          is_active?: boolean | null
          last_sync?: string | null
          masked_account_number?: never
          plaid_item_id?: never
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          access_token?: never
          account_name?: string | null
          account_number?: never
          account_type?: string | null
          available_balance?: number | null
          balance?: number | null
          created_at?: string | null
          currency_code?: string | null
          id?: string | null
          institution_name?: string | null
          is_active?: boolean | null
          last_sync?: string | null
          masked_account_number?: never
          plaid_item_id?: never
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      decrypt_banking_credential: {
        Args: { encrypted_text: string }
        Returns: string
      }
      encrypt_banking_credential: {
        Args: { plain_text: string }
        Returns: string
      }
      insert_secure_bank_account: {
        Args: {
          p_access_token?: string
          p_account_name?: string
          p_account_number?: string
          p_account_type?: string
          p_available_balance?: number
          p_balance?: number
          p_currency_code?: string
          p_institution_name?: string
          p_plaid_item_id?: string
        }
        Returns: string
      }
      insert_secure_credit_card: {
        Args: {
          p_access_token?: string
          p_account_name?: string
          p_account_number?: string
          p_account_type?: string
          p_annual_fee?: number
          p_available_credit?: number
          p_balance?: number
          p_credit_limit?: number
          p_currency_code?: string
          p_institution_name?: string
          p_interest_rate?: number
          p_minimum_payment?: number
          p_payment_due_date?: string
          p_plaid_account_id?: string
          p_plaid_item_id?: string
          p_statement_close_date?: string
        }
        Returns: string
      }
      update_secure_bank_account: {
        Args: {
          p_access_token?: string
          p_account_id: string
          p_account_name?: string
          p_account_number?: string
          p_account_type?: string
          p_available_balance?: number
          p_balance?: number
          p_currency_code?: string
          p_institution_name?: string
          p_plaid_item_id?: string
        }
        Returns: boolean
      }
      update_secure_credit_card: {
        Args: {
          p_access_token?: string
          p_account_name?: string
          p_account_number?: string
          p_account_type?: string
          p_annual_fee?: number
          p_available_credit?: number
          p_balance?: number
          p_card_id: string
          p_credit_limit?: number
          p_currency_code?: string
          p_institution_name?: string
          p_interest_rate?: number
          p_minimum_payment?: number
          p_payment_due_date?: string
          p_plaid_account_id?: string
          p_plaid_item_id?: string
          p_statement_close_date?: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
