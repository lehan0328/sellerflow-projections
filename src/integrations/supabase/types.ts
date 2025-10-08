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
      affiliate_payouts: {
        Row: {
          affiliate_id: string
          amount: number
          created_at: string
          id: string
          paid_at: string | null
          payment_email: string | null
          payment_method: string
          payment_status: string
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          amount: number
          created_at?: string
          id?: string
          paid_at?: string | null
          payment_email?: string | null
          payment_method: string
          payment_status?: string
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          amount?: number
          created_at?: string
          id?: string
          paid_at?: string | null
          payment_email?: string | null
          payment_method?: string
          payment_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_payouts_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_referrals: {
        Row: {
          affiliate_code: string
          affiliate_id: string
          commission_amount: number | null
          commission_paid: boolean | null
          converted_at: string | null
          created_at: string
          id: string
          last_commission_date: string | null
          referred_user_id: string
          status: string
          subscription_amount: number | null
          updated_at: string
        }
        Insert: {
          affiliate_code: string
          affiliate_id: string
          commission_amount?: number | null
          commission_paid?: boolean | null
          converted_at?: string | null
          created_at?: string
          id?: string
          last_commission_date?: string | null
          referred_user_id: string
          status?: string
          subscription_amount?: number | null
          updated_at?: string
        }
        Update: {
          affiliate_code?: string
          affiliate_id?: string
          commission_amount?: number | null
          commission_paid?: boolean | null
          converted_at?: string | null
          created_at?: string
          id?: string
          last_commission_date?: string | null
          referred_user_id?: string
          status?: string
          subscription_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_referrals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          affiliate_code: string
          approved_at: string | null
          audience_description: string | null
          commission_rate: number
          company_name: string | null
          created_at: string
          id: string
          monthly_referrals: number | null
          pending_commission: number | null
          promotional_methods: string | null
          status: string
          tier: string
          total_commission_earned: number | null
          total_referrals: number | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          affiliate_code: string
          approved_at?: string | null
          audience_description?: string | null
          commission_rate?: number
          company_name?: string | null
          created_at?: string
          id?: string
          monthly_referrals?: number | null
          pending_commission?: number | null
          promotional_methods?: string | null
          status?: string
          tier?: string
          total_commission_earned?: number | null
          total_referrals?: number | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          affiliate_code?: string
          approved_at?: string | null
          audience_description?: string | null
          commission_rate?: number
          company_name?: string | null
          created_at?: string
          id?: string
          monthly_referrals?: number | null
          pending_commission?: number | null
          promotional_methods?: string | null
          status?: string
          tier?: string
          total_commission_earned?: number | null
          total_referrals?: number | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
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
          statement_balance: number | null
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
          statement_balance?: number | null
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
          statement_balance?: number | null
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
      password_reset_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          token: string
          used: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          token: string
          used?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          token?: string
          used?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_id: string | null
          amazon_marketplaces: string[] | null
          company: string | null
          created_at: string
          currency: string | null
          discount_redeemed_at: string | null
          email: string | null
          first_name: string | null
          id: string
          is_account_owner: boolean
          is_admin: boolean
          last_name: string | null
          max_team_members: number
          monthly_revenue: string | null
          plan_override: string | null
          plan_override_reason: string | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amazon_marketplaces?: string[] | null
          company?: string | null
          created_at?: string
          currency?: string | null
          discount_redeemed_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_account_owner?: boolean
          is_admin?: boolean
          last_name?: string | null
          max_team_members?: number
          monthly_revenue?: string | null
          plan_override?: string | null
          plan_override_reason?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amazon_marketplaces?: string[] | null
          company?: string | null
          created_at?: string
          currency?: string | null
          discount_redeemed_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_account_owner?: boolean
          is_admin?: boolean
          last_name?: string | null
          max_team_members?: number
          monthly_revenue?: string | null
          plan_override?: string | null
          plan_override_reason?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recurring_expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          end_date: string | null
          frequency: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          start_date: string
          transaction_name: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string | null
          created_at?: string
          end_date?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          start_date?: string
          transaction_name?: string | null
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          end_date?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          start_date?: string
          transaction_name?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_rewards: {
        Row: {
          annual_reset_date: string | null
          cash_bonus: number | null
          created_at: string
          discount_end_date: string | null
          discount_percentage: number | null
          discount_start_date: string | null
          id: string
          last_ticket_tier: number | null
          pending_cash_bonus: number | null
          referral_count: number
          reward_status: string
          tier_level: number
          total_cash_earned: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          annual_reset_date?: string | null
          cash_bonus?: number | null
          created_at?: string
          discount_end_date?: string | null
          discount_percentage?: number | null
          discount_start_date?: string | null
          id?: string
          last_ticket_tier?: number | null
          pending_cash_bonus?: number | null
          referral_count?: number
          reward_status?: string
          tier_level?: number
          total_cash_earned?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          annual_reset_date?: string | null
          cash_bonus?: number | null
          created_at?: string
          discount_end_date?: string | null
          discount_percentage?: number | null
          discount_start_date?: string | null
          id?: string
          last_ticket_tier?: number | null
          pending_cash_bonus?: number | null
          referral_count?: number
          reward_status?: string
          tier_level?: number
          total_cash_earned?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          converted_at: string | null
          created_at: string
          id: string
          referral_code: string
          referred_user_discount_applied: boolean | null
          referred_user_id: string
          referrer_id: string
          status: string
          updated_at: string
        }
        Insert: {
          converted_at?: string | null
          created_at?: string
          id?: string
          referral_code: string
          referred_user_discount_applied?: boolean | null
          referred_user_id: string
          referrer_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          converted_at?: string | null
          created_at?: string
          id?: string
          referral_code?: string
          referred_user_discount_applied?: boolean | null
          referred_user_id?: string
          referrer_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      scenarios: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          scenario_data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          scenario_data?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          scenario_data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string
          id: string
          message: string
          priority: string
          resolution_notes: string | null
          resolved_at: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          id?: string
          message: string
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          id?: string
          message?: string
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          account_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          account_id: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Update: {
          accepted_at?: string | null
          account_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          created_at: string
          id: string
          is_internal: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_internal?: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_internal?: boolean
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          customer_id: string | null
          description: string | null
          due_date: string | null
          id: string
          remarks: string | null
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
          remarks?: string | null
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
          remarks?: string | null
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
      trial_addon_usage: {
        Row: {
          addon_type: string
          created_at: string
          id: string
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          addon_type: string
          created_at?: string
          id?: string
          quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          addon_type?: string
          created_at?: string
          id?: string
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          account_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          id: string
          safe_spending_percentage: number | null
          safe_spending_reserve: number | null
          total_cash: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          safe_spending_percentage?: number | null
          safe_spending_reserve?: number | null
          total_cash?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          safe_spending_percentage?: number | null
          safe_spending_reserve?: number | null
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
          remarks: string | null
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
          remarks?: string | null
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
          remarks?: string | null
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
      cleanup_expired_reset_tokens: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      decrypt_banking_credential: {
        Args: { encrypted_text: string }
        Returns: string
      }
      encrypt_banking_credential: {
        Args: { plain_text: string }
        Returns: string
      }
      get_user_account_id: {
        Args: { _user_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _account_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
        Args: {
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
        Returns: string
      }
      is_account_admin: {
        Args: { _account_id: string; _user_id: string }
        Returns: boolean
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
      app_role: "owner" | "admin" | "staff"
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
      app_role: ["owner", "admin", "staff"],
    },
  },
} as const
