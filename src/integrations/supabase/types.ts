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
      amazon_accounts: {
        Row: {
          account_name: string
          created_at: string
          encrypted_access_token: string | null
          encrypted_client_id: string | null
          encrypted_client_secret: string | null
          encrypted_refresh_token: string | null
          id: string
          is_active: boolean
          last_sync: string | null
          marketplace_id: string
          marketplace_name: string
          seller_id: string
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name: string
          created_at?: string
          encrypted_access_token?: string | null
          encrypted_client_id?: string | null
          encrypted_client_secret?: string | null
          encrypted_refresh_token?: string | null
          id?: string
          is_active?: boolean
          last_sync?: string | null
          marketplace_id: string
          marketplace_name: string
          seller_id: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string
          created_at?: string
          encrypted_access_token?: string | null
          encrypted_client_id?: string | null
          encrypted_client_secret?: string | null
          encrypted_refresh_token?: string | null
          id?: string
          is_active?: boolean
          last_sync?: string | null
          marketplace_id?: string
          marketplace_name?: string
          seller_id?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      amazon_payouts: {
        Row: {
          amazon_account_id: string
          created_at: string
          currency_code: string
          fees_total: number | null
          id: string
          marketplace_name: string
          orders_total: number | null
          other_total: number | null
          payout_date: string
          payout_type: string
          raw_settlement_data: Json | null
          refunds_total: number | null
          settlement_id: string
          status: string
          total_amount: number
          transaction_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amazon_account_id: string
          created_at?: string
          currency_code?: string
          fees_total?: number | null
          id?: string
          marketplace_name: string
          orders_total?: number | null
          other_total?: number | null
          payout_date: string
          payout_type?: string
          raw_settlement_data?: Json | null
          refunds_total?: number | null
          settlement_id: string
          status?: string
          total_amount?: number
          transaction_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amazon_account_id?: string
          created_at?: string
          currency_code?: string
          fees_total?: number | null
          id?: string
          marketplace_name?: string
          orders_total?: number | null
          other_total?: number | null
          payout_date?: string
          payout_type?: string
          raw_settlement_data?: Json | null
          refunds_total?: number | null
          settlement_id?: string
          status?: string
          total_amount?: number
          transaction_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "amazon_payouts_amazon_account_id_fkey"
            columns: ["amazon_account_id"]
            isOneToOne: false
            referencedRelation: "amazon_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      amazon_transactions: {
        Row: {
          amazon_account_id: string
          amount: number
          created_at: string
          currency_code: string
          description: string | null
          fee_description: string | null
          fee_type: string | null
          id: string
          marketplace_name: string | null
          order_id: string | null
          raw_data: Json | null
          settlement_id: string | null
          sku: string | null
          transaction_date: string
          transaction_id: string
          transaction_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amazon_account_id: string
          amount?: number
          created_at?: string
          currency_code?: string
          description?: string | null
          fee_description?: string | null
          fee_type?: string | null
          id?: string
          marketplace_name?: string | null
          order_id?: string | null
          raw_data?: Json | null
          settlement_id?: string | null
          sku?: string | null
          transaction_date: string
          transaction_id: string
          transaction_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amazon_account_id?: string
          amount?: number
          created_at?: string
          currency_code?: string
          description?: string | null
          fee_description?: string | null
          fee_type?: string | null
          id?: string
          marketplace_name?: string | null
          order_id?: string | null
          raw_data?: Json | null
          settlement_id?: string | null
          sku?: string | null
          transaction_date?: string
          transaction_id?: string
          transaction_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "amazon_transactions_amazon_account_id_fkey"
            columns: ["amazon_account_id"]
            isOneToOne: false
            referencedRelation: "amazon_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
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
          plaid_account_id: string | null
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
          plaid_account_id?: string | null
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
          plaid_account_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bank_transactions: {
        Row: {
          amount: number
          bank_account_id: string
          category: string[] | null
          created_at: string
          currency_code: string | null
          date: string
          id: string
          merchant_name: string | null
          name: string
          payment_channel: string | null
          pending: boolean
          plaid_transaction_id: string
          raw_data: Json | null
          transaction_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          bank_account_id: string
          category?: string[] | null
          created_at?: string
          currency_code?: string | null
          date: string
          id?: string
          merchant_name?: string | null
          name: string
          payment_channel?: string | null
          pending?: boolean
          plaid_transaction_id: string
          raw_data?: Json | null
          transaction_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          bank_account_id?: string
          category?: string[] | null
          created_at?: string
          currency_code?: string | null
          date?: string
          id?: string
          merchant_name?: string | null
          name?: string
          payment_channel?: string | null
          pending?: boolean
          plaid_transaction_id?: string
          raw_data?: Json | null
          transaction_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
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
      cash_flow_insights: {
        Row: {
          advice: string
          created_at: string
          current_balance: number | null
          daily_inflow: number | null
          daily_outflow: number | null
          id: string
          insight_date: string
          upcoming_expenses: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          advice: string
          created_at?: string
          current_balance?: number | null
          daily_inflow?: number | null
          daily_outflow?: number | null
          id?: string
          insight_date: string
          upcoming_expenses?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          advice?: string
          created_at?: string
          current_balance?: number | null
          daily_inflow?: number | null
          daily_outflow?: number | null
          id?: string
          insight_date?: string
          upcoming_expenses?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_cards: {
        Row: {
          account_name: string
          account_type: string
          annual_fee: number | null
          available_credit: number
          balance: number
          cash_back: number | null
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
          nickname: string | null
          payment_due_date: string | null
          plaid_account_id: string | null
          priority: number | null
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
          cash_back?: number | null
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
          nickname?: string | null
          payment_due_date?: string | null
          plaid_account_id?: string | null
          priority?: number | null
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
          cash_back?: number | null
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
          nickname?: string | null
          payment_due_date?: string | null
          plaid_account_id?: string | null
          priority?: number | null
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
      deleted_transactions: {
        Row: {
          amount: number
          category: string | null
          deleted_at: string
          description: string | null
          id: string
          metadata: Json | null
          name: string
          original_id: string
          payment_date: string | null
          status: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          deleted_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          name: string
          original_id: string
          payment_date?: string | null
          status?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          deleted_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          original_id?: string
          payment_date?: string | null
          status?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      income: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          customer_id: string | null
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
          customer_id?: string | null
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
          customer_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "income_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
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
      [_ in never]: never
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
      insert_secure_amazon_account: {
        Args: {
          p_access_token?: string
          p_account_name: string
          p_client_id?: string
          p_client_secret?: string
          p_marketplace_id: string
          p_marketplace_name: string
          p_refresh_token?: string
          p_seller_id: string
        }
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
          p_plaid_account_id?: string
          p_plaid_item_id?: string
        }
        Returns: string
      }
      insert_secure_bank_account_simple: {
        Args: {
          p_access_token: string
          p_account_name: string
          p_account_number: string
          p_account_type: string
          p_available_balance: number
          p_balance: number
          p_currency_code: string
          p_institution_name: string
          p_plaid_account_id: string
          p_plaid_item_id: string
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
      insert_secure_credit_card_simple: {
        Args:
          | {
              p_access_token: string
              p_account_name: string
              p_account_number: string
              p_account_type: string
              p_annual_fee: number
              p_available_credit: number
              p_balance: number
              p_cash_back?: number
              p_credit_limit: number
              p_currency_code: string
              p_institution_name: string
              p_minimum_payment: number
              p_payment_due_date: string
              p_plaid_account_id: string
              p_plaid_item_id: string
              p_priority?: number
              p_statement_close_date: string
            }
          | {
              p_access_token: string
              p_account_name: string
              p_account_number: string
              p_account_type: string
              p_annual_fee: number
              p_available_credit: number
              p_balance: number
              p_credit_limit: number
              p_currency_code: string
              p_institution_name: string
              p_interest_rate: number
              p_minimum_payment: number
              p_payment_due_date: string
              p_plaid_account_id: string
              p_plaid_item_id: string
              p_statement_close_date: string
            }
        Returns: string
      }
      update_secure_amazon_account: {
        Args: {
          p_access_token?: string
          p_account_id: string
          p_account_name?: string
          p_client_id?: string
          p_client_secret?: string
          p_refresh_token?: string
          p_token_expires_at?: string
        }
        Returns: boolean
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
        Args:
          | {
              p_access_token?: string
              p_account_name?: string
              p_account_number?: string
              p_account_type?: string
              p_annual_fee?: number
              p_available_credit?: number
              p_balance?: number
              p_card_id: string
              p_cash_back?: number
              p_credit_limit?: number
              p_currency_code?: string
              p_institution_name?: string
              p_minimum_payment?: number
              p_payment_due_date?: string
              p_plaid_account_id?: string
              p_plaid_item_id?: string
              p_priority?: number
              p_statement_close_date?: string
            }
          | {
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
