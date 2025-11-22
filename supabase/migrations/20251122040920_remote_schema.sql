create extension if not exists "pg_cron" with schema "pg_catalog";

drop extension if exists "pg_net";

create extension if not exists "pg_net" with schema "public";

create type "public"."app_role" as enum ('owner', 'admin', 'staff');

create sequence "public"."support_tickets_ticket_number_seq";


  create table "public"."account_modification_audit" (
    "id" uuid not null default gen_random_uuid(),
    "table_name" text not null,
    "record_id" uuid not null,
    "old_account_id" uuid,
    "new_account_id" uuid,
    "modified_by" uuid,
    "modified_at" timestamp with time zone default now()
      );


alter table "public"."account_modification_audit" enable row level security;


  create table "public"."admin_permissions" (
    "id" uuid not null default gen_random_uuid(),
    "email" text not null,
    "role" text not null,
    "invited_by" text,
    "invited_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "invitation_token" text,
    "token_expires_at" timestamp with time zone,
    "account_created" boolean default false,
    "first_name" text
      );


alter table "public"."admin_permissions" enable row level security;


  create table "public"."affiliate_payouts" (
    "id" uuid not null default gen_random_uuid(),
    "affiliate_id" uuid not null,
    "amount" numeric not null,
    "payment_method" text not null,
    "payment_email" text,
    "payment_status" text not null default 'pending'::text,
    "paid_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."affiliate_payouts" enable row level security;


  create table "public"."affiliate_referrals" (
    "id" uuid not null default gen_random_uuid(),
    "affiliate_id" uuid not null,
    "referred_user_id" uuid not null,
    "affiliate_code" text not null,
    "status" text not null default 'trial'::text,
    "subscription_amount" numeric default 0,
    "commission_amount" numeric default 0,
    "commission_paid" boolean default false,
    "converted_at" timestamp with time zone,
    "last_commission_date" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."affiliate_referrals" enable row level security;


  create table "public"."affiliates" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "affiliate_code" text not null,
    "status" text not null default 'pending'::text,
    "tier" text not null default 'starter'::text,
    "commission_rate" integer not null default 20,
    "total_referrals" integer default 0,
    "monthly_referrals" integer default 0,
    "total_commission_earned" numeric default 0,
    "pending_commission" numeric default 0,
    "company_name" text,
    "website" text,
    "audience_description" text,
    "promotional_methods" text,
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "follower_count" integer,
    "trial_referrals" integer default 0,
    "paid_referrals" integer default 0,
    "churned_referrals" integer default 0
      );


alter table "public"."affiliates" enable row level security;


  create table "public"."amazon_accounts" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "seller_id" text not null,
    "marketplace_id" text not null,
    "marketplace_name" text not null,
    "account_name" text not null,
    "encrypted_refresh_token" text,
    "encrypted_access_token" text,
    "encrypted_client_id" text,
    "encrypted_client_secret" text,
    "token_expires_at" timestamp with time zone,
    "last_sync" timestamp with time zone default now(),
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "payout_frequency" text not null default 'bi-weekly'::text,
    "account_id" uuid,
    "payout_model" text not null default 'bi-weekly'::text,
    "reserve_lag_days" integer not null default 7,
    "reserve_multiplier" numeric not null default 1.0,
    "uses_daily_payouts" boolean default false,
    "initial_sync_complete" boolean default false,
    "transaction_count" integer default 0,
    "sync_status" text default 'idle'::text,
    "sync_progress" integer default 0,
    "sync_message" text,
    "last_sync_error" text,
    "oldest_transaction_date" timestamp with time zone,
    "backfill_complete" boolean default false,
    "backfill_target_date" timestamp with time zone,
    "last_synced_to" timestamp with time zone,
    "sync_next_token" text,
    "rate_limited_until" timestamp with time zone,
    "sync_window_start" timestamp with time zone,
    "sync_window_end" timestamp with time zone,
    "last_settlement_sync_date" timestamp with time zone,
    "sync_notifications_enabled" boolean default false,
    "bulk_transaction_sync_complete" boolean default false,
    "last_report_sync" timestamp with time zone
      );


alter table "public"."amazon_accounts" enable row level security;


  create table "public"."amazon_connection_audit" (
    "id" uuid not null default gen_random_uuid(),
    "seller_id" text not null,
    "previous_user_id" uuid,
    "new_user_id" uuid,
    "action" text not null,
    "reason" text,
    "performed_by" uuid,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."amazon_connection_audit" enable row level security;


  create table "public"."amazon_daily_draws" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "account_id" uuid,
    "amazon_account_id" uuid not null,
    "settlement_id" text not null,
    "settlement_period_start" date not null,
    "settlement_period_end" date not null,
    "draw_date" date not null,
    "amount" numeric not null,
    "notes" text,
    "raw_data" jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."amazon_daily_draws" enable row level security;


  create table "public"."amazon_daily_rollups" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "account_id" uuid,
    "amazon_account_id" uuid not null,
    "rollup_date" date not null,
    "total_orders" integer default 0,
    "total_revenue" numeric default 0,
    "total_fees" numeric default 0,
    "total_refunds" numeric default 0,
    "total_net" numeric default 0,
    "order_count" integer default 0,
    "refund_count" integer default 0,
    "adjustment_count" integer default 0,
    "fee_count" integer default 0,
    "currency_code" text not null default 'USD'::text,
    "marketplace_name" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."amazon_daily_rollups" enable row level security;


  create table "public"."amazon_payouts" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "amazon_account_id" uuid not null,
    "settlement_id" text not null,
    "payout_date" date not null,
    "total_amount" numeric not null default 0,
    "currency_code" text not null default 'USD'::text,
    "status" text not null default 'estimated'::text,
    "payout_type" text not null default 'bi-weekly'::text,
    "marketplace_name" text not null,
    "transaction_count" integer default 0,
    "fees_total" numeric default 0,
    "orders_total" numeric default 0,
    "refunds_total" numeric default 0,
    "other_total" numeric default 0,
    "raw_settlement_data" jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "account_id" uuid,
    "original_forecast_amount" numeric,
    "forecast_replaced_at" timestamp with time zone,
    "forecast_accuracy_percentage" numeric,
    "eligible_in_period" numeric,
    "reserve_amount" numeric,
    "adjustments" numeric default 0,
    "modeling_method" text,
    "total_daily_draws" numeric default 0,
    "available_for_daily_transfer" numeric default 0,
    "last_draw_calculation_date" date
      );


alter table "public"."amazon_payouts" enable row level security;


  create table "public"."amazon_sync_logs" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "account_id" uuid,
    "sync_type" text not null,
    "sync_status" text not null,
    "transactions_synced" integer default 0,
    "payouts_synced" integer default 0,
    "error_message" text,
    "sync_duration_ms" integer,
    "started_at" timestamp with time zone not null default now(),
    "completed_at" timestamp with time zone,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."amazon_sync_logs" enable row level security;


  create table "public"."amazon_transactions" (
    "id" uuid not null default gen_random_uuid(),
    "amazon_account_id" uuid not null,
    "user_id" uuid not null,
    "account_id" uuid,
    "transaction_id" text not null,
    "transaction_type" text not null,
    "transaction_date" timestamp with time zone not null,
    "delivery_date" timestamp with time zone,
    "amount" numeric not null default 0,
    "description" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."amazon_transactions" enable row level security;


  create table "public"."audit_logs" (
    "id" uuid not null default gen_random_uuid(),
    "table_name" text not null,
    "operation" text not null,
    "user_id" uuid,
    "record_id" uuid,
    "metadata" jsonb,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."audit_logs" enable row level security;


  create table "public"."bank_accounts" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "institution_name" text not null,
    "account_name" text not null,
    "account_type" text not null,
    "balance" numeric not null default 0,
    "available_balance" numeric,
    "currency_code" text default 'USD'::text,
    "last_sync" timestamp with time zone not null default now(),
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "encrypted_access_token" text,
    "encrypted_account_number" text,
    "encrypted_plaid_item_id" text,
    "plaid_account_id" text,
    "account_id" uuid,
    "initial_balance" numeric(12,2),
    "initial_balance_date" timestamp with time zone
      );


alter table "public"."bank_accounts" enable row level security;


  create table "public"."bank_sync_logs" (
    "id" uuid not null default gen_random_uuid(),
    "sync_time" timestamp with time zone not null default now(),
    "accounts_synced" integer not null default 0,
    "total_accounts" integer not null default 0,
    "total_transactions" integer not null default 0,
    "success" boolean not null default true,
    "error_message" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."bank_sync_logs" enable row level security;


  create table "public"."bank_transactions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "bank_account_id" uuid,
    "plaid_transaction_id" text not null,
    "amount" numeric not null,
    "date" date not null,
    "name" text not null,
    "merchant_name" text,
    "category" text[],
    "pending" boolean not null default false,
    "payment_channel" text,
    "transaction_type" text,
    "currency_code" text default 'USD'::text,
    "raw_data" jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "matched_transaction_id" uuid,
    "matched_type" text,
    "account_id" uuid,
    "credit_card_id" uuid,
    "archived" boolean not null default false
      );


alter table "public"."bank_transactions" enable row level security;


  create table "public"."cash_flow_events" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "type" text not null,
    "amount" numeric(10,2) not null,
    "description" text,
    "vendor_id" uuid,
    "customer_id" uuid,
    "event_date" date not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "account_id" uuid
      );


alter table "public"."cash_flow_events" enable row level security;


  create table "public"."cash_flow_insights" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "insight_date" date not null,
    "advice" text not null,
    "current_balance" numeric,
    "daily_inflow" numeric,
    "daily_outflow" numeric,
    "upcoming_expenses" numeric,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "account_id" uuid
      );


alter table "public"."cash_flow_insights" enable row level security;


  create table "public"."categories" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "account_id" uuid,
    "name" text not null,
    "type" text not null,
    "is_default" boolean default false,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "is_recurring" boolean default false
      );


alter table "public"."categories" enable row level security;


  create table "public"."credit_card_payments" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "account_id" uuid not null,
    "credit_card_id" uuid not null,
    "bank_account_id" uuid not null,
    "amount" numeric not null,
    "payment_date" date not null,
    "description" text,
    "payment_type" text not null,
    "status" text not null default 'scheduled'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "was_paid" boolean default true
      );


alter table "public"."credit_card_payments" enable row level security;


  create table "public"."credit_cards" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "institution_name" text not null,
    "account_name" text not null,
    "account_type" text not null default 'credit'::text,
    "masked_account_number" text,
    "balance" numeric not null default 0,
    "credit_limit" numeric not null default 0,
    "available_credit" numeric not null default 0,
    "currency_code" text not null default 'USD'::text,
    "encrypted_access_token" text,
    "encrypted_account_number" text,
    "encrypted_plaid_item_id" text,
    "last_sync" timestamp with time zone not null default now(),
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "plaid_account_id" text,
    "minimum_payment" numeric default 0,
    "payment_due_date" date,
    "statement_close_date" date,
    "annual_fee" numeric default 0,
    "interest_rate" numeric default 0,
    "priority" integer default 3,
    "cash_back" numeric default 0,
    "nickname" text,
    "statement_balance" numeric default 0,
    "forecast_next_month" boolean default false,
    "pay_minimum" boolean default false,
    "account_id" uuid,
    "initial_balance" numeric(12,2),
    "initial_balance_date" timestamp with time zone,
    "credit_limit_override" numeric
      );


alter table "public"."credit_cards" enable row level security;


  create table "public"."custom_discount_codes" (
    "id" uuid not null default gen_random_uuid(),
    "code" text not null,
    "discount_percentage" integer not null,
    "duration_months" integer not null default 3,
    "is_active" boolean not null default true,
    "created_by" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."custom_discount_codes" enable row level security;


  create table "public"."customers" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "name" text not null,
    "payment_terms" text default 'immediate'::text,
    "net_terms_days" integer,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "account_id" uuid,
    "category" text
      );


alter table "public"."customers" enable row level security;


  create table "public"."deleted_transactions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "transaction_type" text not null,
    "original_id" uuid not null,
    "name" text not null,
    "amount" numeric not null,
    "description" text,
    "payment_date" date,
    "status" text,
    "category" text,
    "deleted_at" timestamp with time zone not null default now(),
    "metadata" jsonb
      );


alter table "public"."deleted_transactions" enable row level security;


  create table "public"."documents_metadata" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "file_name" text not null,
    "file_path" text not null,
    "customer_id" uuid,
    "vendor_id" uuid,
    "notes" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "display_name" text,
    "document_date" date,
    "amount" numeric,
    "description" text,
    "document_type" text,
    "account_id" uuid
      );


alter table "public"."documents_metadata" enable row level security;


  create table "public"."feature_requests" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "name" text not null,
    "email" text not null,
    "subject" text not null,
    "message" text not null,
    "priority" text not null,
    "category" text not null,
    "status" text not null default 'open'::text,
    "admin_notes" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."feature_requests" enable row level security;


  create table "public"."forecast_accuracy_log" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "account_id" uuid,
    "amazon_account_id" uuid,
    "payout_date" date not null,
    "forecasted_amount" numeric not null,
    "actual_amount" numeric not null,
    "difference_amount" numeric not null,
    "difference_percentage" numeric not null,
    "settlement_id" text not null,
    "marketplace_name" text,
    "user_email" text,
    "user_name" text,
    "monthly_revenue" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "modeling_method" text,
    "confidence_threshold" numeric,
    "settlement_close_date" date,
    "settlement_period_start" date,
    "settlement_period_end" date,
    "days_accumulated" integer default 1,
    "forecasted_amounts_by_day" jsonb
      );


alter table "public"."forecast_accuracy_log" enable row level security;


  create table "public"."income" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "description" text not null,
    "amount" numeric not null,
    "payment_date" date not null,
    "source" text not null default 'Manual Entry'::text,
    "status" text not null default 'pending'::text,
    "category" text,
    "is_recurring" boolean not null default false,
    "recurring_frequency" text,
    "notes" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "customer_id" uuid,
    "account_id" uuid,
    "archived" boolean not null default false
      );


alter table "public"."income" enable row level security;


  create table "public"."monthly_support_metrics" (
    "id" uuid not null default gen_random_uuid(),
    "month_year" text not null,
    "cases_opened" integer not null default 0,
    "cases_closed" integer not null default 0,
    "avg_resolution_days" numeric(10,2) default 0,
    "first_response_hours" numeric(10,2) default 0,
    "avg_response_hours" numeric(10,2) default 0,
    "sla_within_4_hours" integer default 0,
    "sla_within_24_hours" integer default 0,
    "response_time_by_priority" jsonb default '[]'::jsonb,
    "response_time_by_category" jsonb default '[]'::jsonb,
    "cases_by_category" jsonb default '[]'::jsonb,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."monthly_support_metrics" enable row level security;


  create table "public"."notification_history" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "notification_type" text not null,
    "title" text not null,
    "message" text not null,
    "category" text not null,
    "priority" text default 'medium'::text,
    "amount" numeric,
    "due_date" date,
    "read" boolean default false,
    "actionable" boolean default false,
    "action_label" text,
    "sent_at" timestamp with time zone not null default now(),
    "created_at" timestamp with time zone not null default now(),
    "account_id" uuid,
    "action_url" text
      );


alter table "public"."notification_history" enable row level security;


  create table "public"."notification_preferences" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "notification_type" text not null,
    "enabled" boolean not null default true,
    "schedule_time" time without time zone not null default '09:00:00'::time without time zone,
    "schedule_days" integer[] default ARRAY[1, 2, 3, 4, 5],
    "threshold_amount" numeric,
    "advance_days" integer default 3,
    "notification_channels" text[] default ARRAY['in_app'::text],
    "last_sent_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "account_id" uuid,
    "email_recipients" text[] default ARRAY[]::text[]
      );


alter table "public"."notification_preferences" enable row level security;


  create table "public"."password_reset_tokens" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "token" text not null,
    "expires_at" timestamp with time zone not null,
    "used" boolean default false,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."password_reset_tokens" enable row level security;


  create table "public"."payees" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "account_id" uuid,
    "name" text not null,
    "category" text,
    "payment_method" text,
    "notes" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."payees" enable row level security;


  create table "public"."plan_limits" (
    "id" uuid not null default gen_random_uuid(),
    "plan_name" text not null,
    "bank_connections" integer not null,
    "amazon_connections" integer not null,
    "team_members" integer not null,
    "has_ai_insights" boolean default false,
    "has_ai_pdf_extractor" boolean default false,
    "has_automated_notifications" boolean default false,
    "has_scenario_planning" boolean default false,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."plan_limits" enable row level security;


  create table "public"."plan_override_audit" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "user_email" text not null,
    "changed_by" uuid not null,
    "changed_by_email" text not null,
    "old_plan_tier" text,
    "new_plan_tier" text not null,
    "old_max_bank_connections" integer,
    "new_max_bank_connections" integer,
    "old_max_team_members" integer,
    "new_max_team_members" integer,
    "reason" text not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."plan_override_audit" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "first_name" text,
    "last_name" text,
    "company" text,
    "monthly_revenue" text,
    "amazon_marketplaces" text[],
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "plan_override" text,
    "plan_override_reason" text,
    "discount_redeemed_at" timestamp with time zone,
    "currency" text default 'USD'::text,
    "trial_start" timestamp with time zone,
    "trial_end" timestamp with time zone,
    "account_id" uuid default gen_random_uuid(),
    "is_account_owner" boolean not null default true,
    "max_team_members" integer,
    "account_status" text not null default 'active'::text,
    "payment_failure_date" timestamp with time zone,
    "stripe_customer_id" text,
    "churn_date" timestamp with time zone,
    "last_amazon_connection" timestamp with time zone,
    "forecast_settings" jsonb,
    "monthly_amazon_revenue" text,
    "email" text,
    "referral_code" text,
    "hear_about_us" text,
    "my_referral_code" text,
    "plan_tier" text default 'starter'::text,
    "max_bank_connections" integer,
    "theme_preference" text default 'system'::text
      );


alter table "public"."profiles" enable row level security;


  create table "public"."purchase_order_line_items" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "account_id" uuid,
    "document_id" uuid,
    "vendor_id" uuid,
    "sku" text,
    "product_name" text not null,
    "quantity" numeric default 1,
    "unit_price" numeric default 0,
    "total_price" numeric generated always as ((quantity * unit_price)) stored,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "description" text
      );


alter table "public"."purchase_order_line_items" enable row level security;


  create table "public"."purchased_addons" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "account_id" uuid,
    "addon_type" text not null,
    "quantity" integer not null default 1,
    "price_paid" numeric not null,
    "currency" text not null default 'USD'::text,
    "stripe_payment_intent_id" text,
    "stripe_charge_id" text,
    "purchased_at" timestamp with time zone not null default now(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."purchased_addons" enable row level security;


  create table "public"."recurring_expense_exceptions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "account_id" uuid,
    "recurring_expense_id" uuid not null,
    "exception_date" date not null,
    "reason" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."recurring_expense_exceptions" enable row level security;


  create table "public"."recurring_expenses" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "name" text not null,
    "amount" numeric not null default 0,
    "frequency" text not null default 'monthly'::text,
    "start_date" date not null default CURRENT_DATE,
    "end_date" date,
    "is_active" boolean not null default true,
    "category" text,
    "notes" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "transaction_name" text,
    "type" text not null default 'expense'::text,
    "account_id" uuid,
    "credit_card_id" uuid
      );


alter table "public"."recurring_expenses" enable row level security;


  create table "public"."referral_codes" (
    "id" uuid not null default gen_random_uuid(),
    "code" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "code_type" text,
    "owner_id" uuid,
    "discount_percentage" integer not null default 10,
    "duration_months" integer not null default 3,
    "is_active" boolean not null default true,
    "max_uses" integer,
    "current_uses" integer not null default 0,
    "last_used_at" timestamp with time zone
      );


alter table "public"."referral_codes" enable row level security;


  create table "public"."referral_rewards" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "referral_count" integer not null default 0,
    "tier_level" integer not null default 0,
    "discount_percentage" integer default 0,
    "cash_bonus" numeric default 0,
    "total_cash_earned" numeric default 0,
    "reward_status" text not null default 'pending'::text,
    "discount_start_date" timestamp with time zone,
    "discount_end_date" timestamp with time zone,
    "annual_reset_date" timestamp with time zone default (now() + '1 year'::interval),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "pending_cash_bonus" numeric default 0,
    "last_ticket_tier" integer default 0
      );


alter table "public"."referral_rewards" enable row level security;


  create table "public"."referrals" (
    "id" uuid not null default gen_random_uuid(),
    "referrer_id" uuid not null,
    "referred_user_id" uuid not null,
    "referral_code" text not null,
    "status" text not null default 'trial'::text,
    "converted_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "referred_user_discount_applied" boolean default false
      );


alter table "public"."referrals" enable row level security;


  create table "public"."scenarios" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "name" text not null,
    "description" text,
    "scenario_data" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "account_id" uuid
      );


alter table "public"."scenarios" enable row level security;


  create table "public"."stripe_customer_audit_log" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "action" text not null,
    "old_customer_id" text,
    "new_customer_id" text,
    "performed_by" uuid,
    "reason" text,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default now(),
    "credit_cards" integer default 0
      );


alter table "public"."stripe_customer_audit_log" enable row level security;


  create table "public"."support_tickets" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "subject" text not null,
    "message" text not null,
    "status" text not null default 'needs_response'::text,
    "priority" text not null default 'medium'::text,
    "category" text,
    "assigned_to" uuid,
    "resolution_notes" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "resolved_at" timestamp with time zone,
    "admin_last_viewed_at" timestamp with time zone,
    "customer_last_viewed_at" timestamp with time zone,
    "claimed_by" uuid,
    "claimed_at" timestamp with time zone,
    "ticket_number" integer not null default nextval('public.support_tickets_ticket_number_seq'::regclass)
      );


alter table "public"."support_tickets" enable row level security;


  create table "public"."team_invitations" (
    "id" uuid not null default gen_random_uuid(),
    "account_id" uuid not null,
    "email" text not null,
    "role" public.app_role not null default 'staff'::public.app_role,
    "token" text not null,
    "invited_by" uuid not null,
    "expires_at" timestamp with time zone not null,
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."team_invitations" enable row level security;


  create table "public"."ticket_feedback" (
    "id" uuid not null default gen_random_uuid(),
    "ticket_id" uuid not null,
    "user_id" uuid not null,
    "staff_id" uuid not null,
    "rating" integer not null,
    "comment" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."ticket_feedback" enable row level security;


  create table "public"."ticket_messages" (
    "id" uuid not null default gen_random_uuid(),
    "ticket_id" uuid not null,
    "user_id" uuid not null,
    "message" text not null,
    "is_internal" boolean not null default false,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."ticket_messages" enable row level security;


  create table "public"."transactions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "type" text not null,
    "amount" numeric(10,2) not null,
    "description" text,
    "vendor_id" uuid,
    "customer_id" uuid,
    "transaction_date" date not null default CURRENT_DATE,
    "due_date" date,
    "status" text default 'pending'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "remarks" text default 'Ordered'::text,
    "credit_card_id" uuid,
    "account_id" uuid,
    "category" text,
    "archived" boolean not null default false
      );


alter table "public"."transactions" enable row level security;


  create table "public"."trial_addon_usage" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "addon_type" text not null,
    "quantity" integer not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."trial_addon_usage" enable row level security;


  create table "public"."user_roles" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "account_id" uuid,
    "role" public.app_role not null default 'staff'::public.app_role,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."user_roles" enable row level security;


  create table "public"."user_settings" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "total_cash" numeric(10,2) default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "safe_spending_percentage" integer default 20,
    "safe_spending_reserve" numeric default 0,
    "last_forecast_refresh" timestamp with time zone,
    "chart_show_cashflow_line" boolean default true,
    "chart_show_resources_line" boolean default true,
    "chart_show_credit_line" boolean default true,
    "chart_show_reserve_line" boolean default true,
    "chart_cashflow_color" text default 'hsl(221, 83%, 53%)'::text,
    "chart_resources_color" text default '#10b981'::text,
    "chart_credit_color" text default '#f59e0b'::text,
    "chart_reserve_color" text default '#ef4444'::text,
    "chart_show_forecast_line" boolean default true,
    "chart_forecast_color" text default '#a855f7'::text,
    "account_id" uuid,
    "reserve_last_updated_at" timestamp with time zone default now(),
    "forecast_confidence_threshold" integer default 8,
    "forecasts_enabled" boolean default false,
    "forecasts_disabled_at" timestamp with time zone,
    "advanced_modeling_enabled" boolean default false,
    "advanced_modeling_notified" boolean default false,
    "default_reserve_lag_days" integer default 7,
    "min_reserve_floor" numeric default 1000,
    "chart_show_lowest_balance_line" boolean default true,
    "chart_lowest_balance_color" text default '#ef4444'::text,
    "welcome_animation_shown" boolean default false
      );


alter table "public"."user_settings" enable row level security;


  create table "public"."vendors" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "name" text not null,
    "total_owed" numeric(10,2) default 0,
    "next_payment_date" date,
    "next_payment_amount" numeric(10,2) default 0,
    "status" text default 'upcoming'::text,
    "category" text,
    "payment_type" text default 'total'::text,
    "net_terms_days" integer,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "po_name" text,
    "description" text,
    "notes" text,
    "payment_schedule" jsonb,
    "source" text default 'management'::text,
    "remarks" text,
    "account_id" uuid,
    "payment_method" text default 'bank-transfer'::text
      );


alter table "public"."vendors" enable row level security;

alter sequence "public"."support_tickets_ticket_number_seq" owned by "public"."support_tickets"."ticket_number";

CREATE UNIQUE INDEX account_modification_audit_pkey ON public.account_modification_audit USING btree (id);

CREATE UNIQUE INDEX admin_permissions_email_key ON public.admin_permissions USING btree (email);

CREATE UNIQUE INDEX admin_permissions_pkey ON public.admin_permissions USING btree (id);

CREATE UNIQUE INDEX affiliate_payouts_pkey ON public.affiliate_payouts USING btree (id);

CREATE UNIQUE INDEX affiliate_referrals_pkey ON public.affiliate_referrals USING btree (id);

CREATE UNIQUE INDEX affiliate_referrals_referred_user_id_key ON public.affiliate_referrals USING btree (referred_user_id);

CREATE UNIQUE INDEX affiliates_affiliate_code_key ON public.affiliates USING btree (affiliate_code);

CREATE UNIQUE INDEX affiliates_pkey ON public.affiliates USING btree (id);

CREATE UNIQUE INDEX affiliates_user_id_key ON public.affiliates USING btree (user_id);

CREATE UNIQUE INDEX amazon_accounts_pkey ON public.amazon_accounts USING btree (id);

CREATE UNIQUE INDEX amazon_connection_audit_pkey ON public.amazon_connection_audit USING btree (id);

CREATE UNIQUE INDEX amazon_daily_draws_pkey ON public.amazon_daily_draws USING btree (id);

CREATE UNIQUE INDEX amazon_daily_rollups_amazon_account_id_rollup_date_key ON public.amazon_daily_rollups USING btree (amazon_account_id, rollup_date);

CREATE UNIQUE INDEX amazon_daily_rollups_pkey ON public.amazon_daily_rollups USING btree (id);

CREATE UNIQUE INDEX amazon_payouts_amazon_account_id_settlement_id_key ON public.amazon_payouts USING btree (amazon_account_id, settlement_id);

CREATE UNIQUE INDEX amazon_payouts_pkey ON public.amazon_payouts USING btree (id);

CREATE UNIQUE INDEX amazon_sync_logs_pkey ON public.amazon_sync_logs USING btree (id);

CREATE UNIQUE INDEX amazon_transactions_pkey ON public.amazon_transactions USING btree (id);

CREATE UNIQUE INDEX amazon_transactions_transaction_id_amazon_account_id_key ON public.amazon_transactions USING btree (transaction_id, amazon_account_id);

CREATE UNIQUE INDEX amazon_transactions_transaction_id_unique ON public.amazon_transactions USING btree (transaction_id);

CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id);

CREATE UNIQUE INDEX bank_accounts_pkey ON public.bank_accounts USING btree (id);

CREATE UNIQUE INDEX bank_sync_logs_pkey ON public.bank_sync_logs USING btree (id);

CREATE UNIQUE INDEX bank_transactions_pkey ON public.bank_transactions USING btree (id);

CREATE UNIQUE INDEX bank_transactions_plaid_transaction_id_bank_account_id_key ON public.bank_transactions USING btree (plaid_transaction_id, bank_account_id);

CREATE UNIQUE INDEX cash_flow_events_pkey ON public.cash_flow_events USING btree (id);

CREATE UNIQUE INDEX cash_flow_insights_pkey ON public.cash_flow_insights USING btree (id);

CREATE UNIQUE INDEX cash_flow_insights_user_id_insight_date_key ON public.cash_flow_insights USING btree (user_id, insight_date);

CREATE UNIQUE INDEX categories_pkey ON public.categories USING btree (id);

CREATE UNIQUE INDEX categories_user_id_name_type_key ON public.categories USING btree (user_id, name, type);

CREATE UNIQUE INDEX credit_card_payments_pkey ON public.credit_card_payments USING btree (id);

CREATE UNIQUE INDEX credit_cards_pkey ON public.credit_cards USING btree (id);

CREATE UNIQUE INDEX custom_discount_codes_code_key ON public.custom_discount_codes USING btree (code);

CREATE UNIQUE INDEX custom_discount_codes_pkey ON public.custom_discount_codes USING btree (id);

CREATE UNIQUE INDEX customers_pkey ON public.customers USING btree (id);

CREATE UNIQUE INDEX customers_user_name_unique ON public.customers USING btree (user_id, lower(name));

CREATE UNIQUE INDEX deleted_transactions_pkey ON public.deleted_transactions USING btree (id);

CREATE UNIQUE INDEX documents_metadata_pkey ON public.documents_metadata USING btree (id);

CREATE UNIQUE INDEX documents_metadata_user_id_file_path_key ON public.documents_metadata USING btree (user_id, file_path);

CREATE UNIQUE INDEX feature_requests_pkey ON public.feature_requests USING btree (id);

CREATE UNIQUE INDEX forecast_accuracy_log_pkey ON public.forecast_accuracy_log USING btree (id);

CREATE UNIQUE INDEX forecast_accuracy_log_settlement_id_key ON public.forecast_accuracy_log USING btree (settlement_id);

CREATE INDEX idx_admin_permissions_email ON public.admin_permissions USING btree (email);

CREATE INDEX idx_affiliate_referrals_affiliate ON public.affiliate_referrals USING btree (affiliate_id);

CREATE INDEX idx_affiliate_referrals_referred ON public.affiliate_referrals USING btree (referred_user_id);

CREATE INDEX idx_affiliates_code ON public.affiliates USING btree (affiliate_code);

CREATE INDEX idx_amazon_accounts_seller_id ON public.amazon_accounts USING btree (seller_id);

CREATE INDEX idx_amazon_accounts_sync_status ON public.amazon_accounts USING btree (sync_status);

CREATE INDEX idx_amazon_accounts_user_id ON public.amazon_accounts USING btree (user_id);

CREATE INDEX idx_amazon_accounts_user_sync ON public.amazon_accounts USING btree (user_id, sync_status);

CREATE INDEX idx_amazon_payouts_account_id ON public.amazon_payouts USING btree (amazon_account_id);

CREATE INDEX idx_amazon_payouts_account_status ON public.amazon_payouts USING btree (amazon_account_id, status, payout_date);

CREATE INDEX idx_amazon_payouts_date ON public.amazon_payouts USING btree (payout_date);

CREATE INDEX idx_amazon_payouts_forecast_replaced ON public.amazon_payouts USING btree (forecast_replaced_at) WHERE (forecast_replaced_at IS NOT NULL);

CREATE UNIQUE INDEX idx_amazon_payouts_forecast_unique ON public.amazon_payouts USING btree (amazon_account_id, payout_date, status) WHERE (status = 'forecasted'::text);

CREATE INDEX idx_amazon_payouts_user_id ON public.amazon_payouts USING btree (user_id);

CREATE INDEX idx_amazon_payouts_user_status ON public.amazon_payouts USING btree (user_id, status, payout_date);

CREATE INDEX idx_amazon_sync_logs_account_id ON public.amazon_sync_logs USING btree (account_id);

CREATE INDEX idx_amazon_sync_logs_started_at ON public.amazon_sync_logs USING btree (started_at DESC);

CREATE INDEX idx_amazon_sync_logs_user_id ON public.amazon_sync_logs USING btree (user_id);

CREATE INDEX idx_amazon_transactions_account ON public.amazon_transactions USING btree (amazon_account_id);

CREATE INDEX idx_amazon_transactions_delivery_date ON public.amazon_transactions USING btree (delivery_date);

CREATE INDEX idx_amazon_transactions_transaction_date ON public.amazon_transactions USING btree (transaction_date);

CREATE INDEX idx_bank_accounts_encrypted_tokens ON public.bank_accounts USING btree (user_id, encrypted_access_token) WHERE (encrypted_access_token IS NOT NULL);

CREATE INDEX idx_bank_accounts_user_active ON public.bank_accounts USING btree (user_id, is_active) WHERE (is_active = true);

CREATE INDEX idx_bank_accounts_user_id ON public.bank_accounts USING btree (user_id);

CREATE INDEX idx_bank_transactions_account_id ON public.bank_transactions USING btree (bank_account_id);

CREATE INDEX idx_bank_transactions_archived ON public.bank_transactions USING btree (archived);

CREATE INDEX idx_bank_transactions_credit_card_id ON public.bank_transactions USING btree (credit_card_id);

CREATE INDEX idx_bank_transactions_date ON public.bank_transactions USING btree (date DESC);

CREATE INDEX idx_bank_transactions_user_id ON public.bank_transactions USING btree (user_id);

CREATE INDEX idx_cash_flow_insights_user_date ON public.cash_flow_insights USING btree (user_id, insight_date DESC);

CREATE INDEX idx_credit_card_payments_account_id ON public.credit_card_payments USING btree (account_id);

CREATE INDEX idx_credit_card_payments_credit_card_id ON public.credit_card_payments USING btree (credit_card_id);

CREATE INDEX idx_credit_card_payments_payment_date ON public.credit_card_payments USING btree (payment_date);

CREATE INDEX idx_credit_card_payments_user_id ON public.credit_card_payments USING btree (user_id);

CREATE INDEX idx_custom_discount_codes_active ON public.custom_discount_codes USING btree (is_active) WHERE (is_active = true);

CREATE INDEX idx_custom_discount_codes_code ON public.custom_discount_codes USING btree (code);

CREATE INDEX idx_daily_draws_account ON public.amazon_daily_draws USING btree (amazon_account_id);

CREATE INDEX idx_daily_draws_date ON public.amazon_daily_draws USING btree (draw_date);

CREATE INDEX idx_daily_draws_settlement ON public.amazon_daily_draws USING btree (settlement_id);

CREATE INDEX idx_daily_rollups_account_date ON public.amazon_daily_rollups USING btree (amazon_account_id, rollup_date DESC);

CREATE INDEX idx_daily_rollups_account_id ON public.amazon_daily_rollups USING btree (account_id);

CREATE INDEX idx_daily_rollups_user_date ON public.amazon_daily_rollups USING btree (user_id, rollup_date DESC);

CREATE INDEX idx_deleted_transactions_deleted_at ON public.deleted_transactions USING btree (deleted_at DESC);

CREATE INDEX idx_deleted_transactions_user_id ON public.deleted_transactions USING btree (user_id);

CREATE INDEX idx_forecast_accuracy_created_at ON public.forecast_accuracy_log USING btree (created_at DESC);

CREATE INDEX idx_forecast_accuracy_date ON public.forecast_accuracy_log USING btree (payout_date DESC);

CREATE INDEX idx_forecast_accuracy_modeling_method ON public.forecast_accuracy_log USING btree (modeling_method);

CREATE INDEX idx_forecast_accuracy_payout_date ON public.forecast_accuracy_log USING btree (payout_date DESC);

CREATE INDEX idx_forecast_accuracy_user_id ON public.forecast_accuracy_log USING btree (user_id);

CREATE INDEX idx_income_archived ON public.income USING btree (archived, user_id);

CREATE INDEX idx_income_customer_id ON public.income USING btree (customer_id);

CREATE INDEX idx_income_payment_date ON public.income USING btree (payment_date);

CREATE INDEX idx_income_status ON public.income USING btree (status);

CREATE INDEX idx_income_user_id ON public.income USING btree (user_id);

CREATE INDEX idx_line_items_document_id ON public.purchase_order_line_items USING btree (document_id);

CREATE INDEX idx_line_items_user_id ON public.purchase_order_line_items USING btree (user_id);

CREATE INDEX idx_line_items_vendor_id ON public.purchase_order_line_items USING btree (vendor_id);

CREATE INDEX idx_monthly_support_metrics_month ON public.monthly_support_metrics USING btree (month_year);

CREATE INDEX idx_password_reset_tokens_expires ON public.password_reset_tokens USING btree (expires_at);

CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens USING btree (token);

CREATE INDEX idx_payees_account_id ON public.payees USING btree (account_id);

CREATE INDEX idx_payees_user_id ON public.payees USING btree (user_id);

CREATE INDEX idx_plan_override_audit_created_at ON public.plan_override_audit USING btree (created_at DESC);

CREATE INDEX idx_plan_override_audit_user_id ON public.plan_override_audit USING btree (user_id);

CREATE INDEX idx_profiles_account_id ON public.profiles USING btree (account_id);

CREATE INDEX idx_profiles_account_status ON public.profiles USING btree (account_status);

CREATE INDEX idx_profiles_churn_date ON public.profiles USING btree (churn_date);

CREATE INDEX idx_profiles_currency ON public.profiles USING btree (currency);

CREATE INDEX idx_profiles_email ON public.profiles USING btree (email);

CREATE INDEX idx_profiles_hear_about_us ON public.profiles USING btree (hear_about_us);

CREATE INDEX idx_profiles_monthly_amazon_revenue ON public.profiles USING btree (monthly_amazon_revenue);

CREATE INDEX idx_profiles_my_referral_code ON public.profiles USING btree (my_referral_code);

CREATE INDEX idx_profiles_plan_override ON public.profiles USING btree (plan_override) WHERE (plan_override IS NOT NULL);

CREATE INDEX idx_profiles_referral_code ON public.profiles USING btree (referral_code);

CREATE INDEX idx_profiles_stripe_customer_id ON public.profiles USING btree (stripe_customer_id) WHERE (stripe_customer_id IS NOT NULL);

CREATE INDEX idx_profiles_user_id ON public.profiles USING btree (user_id);

CREATE INDEX idx_purchased_addons_type ON public.purchased_addons USING btree (addon_type);

CREATE INDEX idx_purchased_addons_user_account ON public.purchased_addons USING btree (user_id, account_id);

CREATE INDEX idx_recurring_expense_exceptions_exception_date ON public.recurring_expense_exceptions USING btree (exception_date);

CREATE INDEX idx_recurring_expense_exceptions_recurring_expense_id ON public.recurring_expense_exceptions USING btree (recurring_expense_id);

CREATE INDEX idx_recurring_expenses_credit_card_id ON public.recurring_expenses USING btree (credit_card_id);

CREATE INDEX idx_referral_codes_active ON public.referral_codes USING btree (is_active);

CREATE INDEX idx_referral_codes_code ON public.referral_codes USING btree (code);

CREATE INDEX idx_referral_codes_owner ON public.referral_codes USING btree (owner_id);

CREATE INDEX idx_referral_codes_usage ON public.referral_codes USING btree (code, is_active, max_uses, current_uses);

CREATE INDEX idx_referral_rewards_user ON public.referral_rewards USING btree (user_id);

CREATE INDEX idx_referrals_referred ON public.referrals USING btree (referred_user_id);

CREATE INDEX idx_referrals_referrer ON public.referrals USING btree (referrer_id);

CREATE INDEX idx_referrals_referrer_status ON public.referrals USING btree (referrer_id, status);

CREATE INDEX idx_scenarios_user_id ON public.scenarios USING btree (user_id);

CREATE INDEX idx_stripe_audit_log_created_at ON public.stripe_customer_audit_log USING btree (created_at DESC);

CREATE INDEX idx_stripe_audit_log_user_id ON public.stripe_customer_audit_log USING btree (user_id);

CREATE INDEX idx_support_tickets_admin_viewed ON public.support_tickets USING btree (id, admin_last_viewed_at);

CREATE INDEX idx_support_tickets_assigned_to ON public.support_tickets USING btree (assigned_to);

CREATE INDEX idx_support_tickets_status ON public.support_tickets USING btree (status);

CREATE UNIQUE INDEX idx_support_tickets_ticket_number ON public.support_tickets USING btree (ticket_number);

CREATE INDEX idx_support_tickets_user_id ON public.support_tickets USING btree (user_id);

CREATE INDEX idx_team_invitations_email ON public.team_invitations USING btree (email);

CREATE INDEX idx_team_invitations_token ON public.team_invitations USING btree (token);

CREATE INDEX idx_ticket_feedback_staff_id ON public.ticket_feedback USING btree (staff_id);

CREATE INDEX idx_ticket_feedback_ticket_id ON public.ticket_feedback USING btree (ticket_id);

CREATE INDEX idx_ticket_messages_ticket_id ON public.ticket_messages USING btree (ticket_id);

CREATE INDEX idx_ticket_messages_ticket_user_created ON public.ticket_messages USING btree (ticket_id, user_id, created_at);

CREATE INDEX idx_transactions_archived ON public.transactions USING btree (archived, user_id);

CREATE INDEX idx_transactions_credit_card_id ON public.transactions USING btree (credit_card_id);

CREATE INDEX idx_trial_addon_usage_user_id ON public.trial_addon_usage USING btree (user_id);

CREATE UNIQUE INDEX idx_unique_active_seller_id ON public.amazon_accounts USING btree (seller_id) WHERE (is_active = true);

CREATE INDEX idx_user_roles_account_id ON public.user_roles USING btree (account_id);

CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);

CREATE INDEX idx_user_settings_advanced_modeling ON public.user_settings USING btree (user_id, advanced_modeling_enabled) WHERE (advanced_modeling_enabled = true);

CREATE INDEX idx_user_settings_reserve_updated ON public.user_settings USING btree (reserve_last_updated_at);

CREATE INDEX idx_user_settings_user_id ON public.user_settings USING btree (user_id);

CREATE UNIQUE INDEX income_pkey ON public.income USING btree (id);

CREATE UNIQUE INDEX monthly_support_metrics_month_year_key ON public.monthly_support_metrics USING btree (month_year);

CREATE UNIQUE INDEX monthly_support_metrics_pkey ON public.monthly_support_metrics USING btree (id);

CREATE UNIQUE INDEX notification_history_pkey ON public.notification_history USING btree (id);

CREATE UNIQUE INDEX notification_preferences_pkey ON public.notification_preferences USING btree (id);

CREATE UNIQUE INDEX notification_preferences_user_type_account_unique ON public.notification_preferences USING btree (user_id, notification_type, account_id);

CREATE UNIQUE INDEX password_reset_tokens_pkey ON public.password_reset_tokens USING btree (id);

CREATE UNIQUE INDEX password_reset_tokens_token_key ON public.password_reset_tokens USING btree (token);

CREATE UNIQUE INDEX payees_pkey ON public.payees USING btree (id);

CREATE UNIQUE INDEX plan_limits_pkey ON public.plan_limits USING btree (id);

CREATE UNIQUE INDEX plan_limits_plan_name_key ON public.plan_limits USING btree (plan_name);

CREATE UNIQUE INDEX plan_override_audit_pkey ON public.plan_override_audit USING btree (id);

CREATE UNIQUE INDEX profiles_my_referral_code_key ON public.profiles USING btree (my_referral_code);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX profiles_user_id_key ON public.profiles USING btree (user_id);

CREATE UNIQUE INDEX purchase_order_line_items_pkey ON public.purchase_order_line_items USING btree (id);

CREATE UNIQUE INDEX purchased_addons_pkey ON public.purchased_addons USING btree (id);

CREATE UNIQUE INDEX recurring_expense_exceptions_pkey ON public.recurring_expense_exceptions USING btree (id);

CREATE UNIQUE INDEX recurring_expense_exceptions_recurring_expense_id_exception_key ON public.recurring_expense_exceptions USING btree (recurring_expense_id, exception_date);

CREATE UNIQUE INDEX recurring_expenses_pkey ON public.recurring_expenses USING btree (id);

CREATE UNIQUE INDEX recurring_expenses_user_name_unique ON public.recurring_expenses USING btree (user_id, lower(name));

CREATE UNIQUE INDEX referral_codes_code_key ON public.referral_codes USING btree (code);

CREATE UNIQUE INDEX referral_codes_code_unique ON public.referral_codes USING btree (code);

CREATE UNIQUE INDEX referral_codes_pkey ON public.referral_codes USING btree (id);

CREATE UNIQUE INDEX referral_rewards_pkey ON public.referral_rewards USING btree (id);

CREATE UNIQUE INDEX referral_rewards_user_id_key ON public.referral_rewards USING btree (user_id);

CREATE UNIQUE INDEX referrals_pkey ON public.referrals USING btree (id);

CREATE UNIQUE INDEX referrals_referred_user_id_key ON public.referrals USING btree (referred_user_id);

CREATE UNIQUE INDEX scenarios_pkey ON public.scenarios USING btree (id);

CREATE UNIQUE INDEX stripe_customer_audit_log_pkey ON public.stripe_customer_audit_log USING btree (id);

CREATE UNIQUE INDEX support_tickets_pkey ON public.support_tickets USING btree (id);

CREATE UNIQUE INDEX team_invitations_account_id_email_key ON public.team_invitations USING btree (account_id, email);

CREATE UNIQUE INDEX team_invitations_pkey ON public.team_invitations USING btree (id);

CREATE UNIQUE INDEX team_invitations_token_key ON public.team_invitations USING btree (token);

CREATE UNIQUE INDEX ticket_feedback_pkey ON public.ticket_feedback USING btree (id);

CREATE UNIQUE INDEX ticket_messages_pkey ON public.ticket_messages USING btree (id);

CREATE UNIQUE INDEX transactions_pkey ON public.transactions USING btree (id);

CREATE UNIQUE INDEX trial_addon_usage_pkey ON public.trial_addon_usage USING btree (id);

CREATE UNIQUE INDEX trial_addon_usage_user_id_addon_type_key ON public.trial_addon_usage USING btree (user_id, addon_type);

CREATE UNIQUE INDEX unique_amazon_payout_settlement ON public.amazon_payouts USING btree (amazon_account_id, settlement_id);

CREATE UNIQUE INDEX unique_credit_card_payment ON public.credit_card_payments USING btree (credit_card_id, payment_date, payment_type);

CREATE UNIQUE INDEX unique_forecasted_payout_per_account_date ON public.amazon_payouts USING btree (amazon_account_id, payout_date, status) WHERE (status = 'forecasted'::text);

CREATE UNIQUE INDEX unique_payout_account_date_status ON public.amazon_payouts USING btree (amazon_account_id, payout_date, status);

CREATE UNIQUE INDEX unique_vendor_name_per_user ON public.vendors USING btree (user_id, lower(name));

CREATE UNIQUE INDEX user_roles_pkey ON public.user_roles USING btree (id);

CREATE UNIQUE INDEX user_roles_user_account_unique ON public.user_roles USING btree (user_id, COALESCE(account_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE UNIQUE INDEX user_roles_user_id_account_id_unique ON public.user_roles USING btree (user_id, account_id) WHERE (account_id IS NOT NULL);

CREATE UNIQUE INDEX user_settings_pkey ON public.user_settings USING btree (id);

CREATE UNIQUE INDEX user_settings_user_id_key ON public.user_settings USING btree (user_id);

CREATE UNIQUE INDEX vendors_pkey ON public.vendors USING btree (id);

CREATE UNIQUE INDEX vendors_user_name_unique ON public.vendors USING btree (user_id, lower(name));

alter table "public"."account_modification_audit" add constraint "account_modification_audit_pkey" PRIMARY KEY using index "account_modification_audit_pkey";

alter table "public"."admin_permissions" add constraint "admin_permissions_pkey" PRIMARY KEY using index "admin_permissions_pkey";

alter table "public"."affiliate_payouts" add constraint "affiliate_payouts_pkey" PRIMARY KEY using index "affiliate_payouts_pkey";

alter table "public"."affiliate_referrals" add constraint "affiliate_referrals_pkey" PRIMARY KEY using index "affiliate_referrals_pkey";

alter table "public"."affiliates" add constraint "affiliates_pkey" PRIMARY KEY using index "affiliates_pkey";

alter table "public"."amazon_accounts" add constraint "amazon_accounts_pkey" PRIMARY KEY using index "amazon_accounts_pkey";

alter table "public"."amazon_connection_audit" add constraint "amazon_connection_audit_pkey" PRIMARY KEY using index "amazon_connection_audit_pkey";

alter table "public"."amazon_daily_draws" add constraint "amazon_daily_draws_pkey" PRIMARY KEY using index "amazon_daily_draws_pkey";

alter table "public"."amazon_daily_rollups" add constraint "amazon_daily_rollups_pkey" PRIMARY KEY using index "amazon_daily_rollups_pkey";

alter table "public"."amazon_payouts" add constraint "amazon_payouts_pkey" PRIMARY KEY using index "amazon_payouts_pkey";

alter table "public"."amazon_sync_logs" add constraint "amazon_sync_logs_pkey" PRIMARY KEY using index "amazon_sync_logs_pkey";

alter table "public"."amazon_transactions" add constraint "amazon_transactions_pkey" PRIMARY KEY using index "amazon_transactions_pkey";

alter table "public"."audit_logs" add constraint "audit_logs_pkey" PRIMARY KEY using index "audit_logs_pkey";

alter table "public"."bank_accounts" add constraint "bank_accounts_pkey" PRIMARY KEY using index "bank_accounts_pkey";

alter table "public"."bank_sync_logs" add constraint "bank_sync_logs_pkey" PRIMARY KEY using index "bank_sync_logs_pkey";

alter table "public"."bank_transactions" add constraint "bank_transactions_pkey" PRIMARY KEY using index "bank_transactions_pkey";

alter table "public"."cash_flow_events" add constraint "cash_flow_events_pkey" PRIMARY KEY using index "cash_flow_events_pkey";

alter table "public"."cash_flow_insights" add constraint "cash_flow_insights_pkey" PRIMARY KEY using index "cash_flow_insights_pkey";

alter table "public"."categories" add constraint "categories_pkey" PRIMARY KEY using index "categories_pkey";

alter table "public"."credit_card_payments" add constraint "credit_card_payments_pkey" PRIMARY KEY using index "credit_card_payments_pkey";

alter table "public"."credit_cards" add constraint "credit_cards_pkey" PRIMARY KEY using index "credit_cards_pkey";

alter table "public"."custom_discount_codes" add constraint "custom_discount_codes_pkey" PRIMARY KEY using index "custom_discount_codes_pkey";

alter table "public"."customers" add constraint "customers_pkey" PRIMARY KEY using index "customers_pkey";

alter table "public"."deleted_transactions" add constraint "deleted_transactions_pkey" PRIMARY KEY using index "deleted_transactions_pkey";

alter table "public"."documents_metadata" add constraint "documents_metadata_pkey" PRIMARY KEY using index "documents_metadata_pkey";

alter table "public"."feature_requests" add constraint "feature_requests_pkey" PRIMARY KEY using index "feature_requests_pkey";

alter table "public"."forecast_accuracy_log" add constraint "forecast_accuracy_log_pkey" PRIMARY KEY using index "forecast_accuracy_log_pkey";

alter table "public"."income" add constraint "income_pkey" PRIMARY KEY using index "income_pkey";

alter table "public"."monthly_support_metrics" add constraint "monthly_support_metrics_pkey" PRIMARY KEY using index "monthly_support_metrics_pkey";

alter table "public"."notification_history" add constraint "notification_history_pkey" PRIMARY KEY using index "notification_history_pkey";

alter table "public"."notification_preferences" add constraint "notification_preferences_pkey" PRIMARY KEY using index "notification_preferences_pkey";

alter table "public"."password_reset_tokens" add constraint "password_reset_tokens_pkey" PRIMARY KEY using index "password_reset_tokens_pkey";

alter table "public"."payees" add constraint "payees_pkey" PRIMARY KEY using index "payees_pkey";

alter table "public"."plan_limits" add constraint "plan_limits_pkey" PRIMARY KEY using index "plan_limits_pkey";

alter table "public"."plan_override_audit" add constraint "plan_override_audit_pkey" PRIMARY KEY using index "plan_override_audit_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."purchase_order_line_items" add constraint "purchase_order_line_items_pkey" PRIMARY KEY using index "purchase_order_line_items_pkey";

alter table "public"."purchased_addons" add constraint "purchased_addons_pkey" PRIMARY KEY using index "purchased_addons_pkey";

alter table "public"."recurring_expense_exceptions" add constraint "recurring_expense_exceptions_pkey" PRIMARY KEY using index "recurring_expense_exceptions_pkey";

alter table "public"."recurring_expenses" add constraint "recurring_expenses_pkey" PRIMARY KEY using index "recurring_expenses_pkey";

alter table "public"."referral_codes" add constraint "referral_codes_pkey" PRIMARY KEY using index "referral_codes_pkey";

alter table "public"."referral_rewards" add constraint "referral_rewards_pkey" PRIMARY KEY using index "referral_rewards_pkey";

alter table "public"."referrals" add constraint "referrals_pkey" PRIMARY KEY using index "referrals_pkey";

alter table "public"."scenarios" add constraint "scenarios_pkey" PRIMARY KEY using index "scenarios_pkey";

alter table "public"."stripe_customer_audit_log" add constraint "stripe_customer_audit_log_pkey" PRIMARY KEY using index "stripe_customer_audit_log_pkey";

alter table "public"."support_tickets" add constraint "support_tickets_pkey" PRIMARY KEY using index "support_tickets_pkey";

alter table "public"."team_invitations" add constraint "team_invitations_pkey" PRIMARY KEY using index "team_invitations_pkey";

alter table "public"."ticket_feedback" add constraint "ticket_feedback_pkey" PRIMARY KEY using index "ticket_feedback_pkey";

alter table "public"."ticket_messages" add constraint "ticket_messages_pkey" PRIMARY KEY using index "ticket_messages_pkey";

alter table "public"."transactions" add constraint "transactions_pkey" PRIMARY KEY using index "transactions_pkey";

alter table "public"."trial_addon_usage" add constraint "trial_addon_usage_pkey" PRIMARY KEY using index "trial_addon_usage_pkey";

alter table "public"."user_roles" add constraint "user_roles_pkey" PRIMARY KEY using index "user_roles_pkey";

alter table "public"."user_settings" add constraint "user_settings_pkey" PRIMARY KEY using index "user_settings_pkey";

alter table "public"."vendors" add constraint "vendors_pkey" PRIMARY KEY using index "vendors_pkey";

alter table "public"."account_modification_audit" add constraint "account_modification_audit_modified_by_fkey" FOREIGN KEY (modified_by) REFERENCES auth.users(id) not valid;

alter table "public"."account_modification_audit" validate constraint "account_modification_audit_modified_by_fkey";

alter table "public"."admin_permissions" add constraint "admin_permissions_email_key" UNIQUE using index "admin_permissions_email_key";

alter table "public"."admin_permissions" add constraint "admin_permissions_role_check" CHECK ((role = ANY (ARRAY['admin'::text, 'staff'::text]))) not valid;

alter table "public"."admin_permissions" validate constraint "admin_permissions_role_check";

alter table "public"."affiliate_payouts" add constraint "affiliate_payouts_affiliate_id_fkey" FOREIGN KEY (affiliate_id) REFERENCES public.affiliates(id) ON DELETE CASCADE not valid;

alter table "public"."affiliate_payouts" validate constraint "affiliate_payouts_affiliate_id_fkey";

alter table "public"."affiliate_payouts" add constraint "affiliate_payouts_payment_method_check" CHECK ((payment_method = ANY (ARRAY['paypal'::text, 'ach'::text]))) not valid;

alter table "public"."affiliate_payouts" validate constraint "affiliate_payouts_payment_method_check";

alter table "public"."affiliate_payouts" add constraint "affiliate_payouts_payment_status_check" CHECK ((payment_status = ANY (ARRAY['pending'::text, 'processing'::text, 'paid'::text, 'failed'::text]))) not valid;

alter table "public"."affiliate_payouts" validate constraint "affiliate_payouts_payment_status_check";

alter table "public"."affiliate_referrals" add constraint "affiliate_referrals_affiliate_id_fkey" FOREIGN KEY (affiliate_id) REFERENCES public.affiliates(id) ON DELETE CASCADE not valid;

alter table "public"."affiliate_referrals" validate constraint "affiliate_referrals_affiliate_id_fkey";

alter table "public"."affiliate_referrals" add constraint "affiliate_referrals_referred_user_id_fkey" FOREIGN KEY (referred_user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."affiliate_referrals" validate constraint "affiliate_referrals_referred_user_id_fkey";

alter table "public"."affiliate_referrals" add constraint "affiliate_referrals_referred_user_id_key" UNIQUE using index "affiliate_referrals_referred_user_id_key";

alter table "public"."affiliate_referrals" add constraint "affiliate_referrals_status_check" CHECK ((status = ANY (ARRAY['trial'::text, 'active'::text, 'canceled'::text]))) not valid;

alter table "public"."affiliate_referrals" validate constraint "affiliate_referrals_status_check";

alter table "public"."affiliates" add constraint "affiliates_affiliate_code_key" UNIQUE using index "affiliates_affiliate_code_key";

alter table "public"."affiliates" add constraint "affiliates_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'suspended'::text]))) not valid;

alter table "public"."affiliates" validate constraint "affiliates_status_check";

alter table "public"."affiliates" add constraint "affiliates_tier_check" CHECK ((tier = ANY (ARRAY['starter'::text, 'growth'::text, 'pro'::text]))) not valid;

alter table "public"."affiliates" validate constraint "affiliates_tier_check";

alter table "public"."affiliates" add constraint "affiliates_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."affiliates" validate constraint "affiliates_user_id_fkey";

alter table "public"."affiliates" add constraint "affiliates_user_id_key" UNIQUE using index "affiliates_user_id_key";

alter table "public"."amazon_accounts" add constraint "amazon_accounts_payout_frequency_check" CHECK ((payout_frequency = ANY (ARRAY['daily'::text, 'bi-weekly'::text]))) not valid;

alter table "public"."amazon_accounts" validate constraint "amazon_accounts_payout_frequency_check";

alter table "public"."amazon_accounts" add constraint "amazon_accounts_payout_model_check" CHECK ((payout_model = ANY (ARRAY['bi-weekly'::text, 'daily'::text]))) not valid;

alter table "public"."amazon_accounts" validate constraint "amazon_accounts_payout_model_check";

alter table "public"."amazon_accounts" add constraint "amazon_accounts_sync_progress_check" CHECK (((sync_progress >= 0) AND (sync_progress <= 100))) not valid;

alter table "public"."amazon_accounts" validate constraint "amazon_accounts_sync_progress_check";

alter table "public"."amazon_accounts" add constraint "amazon_accounts_sync_status_check" CHECK ((sync_status = ANY (ARRAY['idle'::text, 'syncing'::text, 'completed'::text, 'error'::text]))) not valid;

alter table "public"."amazon_accounts" validate constraint "amazon_accounts_sync_status_check";

alter table "public"."amazon_connection_audit" add constraint "amazon_connection_audit_performed_by_fkey" FOREIGN KEY (performed_by) REFERENCES auth.users(id) not valid;

alter table "public"."amazon_connection_audit" validate constraint "amazon_connection_audit_performed_by_fkey";

alter table "public"."amazon_daily_draws" add constraint "amazon_daily_draws_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.amazon_accounts(id) ON DELETE CASCADE not valid;

alter table "public"."amazon_daily_draws" validate constraint "amazon_daily_draws_account_id_fkey";

alter table "public"."amazon_daily_draws" add constraint "amazon_daily_draws_amazon_account_id_fkey" FOREIGN KEY (amazon_account_id) REFERENCES public.amazon_accounts(id) ON DELETE CASCADE not valid;

alter table "public"."amazon_daily_draws" validate constraint "amazon_daily_draws_amazon_account_id_fkey";

alter table "public"."amazon_daily_rollups" add constraint "amazon_daily_rollups_amazon_account_id_fkey" FOREIGN KEY (amazon_account_id) REFERENCES public.amazon_accounts(id) ON DELETE CASCADE not valid;

alter table "public"."amazon_daily_rollups" validate constraint "amazon_daily_rollups_amazon_account_id_fkey";

alter table "public"."amazon_daily_rollups" add constraint "amazon_daily_rollups_amazon_account_id_rollup_date_key" UNIQUE using index "amazon_daily_rollups_amazon_account_id_rollup_date_key";

alter table "public"."amazon_payouts" add constraint "amazon_payouts_amazon_account_id_fkey" FOREIGN KEY (amazon_account_id) REFERENCES public.amazon_accounts(id) ON DELETE CASCADE not valid;

alter table "public"."amazon_payouts" validate constraint "amazon_payouts_amazon_account_id_fkey";

alter table "public"."amazon_payouts" add constraint "amazon_payouts_amazon_account_id_settlement_id_key" UNIQUE using index "amazon_payouts_amazon_account_id_settlement_id_key";

alter table "public"."amazon_payouts" add constraint "amazon_payouts_modeling_method_check" CHECK ((modeling_method = ANY (ARRAY['mathematical_biweekly'::text, 'mathematical_daily'::text, 'ai_forecast'::text, 'baseline_estimate'::text, 'auren_forecast_v1'::text]))) not valid;

alter table "public"."amazon_payouts" validate constraint "amazon_payouts_modeling_method_check";

alter table "public"."amazon_payouts" add constraint "amazon_payouts_status_check" CHECK ((status = ANY (ARRAY['confirmed'::text, 'forecasted'::text, 'estimated'::text, 'rolled_over'::text]))) not valid;

alter table "public"."amazon_payouts" validate constraint "amazon_payouts_status_check";

alter table "public"."amazon_payouts" add constraint "unique_amazon_payout_settlement" UNIQUE using index "unique_amazon_payout_settlement";

alter table "public"."amazon_payouts" add constraint "unique_payout_account_date_status" UNIQUE using index "unique_payout_account_date_status";

alter table "public"."amazon_sync_logs" add constraint "amazon_sync_logs_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.amazon_accounts(id) ON DELETE CASCADE not valid;

alter table "public"."amazon_sync_logs" validate constraint "amazon_sync_logs_account_id_fkey";

alter table "public"."amazon_transactions" add constraint "amazon_transactions_transaction_id_amazon_account_id_key" UNIQUE using index "amazon_transactions_transaction_id_amazon_account_id_key";

alter table "public"."amazon_transactions" add constraint "amazon_transactions_transaction_id_unique" UNIQUE using index "amazon_transactions_transaction_id_unique";

alter table "public"."bank_transactions" add constraint "bank_transactions_bank_account_id_fkey" FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id) ON DELETE CASCADE not valid;

alter table "public"."bank_transactions" validate constraint "bank_transactions_bank_account_id_fkey";

alter table "public"."bank_transactions" add constraint "bank_transactions_credit_card_id_fkey" FOREIGN KEY (credit_card_id) REFERENCES public.credit_cards(id) ON DELETE CASCADE not valid;

alter table "public"."bank_transactions" validate constraint "bank_transactions_credit_card_id_fkey";

alter table "public"."bank_transactions" add constraint "bank_transactions_matched_type_check" CHECK ((matched_type = ANY (ARRAY['income'::text, 'vendor'::text]))) not valid;

alter table "public"."bank_transactions" validate constraint "bank_transactions_matched_type_check";

alter table "public"."bank_transactions" add constraint "bank_transactions_plaid_transaction_id_bank_account_id_key" UNIQUE using index "bank_transactions_plaid_transaction_id_bank_account_id_key";

alter table "public"."cash_flow_events" add constraint "cash_flow_events_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(id) not valid;

alter table "public"."cash_flow_events" validate constraint "cash_flow_events_customer_id_fkey";

alter table "public"."cash_flow_events" add constraint "cash_flow_events_type_check" CHECK ((type = ANY (ARRAY['income'::text, 'expense'::text, 'vendor_payment'::text, 'customer_payment'::text]))) not valid;

alter table "public"."cash_flow_events" validate constraint "cash_flow_events_type_check";

alter table "public"."cash_flow_events" add constraint "cash_flow_events_vendor_id_fkey" FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) not valid;

alter table "public"."cash_flow_events" validate constraint "cash_flow_events_vendor_id_fkey";

alter table "public"."cash_flow_insights" add constraint "cash_flow_insights_user_id_insight_date_key" UNIQUE using index "cash_flow_insights_user_id_insight_date_key";

alter table "public"."categories" add constraint "categories_type_check" CHECK ((type = ANY (ARRAY['expense'::text, 'income'::text, 'purchase_order'::text]))) not valid;

alter table "public"."categories" validate constraint "categories_type_check";

alter table "public"."categories" add constraint "categories_user_id_name_type_key" UNIQUE using index "categories_user_id_name_type_key";

alter table "public"."credit_card_payments" add constraint "credit_card_payments_bank_account_id_fkey" FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id) ON DELETE CASCADE not valid;

alter table "public"."credit_card_payments" validate constraint "credit_card_payments_bank_account_id_fkey";

alter table "public"."credit_card_payments" add constraint "credit_card_payments_credit_card_id_fkey" FOREIGN KEY (credit_card_id) REFERENCES public.credit_cards(id) ON DELETE CASCADE not valid;

alter table "public"."credit_card_payments" validate constraint "credit_card_payments_credit_card_id_fkey";

alter table "public"."credit_card_payments" add constraint "credit_card_payments_payment_type_check" CHECK ((payment_type = ANY (ARRAY['manual'::text, 'bill_payment'::text]))) not valid;

alter table "public"."credit_card_payments" validate constraint "credit_card_payments_payment_type_check";

alter table "public"."credit_card_payments" add constraint "credit_card_payments_status_check" CHECK ((status = ANY (ARRAY['scheduled'::text, 'completed'::text]))) not valid;

alter table "public"."credit_card_payments" validate constraint "credit_card_payments_status_check";

alter table "public"."credit_card_payments" add constraint "unique_credit_card_payment" UNIQUE using index "unique_credit_card_payment";

alter table "public"."credit_cards" add constraint "credit_cards_cash_back_check" CHECK (((cash_back >= (0)::numeric) AND (cash_back <= (100)::numeric))) not valid;

alter table "public"."credit_cards" validate constraint "credit_cards_cash_back_check";

alter table "public"."credit_cards" add constraint "credit_cards_priority_check" CHECK (((priority >= 1) AND (priority <= 5))) not valid;

alter table "public"."credit_cards" validate constraint "credit_cards_priority_check";

alter table "public"."custom_discount_codes" add constraint "custom_discount_codes_code_key" UNIQUE using index "custom_discount_codes_code_key";

alter table "public"."custom_discount_codes" add constraint "custom_discount_codes_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."custom_discount_codes" validate constraint "custom_discount_codes_created_by_fkey";

alter table "public"."custom_discount_codes" add constraint "custom_discount_codes_discount_percentage_check" CHECK (((discount_percentage > 0) AND (discount_percentage <= 100))) not valid;

alter table "public"."custom_discount_codes" validate constraint "custom_discount_codes_discount_percentage_check";

alter table "public"."customers" add constraint "customers_payment_terms_check" CHECK ((payment_terms = ANY (ARRAY['immediate'::text, 'net'::text]))) not valid;

alter table "public"."customers" validate constraint "customers_payment_terms_check";

alter table "public"."deleted_transactions" add constraint "deleted_transactions_transaction_type_check" CHECK ((transaction_type = ANY (ARRAY['vendor'::text, 'income'::text]))) not valid;

alter table "public"."deleted_transactions" validate constraint "deleted_transactions_transaction_type_check";

alter table "public"."documents_metadata" add constraint "documents_metadata_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL not valid;

alter table "public"."documents_metadata" validate constraint "documents_metadata_customer_id_fkey";

alter table "public"."documents_metadata" add constraint "documents_metadata_user_id_file_path_key" UNIQUE using index "documents_metadata_user_id_file_path_key";

alter table "public"."documents_metadata" add constraint "documents_metadata_vendor_id_fkey" FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE SET NULL not valid;

alter table "public"."documents_metadata" validate constraint "documents_metadata_vendor_id_fkey";

alter table "public"."feature_requests" add constraint "feature_requests_category_check" CHECK ((category = ANY (ARRAY['feature'::text, 'improvement'::text, 'bug'::text, 'integration'::text]))) not valid;

alter table "public"."feature_requests" validate constraint "feature_requests_category_check";

alter table "public"."feature_requests" add constraint "feature_requests_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))) not valid;

alter table "public"."feature_requests" validate constraint "feature_requests_priority_check";

alter table "public"."feature_requests" add constraint "feature_requests_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'completed'::text, 'rejected'::text]))) not valid;

alter table "public"."feature_requests" validate constraint "feature_requests_status_check";

alter table "public"."feature_requests" add constraint "feature_requests_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."feature_requests" validate constraint "feature_requests_user_id_fkey";

alter table "public"."forecast_accuracy_log" add constraint "forecast_accuracy_log_amazon_account_id_fkey" FOREIGN KEY (amazon_account_id) REFERENCES public.amazon_accounts(id) ON DELETE CASCADE not valid;

alter table "public"."forecast_accuracy_log" validate constraint "forecast_accuracy_log_amazon_account_id_fkey";

alter table "public"."forecast_accuracy_log" add constraint "forecast_accuracy_log_settlement_id_key" UNIQUE using index "forecast_accuracy_log_settlement_id_key";

alter table "public"."forecast_accuracy_log" add constraint "forecast_accuracy_log_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."forecast_accuracy_log" validate constraint "forecast_accuracy_log_user_id_fkey";

alter table "public"."income" add constraint "fk_income_user" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."income" validate constraint "fk_income_user";

alter table "public"."income" add constraint "income_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL not valid;

alter table "public"."income" validate constraint "income_customer_id_fkey";

alter table "public"."income" add constraint "income_recurring_frequency_check" CHECK ((recurring_frequency = ANY (ARRAY['weekly'::text, 'bi-weekly'::text, 'monthly'::text, 'quarterly'::text, 'yearly'::text, 'weekdays'::text]))) not valid;

alter table "public"."income" validate constraint "income_recurring_frequency_check";

alter table "public"."income" add constraint "income_status_check" CHECK ((status = ANY (ARRAY['received'::text, 'pending'::text, 'overdue'::text]))) not valid;

alter table "public"."income" validate constraint "income_status_check";

alter table "public"."monthly_support_metrics" add constraint "monthly_support_metrics_month_year_key" UNIQUE using index "monthly_support_metrics_month_year_key";

alter table "public"."notification_history" add constraint "notification_history_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."notification_history" validate constraint "notification_history_user_id_fkey";

alter table "public"."notification_preferences" add constraint "notification_preferences_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."notification_preferences" validate constraint "notification_preferences_user_id_fkey";

alter table "public"."notification_preferences" add constraint "notification_preferences_user_type_account_unique" UNIQUE using index "notification_preferences_user_type_account_unique";

alter table "public"."password_reset_tokens" add constraint "password_reset_tokens_token_key" UNIQUE using index "password_reset_tokens_token_key";

alter table "public"."password_reset_tokens" add constraint "password_reset_tokens_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."password_reset_tokens" validate constraint "password_reset_tokens_user_id_fkey";

alter table "public"."payees" add constraint "payees_payment_method_check" CHECK ((payment_method = ANY (ARRAY['bank-transfer'::text, 'credit-card'::text]))) not valid;

alter table "public"."payees" validate constraint "payees_payment_method_check";

alter table "public"."plan_limits" add constraint "plan_limits_plan_name_key" UNIQUE using index "plan_limits_plan_name_key";

alter table "public"."profiles" add constraint "profiles_account_status_check" CHECK ((account_status = ANY (ARRAY['active'::text, 'suspended_payment'::text, 'trial_expired'::text]))) not valid;

alter table "public"."profiles" validate constraint "profiles_account_status_check";

alter table "public"."profiles" add constraint "profiles_my_referral_code_key" UNIQUE using index "profiles_my_referral_code_key";

alter table "public"."profiles" add constraint "profiles_theme_preference_check" CHECK ((theme_preference = ANY (ARRAY['light'::text, 'dark'::text, 'system'::text]))) not valid;

alter table "public"."profiles" validate constraint "profiles_theme_preference_check";

alter table "public"."profiles" add constraint "profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_user_id_fkey";

alter table "public"."profiles" add constraint "profiles_user_id_key" UNIQUE using index "profiles_user_id_key";

alter table "public"."purchase_order_line_items" add constraint "purchase_order_line_items_document_id_fkey" FOREIGN KEY (document_id) REFERENCES public.documents_metadata(id) ON DELETE CASCADE not valid;

alter table "public"."purchase_order_line_items" validate constraint "purchase_order_line_items_document_id_fkey";

alter table "public"."purchase_order_line_items" add constraint "purchase_order_line_items_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."purchase_order_line_items" validate constraint "purchase_order_line_items_user_id_fkey";

alter table "public"."purchased_addons" add constraint "purchased_addons_addon_type_check" CHECK ((addon_type = ANY (ARRAY['bank_connection'::text, 'amazon_connection'::text]))) not valid;

alter table "public"."purchased_addons" validate constraint "purchased_addons_addon_type_check";

alter table "public"."purchased_addons" add constraint "purchased_addons_quantity_check" CHECK ((quantity > 0)) not valid;

alter table "public"."purchased_addons" validate constraint "purchased_addons_quantity_check";

alter table "public"."purchased_addons" add constraint "purchased_addons_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."purchased_addons" validate constraint "purchased_addons_user_id_fkey";

alter table "public"."recurring_expense_exceptions" add constraint "recurring_expense_exceptions_recurring_expense_id_exception_key" UNIQUE using index "recurring_expense_exceptions_recurring_expense_id_exception_key";

alter table "public"."recurring_expense_exceptions" add constraint "recurring_expense_exceptions_recurring_expense_id_fkey" FOREIGN KEY (recurring_expense_id) REFERENCES public.recurring_expenses(id) ON DELETE CASCADE not valid;

alter table "public"."recurring_expense_exceptions" validate constraint "recurring_expense_exceptions_recurring_expense_id_fkey";

alter table "public"."recurring_expense_exceptions" add constraint "recurring_expense_exceptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."recurring_expense_exceptions" validate constraint "recurring_expense_exceptions_user_id_fkey";

alter table "public"."recurring_expenses" add constraint "recurring_expenses_credit_card_id_fkey" FOREIGN KEY (credit_card_id) REFERENCES public.credit_cards(id) ON DELETE SET NULL not valid;

alter table "public"."recurring_expenses" validate constraint "recurring_expenses_credit_card_id_fkey";

alter table "public"."recurring_expenses" add constraint "recurring_expenses_frequency_check" CHECK ((frequency = ANY (ARRAY['daily'::text, 'weekly'::text, 'bi-weekly'::text, 'monthly'::text, 'yearly'::text, 'weekdays'::text]))) not valid;

alter table "public"."recurring_expenses" validate constraint "recurring_expenses_frequency_check";

alter table "public"."referral_codes" add constraint "check_current_uses_non_negative" CHECK ((current_uses >= 0)) not valid;

alter table "public"."referral_codes" validate constraint "check_current_uses_non_negative";

alter table "public"."referral_codes" add constraint "check_max_uses_positive" CHECK (((max_uses IS NULL) OR (max_uses >= 1))) not valid;

alter table "public"."referral_codes" validate constraint "check_max_uses_positive";

alter table "public"."referral_codes" add constraint "referral_codes_code_key" UNIQUE using index "referral_codes_code_key";

alter table "public"."referral_codes" add constraint "referral_codes_code_unique" UNIQUE using index "referral_codes_code_unique";

alter table "public"."referral_codes" add constraint "referral_codes_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."referral_codes" validate constraint "referral_codes_owner_id_fkey";

alter table "public"."referral_codes" add constraint "valid_code_type" CHECK ((code_type = ANY (ARRAY['user'::text, 'affiliate'::text, 'custom'::text]))) not valid;

alter table "public"."referral_codes" validate constraint "valid_code_type";

alter table "public"."referral_rewards" add constraint "referral_rewards_reward_status_check" CHECK ((reward_status = ANY (ARRAY['pending'::text, 'applied'::text, 'paid'::text]))) not valid;

alter table "public"."referral_rewards" validate constraint "referral_rewards_reward_status_check";

alter table "public"."referral_rewards" add constraint "referral_rewards_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."referral_rewards" validate constraint "referral_rewards_user_id_fkey";

alter table "public"."referral_rewards" add constraint "referral_rewards_user_id_key" UNIQUE using index "referral_rewards_user_id_key";

alter table "public"."referrals" add constraint "referrals_referred_user_id_fkey" FOREIGN KEY (referred_user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."referrals" validate constraint "referrals_referred_user_id_fkey";

alter table "public"."referrals" add constraint "referrals_referred_user_id_key" UNIQUE using index "referrals_referred_user_id_key";

alter table "public"."referrals" add constraint "referrals_referrer_id_fkey" FOREIGN KEY (referrer_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."referrals" validate constraint "referrals_referrer_id_fkey";

alter table "public"."referrals" add constraint "referrals_status_check" CHECK ((status = ANY (ARRAY['trial'::text, 'active'::text, 'canceled'::text]))) not valid;

alter table "public"."referrals" validate constraint "referrals_status_check";

alter table "public"."stripe_customer_audit_log" add constraint "stripe_customer_audit_log_action_check" CHECK ((action = ANY (ARRAY['audit'::text, 'update'::text, 'clear'::text, 'create'::text, 'auto_fix'::text]))) not valid;

alter table "public"."stripe_customer_audit_log" validate constraint "stripe_customer_audit_log_action_check";

alter table "public"."stripe_customer_audit_log" add constraint "stripe_customer_audit_log_performed_by_fkey" FOREIGN KEY (performed_by) REFERENCES auth.users(id) not valid;

alter table "public"."stripe_customer_audit_log" validate constraint "stripe_customer_audit_log_performed_by_fkey";

alter table "public"."stripe_customer_audit_log" add constraint "stripe_customer_audit_log_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."stripe_customer_audit_log" validate constraint "stripe_customer_audit_log_user_id_fkey";

alter table "public"."support_tickets" add constraint "support_tickets_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES auth.users(id) not valid;

alter table "public"."support_tickets" validate constraint "support_tickets_assigned_to_fkey";

alter table "public"."support_tickets" add constraint "support_tickets_claimed_by_fkey" FOREIGN KEY (claimed_by) REFERENCES auth.users(id) not valid;

alter table "public"."support_tickets" validate constraint "support_tickets_claimed_by_fkey";

alter table "public"."support_tickets" add constraint "support_tickets_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]))) not valid;

alter table "public"."support_tickets" validate constraint "support_tickets_priority_check";

alter table "public"."support_tickets" add constraint "support_tickets_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'needs_response'::text, 'resolved'::text, 'closed'::text]))) not valid;

alter table "public"."support_tickets" validate constraint "support_tickets_status_check";

alter table "public"."support_tickets" add constraint "support_tickets_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."support_tickets" validate constraint "support_tickets_user_id_fkey";

alter table "public"."team_invitations" add constraint "team_invitations_account_id_email_key" UNIQUE using index "team_invitations_account_id_email_key";

alter table "public"."team_invitations" add constraint "team_invitations_token_key" UNIQUE using index "team_invitations_token_key";

alter table "public"."ticket_feedback" add constraint "ticket_feedback_rating_check" CHECK (((rating >= 1) AND (rating <= 5))) not valid;

alter table "public"."ticket_feedback" validate constraint "ticket_feedback_rating_check";

alter table "public"."ticket_feedback" add constraint "ticket_feedback_ticket_id_fkey" FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE not valid;

alter table "public"."ticket_feedback" validate constraint "ticket_feedback_ticket_id_fkey";

alter table "public"."ticket_messages" add constraint "ticket_messages_ticket_id_fkey" FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE not valid;

alter table "public"."ticket_messages" validate constraint "ticket_messages_ticket_id_fkey";

alter table "public"."ticket_messages" add constraint "ticket_messages_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."ticket_messages" validate constraint "ticket_messages_user_id_fkey";

alter table "public"."transactions" add constraint "transactions_credit_card_id_fkey" FOREIGN KEY (credit_card_id) REFERENCES public.credit_cards(id) ON DELETE SET NULL not valid;

alter table "public"."transactions" validate constraint "transactions_credit_card_id_fkey";

alter table "public"."transactions" add constraint "transactions_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(id) not valid;

alter table "public"."transactions" validate constraint "transactions_customer_id_fkey";

alter table "public"."transactions" add constraint "transactions_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'paid'::text, 'partially_paid'::text]))) not valid;

alter table "public"."transactions" validate constraint "transactions_status_check";

alter table "public"."transactions" add constraint "transactions_type_check" CHECK ((type = ANY (ARRAY['purchase_order'::text, 'sales_order'::text, 'vendor_payment'::text, 'customer_payment'::text, 'expense'::text]))) not valid;

alter table "public"."transactions" validate constraint "transactions_type_check";

alter table "public"."transactions" add constraint "transactions_vendor_id_fkey" FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) not valid;

alter table "public"."transactions" validate constraint "transactions_vendor_id_fkey";

alter table "public"."trial_addon_usage" add constraint "trial_addon_usage_addon_type_check" CHECK ((addon_type = ANY (ARRAY['bank_account'::text, 'amazon_account'::text, 'user'::text]))) not valid;

alter table "public"."trial_addon_usage" validate constraint "trial_addon_usage_addon_type_check";

alter table "public"."trial_addon_usage" add constraint "trial_addon_usage_user_id_addon_type_key" UNIQUE using index "trial_addon_usage_user_id_addon_type_key";

alter table "public"."trial_addon_usage" add constraint "trial_addon_usage_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."trial_addon_usage" validate constraint "trial_addon_usage_user_id_fkey";

alter table "public"."user_settings" add constraint "user_settings_forecast_confidence_threshold_check" CHECK ((forecast_confidence_threshold = ANY (ARRAY[3, 8, 15]))) not valid;

alter table "public"."user_settings" validate constraint "user_settings_forecast_confidence_threshold_check";

alter table "public"."user_settings" add constraint "user_settings_safe_spending_percentage_check" CHECK (((safe_spending_percentage >= 0) AND (safe_spending_percentage <= 70))) not valid;

alter table "public"."user_settings" validate constraint "user_settings_safe_spending_percentage_check";

alter table "public"."user_settings" add constraint "user_settings_user_id_key" UNIQUE using index "user_settings_user_id_key";

alter table "public"."vendors" add constraint "vendors_payment_method_check" CHECK ((payment_method = ANY (ARRAY['bank-transfer'::text, 'credit-card'::text]))) not valid;

alter table "public"."vendors" validate constraint "vendors_payment_method_check";

alter table "public"."vendors" add constraint "vendors_payment_type_check" CHECK ((payment_type = ANY (ARRAY['due-upon-order'::text, 'net-terms'::text, 'preorder'::text, 'due-upon-delivery'::text]))) not valid;

alter table "public"."vendors" validate constraint "vendors_payment_type_check";

alter table "public"."vendors" add constraint "vendors_source_check" CHECK ((source = ANY (ARRAY['purchase_order'::text, 'management'::text]))) not valid;

alter table "public"."vendors" validate constraint "vendors_source_check";

alter table "public"."vendors" add constraint "vendors_status_check" CHECK ((status = ANY (ARRAY['upcoming'::text, 'current'::text, 'overdue'::text, 'paid'::text]))) not valid;

alter table "public"."vendors" validate constraint "vendors_status_check";

set check_function_bodies = off;

create or replace view "public"."admin_data_visibility_issues" as  SELECT user_id,
    email,
    account_id,
    ( SELECT count(*) AS count
           FROM public.recurring_expenses
          WHERE (recurring_expenses.user_id = p.user_id)) AS recurring_count,
    ( SELECT count(*) AS count
           FROM public.recurring_expenses
          WHERE ((recurring_expenses.user_id = p.user_id) AND (recurring_expenses.account_id IS NULL))) AS recurring_missing_account,
    ( SELECT count(*) AS count
           FROM public.transactions
          WHERE (transactions.user_id = p.user_id)) AS transaction_count,
    ( SELECT count(*) AS count
           FROM public.transactions
          WHERE ((transactions.user_id = p.user_id) AND (transactions.account_id IS NULL))) AS transaction_missing_account
   FROM public.profiles p
  WHERE ((account_id IS NOT NULL) AND ((( SELECT count(*) AS count
           FROM public.recurring_expenses
          WHERE ((recurring_expenses.user_id = p.user_id) AND (recurring_expenses.account_id IS NULL))) > 0) OR (( SELECT count(*) AS count
           FROM public.transactions
          WHERE ((transactions.user_id = p.user_id) AND (transactions.account_id IS NULL))) > 0)));


CREATE OR REPLACE FUNCTION public.apply_referred_user_discount()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- When a referral is created, give the referred user a 10% discount
  IF NEW.status = 'trial' THEN
    -- Update the referred user's profile with a 10% discount
    UPDATE public.profiles
    SET plan_override = 'referred_user_discount'
    WHERE user_id = NEW.referred_user_id;
    
    -- Mark that discount was applied
    NEW.referred_user_discount_applied := TRUE;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_bank_account_balance(account_id_param uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  initial_bal DECIMAL(12,2);
  initial_date TIMESTAMP WITH TIME ZONE;
  transaction_sum DECIMAL(12,2);
BEGIN
  -- Get initial balance and date
  SELECT initial_balance, initial_balance_date
  INTO initial_bal, initial_date
  FROM bank_accounts
  WHERE id = account_id_param;
  
  -- If no initial balance set, return current balance
  IF initial_bal IS NULL THEN
    SELECT balance INTO initial_bal
    FROM bank_accounts
    WHERE id = account_id_param;
    RETURN initial_bal;
  END IF;
  
  -- Sum all transactions since initial date
  -- Negative amounts are debits (money out), positive are credits (money in)
  SELECT COALESCE(SUM(-amount), 0)
  INTO transaction_sum
  FROM bank_transactions
  WHERE bank_account_id = account_id_param
    AND archived = false
    AND date >= initial_date;
  
  RETURN initial_bal + transaction_sum;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_credit_card_balance(card_id_param uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  initial_bal DECIMAL(12,2);
  initial_date TIMESTAMP WITH TIME ZONE;
  transaction_sum DECIMAL(12,2);
BEGIN
  -- Get initial balance and date
  SELECT initial_balance, initial_balance_date
  INTO initial_bal, initial_date
  FROM credit_cards
  WHERE id = card_id_param;
  
  -- If no initial balance set, return current balance
  IF initial_bal IS NULL THEN
    SELECT balance INTO initial_bal
    FROM credit_cards
    WHERE id = card_id_param;
    RETURN initial_bal;
  END IF;
  
  -- Sum all transactions since initial date for this credit card
  -- Credit card transactions are debits (charges increase balance)
  SELECT COALESCE(SUM(amount), 0)
  INTO transaction_sum
  FROM transactions
  WHERE credit_card_id = card_id_param
    AND archived = false
    AND payment_date >= initial_date;
  
  RETURN initial_bal + transaction_sum;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_admin_permission(user_email text)
 RETURNS TABLE(has_permission boolean, role text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    true as has_permission,
    ap.role
  FROM admin_permissions ap
  WHERE ap.email = user_email
    AND ap.account_created = true
  LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.check_user_data_consistency(p_user_id uuid)
 RETURNS TABLE(table_name text, total_records bigint, missing_account_id bigint, account_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_account_id UUID;
BEGIN
  -- Get user's account_id
  SELECT account_id INTO v_account_id
  FROM public.profiles
  WHERE user_id = p_user_id;
  
  -- Check recurring_expenses
  RETURN QUERY
  SELECT 
    'recurring_expenses'::TEXT,
    COUNT(*)::BIGINT as total,
    COUNT(*) FILTER (WHERE re.account_id IS NULL)::BIGINT as missing,
    v_account_id
  FROM public.recurring_expenses re
  WHERE re.user_id = p_user_id;
  
  -- Check transactions
  RETURN QUERY
  SELECT 
    'transactions'::TEXT,
    COUNT(*)::BIGINT as total,
    COUNT(*) FILTER (WHERE t.account_id IS NULL)::BIGINT as missing,
    v_account_id
  FROM public.transactions t
  WHERE t.user_id = p_user_id;
  
  -- Check vendors
  RETURN QUERY
  SELECT 
    'vendors'::TEXT,
    COUNT(*)::BIGINT as total,
    COUNT(*) FILTER (WHERE v.account_id IS NULL)::BIGINT as missing,
    v_account_id
  FROM public.vendors v
  WHERE v.user_id = p_user_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_expired_reset_tokens()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.password_reset_tokens 
  WHERE expires_at < NOW() OR used = TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_old_bank_transactions()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cutoff_date DATE;
  v_deleted_count INTEGER;
BEGIN
  -- Calculate cutoff date (60 days ago, not 45)
  v_cutoff_date := CURRENT_DATE - INTERVAL '60 days';
  
  -- Delete archived bank transactions older than 60 days
  WITH deleted AS (
    DELETE FROM bank_transactions
    WHERE date < v_cutoff_date
    AND archived = true
    RETURNING *
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;
  
  RAISE NOTICE 'Deleted % archived bank transactions older than %', v_deleted_count, v_cutoff_date;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_old_income()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cutoff_date DATE;
  v_deleted_count INTEGER;
BEGIN
  -- Calculate cutoff date (60 days ago)
  v_cutoff_date := CURRENT_DATE - INTERVAL '60 days';
  
  -- Delete archived income records older than 60 days
  WITH deleted AS (
    DELETE FROM income
    WHERE payment_date < v_cutoff_date
    AND archived = true
    AND status = 'received'
    RETURNING *
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;
  
  RAISE NOTICE 'Deleted % archived income records older than %', v_deleted_count, v_cutoff_date;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_old_transactions()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cutoff_date DATE;
  v_deleted_count INTEGER;
BEGIN
  -- Calculate cutoff date (60 days ago)
  v_cutoff_date := CURRENT_DATE - INTERVAL '60 days';
  
  -- Delete archived transactions older than 60 days
  WITH deleted AS (
    DELETE FROM transactions
    WHERE (due_date < v_cutoff_date OR transaction_date < v_cutoff_date)
    AND archived = true
    AND status = 'completed'
    RETURNING *
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;
  
  RAISE NOTICE 'Deleted % archived transactions older than %', v_deleted_count, v_cutoff_date;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.clear_user_documents()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_account_id UUID;
  v_file_record RECORD;
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get user's account_id
  SELECT account_id INTO v_account_id
  FROM profiles
  WHERE user_id = auth.uid();
  
  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'User account not found';
  END IF;
  
  -- Delete all files from storage bucket for this account
  FOR v_file_record IN 
    SELECT file_path 
    FROM documents_metadata 
    WHERE account_id = v_account_id
  LOOP
    PERFORM storage.delete_object('purchase-orders', v_file_record.file_path);
  END LOOP;
  
  -- Delete all metadata records (this will cascade to line items automatically)
  DELETE FROM documents_metadata WHERE account_id = v_account_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_default_categories()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert default expense categories (non-recurring)
  INSERT INTO public.categories (user_id, account_id, name, type, is_default, is_recurring)
  VALUES
    (NEW.user_id, NEW.account_id, 'Utilities', 'expense', true, false),
    (NEW.user_id, NEW.account_id, 'Shipping', 'expense', true, false)
  ON CONFLICT DO NOTHING;
  
  -- Insert default purchase order categories
  INSERT INTO public.categories (user_id, account_id, name, type, is_default, is_recurring)
  VALUES
    (NEW.user_id, NEW.account_id, 'Inventory', 'purchase_order', true, false),
    (NEW.user_id, NEW.account_id, 'Equipment', 'purchase_order', true, false),
    (NEW.user_id, NEW.account_id, 'Supplies', 'purchase_order', true, false)
  ON CONFLICT DO NOTHING;

  -- Insert default income categories (non-recurring)
  INSERT INTO public.categories (user_id, account_id, name, type, is_default, is_recurring)
  VALUES
    (NEW.user_id, NEW.account_id, 'Sales', 'income', true, false),
    (NEW.user_id, NEW.account_id, 'Services', 'income', true, false)
  ON CONFLICT DO NOTHING;

  -- Insert default recurring expense categories (removed Payroll)
  INSERT INTO public.categories (user_id, account_id, name, type, is_default, is_recurring)
  VALUES
    (NEW.user_id, NEW.account_id, 'Software', 'expense', true, true),
    (NEW.user_id, NEW.account_id, 'Loan', 'expense', true, true)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.decrypt_banking_credential(encrypted_text text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  decrypted_value bytea;
BEGIN
  -- Return null if input is null
  IF encrypted_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Try to decrypt using pgsodium
  BEGIN
    decrypted_value := pgsodium.crypto_aead_det_decrypt(
      decode(encrypted_text, 'base64'),
      convert_to('banking_credentials', 'utf8'), -- associated data must match encryption
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'encryption_key' LIMIT 1)::bytea,
      NULL -- nonce (not needed for deterministic encryption)
    );
    
    RETURN convert_from(decrypted_value, 'utf8');
  EXCEPTION
    WHEN OTHERS THEN
      -- If decryption fails, assume it's plain text from old system
      -- This ensures backward compatibility during migration
      RETURN encrypted_text;
  END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.encrypt_banking_credential(plain_text text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  encrypted_value bytea;
BEGIN
  -- Return null if input is null
  IF plain_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Use pgsodium for deterministic encryption (allows lookups but is secure)
  encrypted_value := pgsodium.crypto_aead_det_encrypt(
    convert_to(plain_text, 'utf8'),
    convert_to('banking_credentials', 'utf8'), -- associated data for context
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'encryption_key' LIMIT 1)::bytea,
    NULL -- nonce (not needed for deterministic encryption)
  );
  
  RETURN encode(encrypted_value, 'base64');
EXCEPTION
  WHEN OTHERS THEN
    -- If encryption fails (e.g., no key), return the original text with a warning prefix
    -- This ensures backward compatibility during migration
    RAISE WARNING 'Encryption failed for banking credential: %', SQLERRM;
    RETURN plain_text;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_all_admin_permissions()
 RETURNS TABLE(id uuid, email text, role text, invited_by text, invited_at timestamp with time zone, account_created boolean, first_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    ap.id,
    ap.email,
    ap.role,
    ap.invited_by,
    ap.invited_at,
    ap.account_created,
    ap.first_name
  FROM admin_permissions ap
  ORDER BY ap.invited_at DESC;
$function$
;

CREATE OR REPLACE FUNCTION public.get_amazon_revenue_30_days(p_user_id uuid)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(SUM(amount), 0)
  FROM amazon_transactions
  WHERE user_id = p_user_id
    AND transaction_type = 'Order'
    AND amount > 0
    AND transaction_date >= CURRENT_DATE - INTERVAL '30 days'
    AND transaction_date <= CURRENT_DATE;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_account_id(_user_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT account_id
  FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_plan_limits(p_user_id uuid)
 RETURNS TABLE(plan_name text, bank_connections integer, amazon_connections integer, team_members integer, has_ai_insights boolean, has_ai_pdf_extractor boolean, has_automated_notifications boolean, has_scenario_planning boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_plan_override TEXT;
  v_trial_end TIMESTAMP WITH TIME ZONE;
  v_plan_name TEXT;
BEGIN
  -- Get user's plan override and trial status
  SELECT p.plan_override, p.trial_end INTO v_plan_override, v_trial_end
  FROM profiles p
  WHERE p.user_id = p_user_id;

  -- Determine plan name
  IF v_trial_end IS NOT NULL AND v_trial_end > NOW() THEN
    -- User is in trial, use professional plan limits
    v_plan_name := 'professional';
  ELSIF v_plan_override IS NOT NULL THEN
    -- Extract plan name from override (e.g., 'professional', 'starter', etc.)
    v_plan_name := v_plan_override;
  ELSE
    -- Default to starter plan
    v_plan_name := 'starter';
  END IF;

  -- Return plan limits
  RETURN QUERY
  SELECT 
    pl.plan_name,
    pl.bank_connections,
    pl.amazon_connections,
    pl.team_members,
    pl.has_ai_insights,
    pl.has_ai_pdf_extractor,
    pl.has_automated_notifications,
    pl.has_scenario_planning
  FROM plan_limits pl
  WHERE pl.plan_name = v_plan_name;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_affiliate_churn()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_affiliate_id UUID;
BEGIN
  -- Only process if status changed from 'active' to 'churned'
  IF OLD.status = 'active' AND NEW.status = 'churned' THEN
    v_affiliate_id := NEW.affiliate_id;
    
    -- Deduct commission for churned customer
    -- You might want to track how much commission was already paid for this referral
    -- and adjust pending_commission accordingly
    UPDATE affiliates
    SET 
      pending_commission = GREATEST(0, pending_commission - COALESCE(NEW.commission_amount, 0)),
      updated_at = NOW()
    WHERE id = v_affiliate_id;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    user_id, 
    first_name, 
    last_name, 
    email,
    company,
    monthly_amazon_revenue,
    hear_about_us,
    referral_code,
    trial_start,
    trial_end,
    plan_tier
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.email,
    NEW.raw_user_meta_data ->> 'company',
    NEW.raw_user_meta_data ->> 'monthly_amazon_revenue',
    NEW.raw_user_meta_data ->> 'hear_about_us',
    NEW.raw_user_meta_data ->> 'referral_code',
    now(),
    now() + interval '168 hours',
    'professional'
  );
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Create owner role using the account_id from the NEW profile record
  IF NEW.account_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, account_id, role)
    VALUES (NEW.user_id, NEW.account_id, 'owner'::app_role)
    ON CONFLICT (user_id, account_id) WHERE account_id IS NOT NULL DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.has_admin_role(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'::app_role
  )
$function$
;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _account_id uuid, _role public.app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND account_id = _account_id
      AND role = _role
  );
$function$
;

CREATE OR REPLACE FUNCTION public.increment_affiliate_commission(p_affiliate_id uuid, p_commission_amount numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE affiliates
  SET 
    pending_commission = pending_commission + p_commission_amount,
    total_commission_earned = total_commission_earned + p_commission_amount,
    paid_referrals = paid_referrals + 1,
    trial_referrals = GREATEST(0, trial_referrals - 1),
    updated_at = NOW()
  WHERE id = p_affiliate_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_referral_code_usage(p_code text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE referral_codes
  SET 
    current_uses = current_uses + 1,
    last_used_at = NOW()
  WHERE code = p_code;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.insert_secure_amazon_account(p_seller_id text, p_marketplace_id text, p_marketplace_name text, p_account_name text, p_refresh_token text DEFAULT NULL::text, p_access_token text DEFAULT NULL::text, p_client_id text DEFAULT NULL::text, p_client_secret text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  new_id UUID;
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate required fields
  IF p_seller_id IS NULL OR p_marketplace_id IS NULL OR p_marketplace_name IS NULL OR p_account_name IS NULL THEN
    RAISE EXCEPTION 'Seller ID, marketplace ID, marketplace name, and account name are required';
  END IF;

  -- Insert with encrypted sensitive data
  INSERT INTO public.amazon_accounts (
    user_id,
    seller_id,
    marketplace_id,
    marketplace_name,
    account_name,
    encrypted_refresh_token,
    encrypted_access_token,
    encrypted_client_id,
    encrypted_client_secret,
    last_sync
  ) VALUES (
    auth.uid(),
    p_seller_id,
    p_marketplace_id,
    p_marketplace_name,
    p_account_name,
    encrypt_banking_credential(p_refresh_token),
    encrypt_banking_credential(p_access_token),
    encrypt_banking_credential(p_client_id),
    encrypt_banking_credential(p_client_secret),
    NOW()
  ) RETURNING id INTO new_id;

  RETURN new_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.insert_secure_bank_account(p_institution_name text DEFAULT NULL::text, p_account_name text DEFAULT NULL::text, p_account_type text DEFAULT NULL::text, p_balance numeric DEFAULT 0, p_available_balance numeric DEFAULT NULL::numeric, p_currency_code text DEFAULT 'USD'::text, p_access_token text DEFAULT NULL::text, p_account_number text DEFAULT NULL::text, p_plaid_item_id text DEFAULT NULL::text, p_plaid_account_id text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  new_id UUID;
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate required fields
  IF p_institution_name IS NULL OR p_account_name IS NULL OR p_account_type IS NULL THEN
    RAISE EXCEPTION 'Institution name, account name, and account type are required';
  END IF;

  -- Insert with encrypted sensitive data
  INSERT INTO public.bank_accounts (
    user_id,
    institution_name,
    account_name,
    account_type,
    balance,
    available_balance,
    currency_code,
    encrypted_access_token,
    encrypted_account_number,
    encrypted_plaid_item_id,
    plaid_account_id,
    account_id,
    last_sync
  ) VALUES (
    auth.uid(),
    p_institution_name,
    p_account_name,
    p_account_type,
    p_balance,
    p_available_balance,
    p_currency_code,
    encrypt_banking_credential(p_access_token),
    encrypt_banking_credential(p_account_number),
    encrypt_banking_credential(p_plaid_item_id),
    p_plaid_account_id,
    COALESCE(p_plaid_account_id, gen_random_uuid()::text),
    NOW()
  ) RETURNING id INTO new_id;

  RETURN new_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.insert_secure_bank_account_simple(p_institution_name text, p_account_name text, p_account_type text, p_balance numeric, p_available_balance numeric, p_currency_code text, p_access_token text, p_account_number text, p_plaid_item_id text, p_plaid_account_id text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_account_id UUID;
BEGIN
  INSERT INTO bank_accounts (
    user_id,
    institution_name,
    account_name,
    account_type,
    account_id,
    balance,
    available_balance,
    currency_code,
    plaid_account_id,
    encrypted_access_token,
    encrypted_plaid_item_id,
    last_sync
  ) VALUES (
    auth.uid(),
    p_institution_name,
    p_account_name,
    p_account_type,
    COALESCE(p_plaid_account_id, gen_random_uuid()::text),
    p_balance,
    p_available_balance,
    p_currency_code,
    p_plaid_account_id,
    p_access_token,  -- Store directly
    p_plaid_item_id, -- Store directly
    NOW()
  ) RETURNING id INTO v_account_id;
  
  RETURN v_account_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.insert_secure_credit_card(p_institution_name text DEFAULT NULL::text, p_account_name text DEFAULT NULL::text, p_account_type text DEFAULT 'credit'::text, p_balance numeric DEFAULT 0, p_credit_limit numeric DEFAULT 0, p_available_credit numeric DEFAULT NULL::numeric, p_currency_code text DEFAULT 'USD'::text, p_access_token text DEFAULT NULL::text, p_account_number text DEFAULT NULL::text, p_plaid_item_id text DEFAULT NULL::text, p_plaid_account_id text DEFAULT NULL::text, p_minimum_payment numeric DEFAULT 0, p_payment_due_date date DEFAULT NULL::date, p_statement_close_date date DEFAULT NULL::date, p_annual_fee numeric DEFAULT 0, p_interest_rate numeric DEFAULT 0)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  new_id UUID;
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate required fields
  IF p_institution_name IS NULL OR p_account_name IS NULL THEN
    RAISE EXCEPTION 'Institution name and account name are required';
  END IF;

  -- Calculate available credit if not provided
  IF p_available_credit IS NULL THEN
    p_available_credit := p_credit_limit - p_balance;
  END IF;

  -- Insert with encrypted sensitive data
  INSERT INTO public.credit_cards (
    user_id,
    institution_name,
    account_name,
    account_type,
    balance,
    credit_limit,
    available_credit,
    currency_code,
    encrypted_access_token,
    encrypted_account_number,
    encrypted_plaid_item_id,
    plaid_account_id,
    minimum_payment,
    payment_due_date,
    statement_close_date,
    annual_fee,
    interest_rate,
    last_sync
  ) VALUES (
    auth.uid(),
    p_institution_name,
    p_account_name,
    p_account_type,
    p_balance,
    p_credit_limit,
    p_available_credit,
    p_currency_code,
    encrypt_banking_credential(p_access_token),
    encrypt_banking_credential(p_account_number),
    encrypt_banking_credential(p_plaid_item_id),
    p_plaid_account_id,
    p_minimum_payment,
    p_payment_due_date,
    p_statement_close_date,
    p_annual_fee,
    p_interest_rate,
    NOW()
  ) RETURNING id INTO new_id;

  RETURN new_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.insert_secure_credit_card_simple(p_institution_name text, p_account_name text, p_account_type text, p_balance numeric, p_credit_limit numeric, p_available_credit numeric, p_currency_code text, p_access_token text, p_account_number text, p_plaid_item_id text, p_plaid_account_id text, p_minimum_payment numeric, p_payment_due_date date, p_statement_close_date date, p_annual_fee numeric, p_cash_back numeric DEFAULT 0, p_priority integer DEFAULT NULL::integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_card_id UUID;
BEGIN
  INSERT INTO credit_cards (
    user_id,
    institution_name,
    account_name,
    account_type,
    balance,
    credit_limit,
    available_credit,
    currency_code,
    plaid_account_id,
    encrypted_access_token,
    encrypted_plaid_item_id,
    minimum_payment,
    payment_due_date,
    statement_close_date,
    annual_fee,
    cash_back,
    priority,
    last_sync
  ) VALUES (
    auth.uid(),
    p_institution_name,
    p_account_name,
    p_account_type,
    p_balance,
    p_credit_limit,
    p_available_credit,
    p_currency_code,
    p_plaid_account_id,
    p_access_token,
    p_plaid_item_id,
    p_minimum_payment,
    p_payment_due_date,
    p_statement_close_date,
    p_annual_fee,
    p_cash_back,
    p_priority,  -- Will be NULL if not provided
    NOW()
  ) RETURNING id INTO v_card_id;
  
  RETURN v_card_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_account_admin(_user_id uuid, _account_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND account_id = _account_id
      AND role IN ('owner', 'admin')
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin_staff()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT is_website_admin()
  OR EXISTS (
    SELECT 1 FROM public.admin_permissions
    WHERE admin_permissions.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND admin_permissions.account_created = true
  )
$function$
;

CREATE OR REPLACE FUNCTION public.is_website_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND account_id IS NULL
      AND role = 'admin'::app_role
  )
$function$
;

CREATE OR REPLACE FUNCTION public.log_duplicate_amazon_attempt()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_existing_email TEXT;
  v_attempting_email TEXT;
BEGIN
  -- Only trigger on duplicate attempts (when validation would fail)
  IF NEW.is_active = true THEN
    -- Check if there's an existing active connection
    SELECT au.email INTO v_existing_email
    FROM amazon_accounts aa
    JOIN auth.users au ON au.id = aa.user_id
    WHERE aa.seller_id = NEW.seller_id 
      AND aa.is_active = true
      AND aa.id != NEW.id
    LIMIT 1;
    
    IF v_existing_email IS NOT NULL THEN
      -- Get attempting user's email
      SELECT email INTO v_attempting_email
      FROM auth.users
      WHERE id = NEW.user_id;
      
      -- Create support ticket for investigation
      INSERT INTO support_tickets (
        user_id, subject, message, category, priority, status
      ) VALUES (
        NEW.user_id,
        'Duplicate Amazon Seller Connection Attempt',
        format('User %s attempted to connect Amazon Seller ID %s which is already connected to account %s. This requires investigation to determine rightful ownership.', 
          v_attempting_email, NEW.seller_id, v_existing_email),
        'Security Alert',
        'high',
        'open'
      );
      
      -- Log in audit table
      INSERT INTO amazon_connection_audit (
        seller_id, previous_user_id, new_user_id, action, reason, performed_by
      ) VALUES (
        NEW.seller_id, 
        (SELECT user_id FROM amazon_accounts WHERE seller_id = NEW.seller_id AND is_active = true AND id != NEW.id LIMIT 1),
        NEW.user_id,
        'blocked_duplicate',
        'Duplicate seller_id connection attempt',
        auth.uid()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_recurring_expense_access()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Log when recurring expenses are queried with potential RLS issues
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.audit_logs (
      table_name,
      operation,
      user_id,
      record_id,
      metadata
    ) VALUES (
      'recurring_expenses',
      TG_OP,
      auth.uid(),
      CASE 
        WHEN TG_OP = 'DELETE' THEN OLD.id
        ELSE NEW.id
      END,
      jsonb_build_object(
        'account_id', CASE 
          WHEN TG_OP = 'DELETE' THEN OLD.account_id
          ELSE NEW.account_id
        END,
        'timestamp', NOW()
      )
    );
  END IF;
  
  RETURN CASE 
    WHEN TG_OP = 'DELETE' THEN OLD
    ELSE NEW
  END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_customer_on_staff_response()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Function kept for compatibility but no longer sends notifications
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_customer_on_ticket_closed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Function kept for compatibility but no longer sends notifications
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_unauthorized_account_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Prevent changing account_id unless user is admin
  IF OLD.account_id IS DISTINCT FROM NEW.account_id THEN
    IF NOT is_website_admin() THEN
      RAISE EXCEPTION 'Unauthorized account_id modification. Contact support at support@auren.app';
    END IF;
    
    -- Log the change
    INSERT INTO account_modification_audit (
      table_name, record_id, old_account_id, new_account_id, 
      modified_by, modified_at
    ) VALUES (
      TG_TABLE_NAME, NEW.id, OLD.account_id, NEW.account_id,
      auth.uid(), NOW()
    );
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_account_id_from_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.account_id IS NULL THEN
    NEW.account_id := (SELECT account_id FROM profiles WHERE user_id = auth.uid());
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_user_id_with_account()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- If account_id is set, ensure user_id matches an owner of that account
  IF NEW.account_id IS NOT NULL THEN
    -- Get the account owner's user_id
    SELECT user_id INTO NEW.user_id
    FROM profiles
    WHERE account_id = NEW.account_id
    AND is_account_owner = true
    LIMIT 1;
    
    -- If no owner found, use the current user_id but log a warning
    IF NEW.user_id IS NULL THEN
      RAISE WARNING 'No account owner found for account_id %, keeping user_id %', NEW.account_id, NEW.user_id;
      -- Keep the existing user_id instead of setting to null
      NEW.user_id := COALESCE(NEW.user_id, auth.uid());
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.track_affiliate_referral()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_affiliate_id UUID;
  v_affiliate_code TEXT;
BEGIN
  -- Extract affiliate_code from user metadata
  SELECT (NEW.raw_user_meta_data->>'affiliate_code') INTO v_affiliate_code;
  
  -- Only proceed if affiliate_code exists
  IF v_affiliate_code IS NOT NULL THEN
    -- Validate affiliate code exists and is approved
    SELECT id INTO v_affiliate_id
    FROM affiliates
    WHERE affiliate_code = v_affiliate_code
      AND status = 'approved'
    LIMIT 1;
    
    -- If valid affiliate found, create referral record
    IF v_affiliate_id IS NOT NULL THEN
      INSERT INTO affiliate_referrals (
        affiliate_id,
        referred_user_id,
        status
      ) VALUES (
        v_affiliate_id,
        NEW.id,
        'trial'
      );
      
      -- Update affiliate metrics
      UPDATE affiliates
      SET 
        trial_referrals = trial_referrals + 1,
        total_referrals = total_referrals + 1,
        updated_at = NOW()
      WHERE id = v_affiliate_id;
      
      RAISE NOTICE 'Created affiliate referral for user % with affiliate %', NEW.id, v_affiliate_id;
    ELSE
      RAISE NOTICE 'Affiliate code % not found or not approved', v_affiliate_code;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_affiliate_commission_rate()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Set commission rate based on tier
  -- starter: 15%, growth: 20%, pro: 25%, elite: 30%, god: 35%
  CASE NEW.tier
    WHEN 'god' THEN NEW.commission_rate := 35;
    WHEN 'elite' THEN NEW.commission_rate := 30;
    WHEN 'pro' THEN NEW.commission_rate := 25;
    WHEN 'growth' THEN NEW.commission_rate := 20;
    ELSE NEW.commission_rate := 15;
  END CASE;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_affiliate_tier()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_trial_count INTEGER;
  v_paid_count INTEGER;
  v_churned_count INTEGER;
  v_total_count INTEGER;
  v_new_tier TEXT;
BEGIN
  -- Count trial referrals (status = 'trial')
  SELECT COUNT(*) INTO v_trial_count
  FROM affiliate_referrals
  WHERE affiliate_id = NEW.affiliate_id AND status = 'trial';
  
  -- Count paid referrals (status = 'active')
  SELECT COUNT(*) INTO v_paid_count
  FROM affiliate_referrals
  WHERE affiliate_id = NEW.affiliate_id AND status = 'active';
  
  -- Count churned referrals (status = 'churned')
  SELECT COUNT(*) INTO v_churned_count
  FROM affiliate_referrals
  WHERE affiliate_id = NEW.affiliate_id AND status = 'churned';
  
  -- Total count (excluding churned)
  v_total_count := v_trial_count + v_paid_count;
  
  -- Determine tier based on PAID referral count only (churned not counted)
  -- starter: 0-10 (15%), growth: 11-30 (20%), pro: 31-50 (25%), elite: 51-100 (30%), god: 100+ (35%)
  CASE
    WHEN v_paid_count >= 100 THEN v_new_tier := 'god';
    WHEN v_paid_count >= 51 THEN v_new_tier := 'elite';
    WHEN v_paid_count >= 31 THEN v_new_tier := 'pro';
    WHEN v_paid_count >= 11 THEN v_new_tier := 'growth';
    ELSE v_new_tier := 'starter';
  END CASE;
  
  -- Update the affiliate's tier and referral counts
  UPDATE affiliates
  SET 
    tier = v_new_tier,
    trial_referrals = v_trial_count,
    paid_referrals = v_paid_count,
    churned_referrals = v_churned_count,
    total_referrals = v_total_count,
    updated_at = NOW()
  WHERE id = NEW.affiliate_id;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_amazon_daily_draws_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_bank_account_balance()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE bank_accounts
  SET 
    balance = calculate_bank_account_balance(NEW.bank_account_id),
    updated_at = NOW()
  WHERE id = NEW.bank_account_id;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_bank_accounts_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_bank_balance_on_transaction_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Update bank account balance
  IF TG_OP = 'DELETE' THEN
    UPDATE bank_accounts
    SET 
      balance = calculate_bank_account_balance(OLD.bank_account_id),
      available_balance = calculate_bank_account_balance(OLD.bank_account_id),
      updated_at = NOW()
    WHERE id = OLD.bank_account_id;
    RETURN OLD;
  ELSE
    UPDATE bank_accounts
    SET 
      balance = calculate_bank_account_balance(NEW.bank_account_id),
      available_balance = calculate_bank_account_balance(NEW.bank_account_id),
      updated_at = NOW()
    WHERE id = NEW.bank_account_id;
    RETURN NEW;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_credit_card_balance_on_transaction_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Update credit card balance
  IF TG_OP = 'DELETE' THEN
    UPDATE credit_cards
    SET 
      balance = calculate_credit_card_balance(OLD.credit_card_id),
      available_credit = credit_limit - calculate_credit_card_balance(OLD.credit_card_id),
      updated_at = NOW()
    WHERE id = OLD.credit_card_id;
    RETURN OLD;
  ELSE
    UPDATE credit_cards
    SET 
      balance = calculate_credit_card_balance(NEW.credit_card_id),
      available_credit = credit_limit - calculate_credit_card_balance(NEW.credit_card_id),
      updated_at = NOW()
    WHERE id = NEW.credit_card_id;
    RETURN NEW;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_notification_preferences_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_purchase_order_line_items_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_referral_rewards()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_referrer_id UUID;
  v_current_count INTEGER;
  v_new_tier INTEGER;
  v_discount_pct INTEGER;
  v_cash_bonus NUMERIC;
  v_duration_months INTEGER;
  v_old_tier INTEGER;
BEGIN
  -- Only process when status changes to 'active'
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    v_referrer_id := NEW.referrer_id;
    
    -- Get current active referral count
    SELECT COUNT(*) INTO v_current_count
    FROM referrals
    WHERE referrer_id = v_referrer_id AND status = 'active';
    
    -- Determine tier based on count
    -- Tiers: 1, 2, 5, 10, 20, 50, 100
    CASE
      WHEN v_current_count >= 100 THEN 
        v_new_tier := 7;
        v_discount_pct := 0; -- 6 months free
        v_cash_bonus := 2000; -- Updated from 3000 to 2000
        v_duration_months := 6;
      WHEN v_current_count >= 50 THEN 
        v_new_tier := 6;
        v_discount_pct := 50;
        v_cash_bonus := 1000;
        v_duration_months := 3;
      WHEN v_current_count >= 20 THEN 
        v_new_tier := 5;
        v_discount_pct := 40;
        v_cash_bonus := 200;
        v_duration_months := 3;
      WHEN v_current_count >= 10 THEN 
        v_new_tier := 4;
        v_discount_pct := 30;
        v_cash_bonus := 100;
        v_duration_months := 3;
      WHEN v_current_count >= 5 THEN 
        v_new_tier := 3;
        v_discount_pct := 25;
        v_cash_bonus := 50;
        v_duration_months := 3;
      WHEN v_current_count >= 2 THEN 
        v_new_tier := 2;
        v_discount_pct := 20;
        v_cash_bonus := 0;
        v_duration_months := 3;
      WHEN v_current_count >= 1 THEN 
        v_new_tier := 1;
        v_discount_pct := 15;
        v_cash_bonus := 0;
        v_duration_months := 3;
      ELSE
        v_new_tier := 0;
        v_discount_pct := 0;
        v_cash_bonus := 0;
        v_duration_months := 0;
    END CASE;
    
    -- Get old tier
    SELECT COALESCE(tier_level, 0) INTO v_old_tier
    FROM referral_rewards
    WHERE user_id = v_referrer_id;
    
    -- Update or insert referral_rewards
    INSERT INTO referral_rewards (
      user_id,
      referral_count,
      tier_level,
      discount_percentage,
      cash_bonus,
      pending_cash_bonus,
      discount_start_date,
      discount_end_date,
      total_cash_earned,
      reward_status
    ) VALUES (
      v_referrer_id,
      v_current_count,
      v_new_tier,
      v_discount_pct,
      v_cash_bonus,
      v_cash_bonus,
      NOW(),
      NOW() + (v_duration_months || ' months')::INTERVAL,
      v_cash_bonus,
      'active'
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
      referral_count = v_current_count,
      tier_level = v_new_tier,
      discount_percentage = v_discount_pct,
      cash_bonus = v_cash_bonus,
      pending_cash_bonus = CASE 
        WHEN v_new_tier > v_old_tier AND v_cash_bonus > 0 
        THEN referral_rewards.pending_cash_bonus + v_cash_bonus
        ELSE referral_rewards.pending_cash_bonus
      END,
      discount_start_date = NOW(),
      discount_end_date = NOW() + (v_duration_months || ' months')::INTERVAL,
      total_cash_earned = referral_rewards.total_cash_earned + v_cash_bonus,
      reward_status = 'active',
      updated_at = NOW();
    
    -- Create support ticket for cash bonus redemption if tier increased and has cash bonus
    IF v_new_tier > v_old_tier AND v_cash_bonus > 0 THEN
      INSERT INTO support_tickets (
        user_id,
        subject,
        message,
        category,
        status,
        priority
      ) VALUES (
        v_referrer_id,
        'Referral Cash Bonus Redemption - Tier ' || v_new_tier,
        'Congratulations! You have reached ' || v_current_count || ' referrals and earned a $' || v_cash_bonus || ' cash bonus. Please provide your payment details to redeem this reward.',
        'Referral Rewards',
        'open',
        'high'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_secure_amazon_account(p_account_id uuid, p_account_name text DEFAULT NULL::text, p_refresh_token text DEFAULT NULL::text, p_access_token text DEFAULT NULL::text, p_client_id text DEFAULT NULL::text, p_client_secret text DEFAULT NULL::text, p_token_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Update with encryption for sensitive fields (RLS will enforce ownership)
  UPDATE public.amazon_accounts SET
    account_name = COALESCE(p_account_name, account_name),
    encrypted_refresh_token = CASE 
      WHEN p_refresh_token IS NOT NULL THEN encrypt_banking_credential(p_refresh_token)
      ELSE encrypted_refresh_token 
    END,
    encrypted_access_token = CASE 
      WHEN p_access_token IS NOT NULL THEN encrypt_banking_credential(p_access_token)
      ELSE encrypted_access_token 
    END,
    encrypted_client_id = CASE 
      WHEN p_client_id IS NOT NULL THEN encrypt_banking_credential(p_client_id)
      ELSE encrypted_client_id 
    END,
    encrypted_client_secret = CASE 
      WHEN p_client_secret IS NOT NULL THEN encrypt_banking_credential(p_client_secret)
      ELSE encrypted_client_secret 
    END,
    token_expires_at = COALESCE(p_token_expires_at, token_expires_at),
    last_sync = NOW(),
    updated_at = NOW()
  WHERE id = p_account_id AND user_id = auth.uid();

  RETURN FOUND;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_secure_bank_account(p_account_id uuid, p_institution_name text DEFAULT NULL::text, p_account_name text DEFAULT NULL::text, p_account_type text DEFAULT NULL::text, p_balance numeric DEFAULT NULL::numeric, p_available_balance numeric DEFAULT NULL::numeric, p_currency_code text DEFAULT NULL::text, p_access_token text DEFAULT NULL::text, p_account_number text DEFAULT NULL::text, p_plaid_item_id text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Update with encryption for sensitive fields (RLS will enforce ownership)
  UPDATE public.bank_accounts SET
    institution_name = COALESCE(p_institution_name, institution_name),
    account_name = COALESCE(p_account_name, account_name),
    account_type = COALESCE(p_account_type, account_type),
    balance = COALESCE(p_balance, balance),
    available_balance = COALESCE(p_available_balance, available_balance),
    currency_code = COALESCE(p_currency_code, currency_code),
    encrypted_access_token = CASE 
      WHEN p_access_token IS NOT NULL THEN encrypt_banking_credential(p_access_token)
      ELSE encrypted_access_token 
    END,
    encrypted_account_number = CASE 
      WHEN p_account_number IS NOT NULL THEN encrypt_banking_credential(p_account_number)
      ELSE encrypted_account_number 
    END,
    encrypted_plaid_item_id = CASE 
      WHEN p_plaid_item_id IS NOT NULL THEN encrypt_banking_credential(p_plaid_item_id)
      ELSE encrypted_plaid_item_id 
    END,
    updated_at = NOW()
  WHERE id = p_account_id AND user_id = auth.uid();

  RETURN FOUND;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_secure_credit_card(p_card_id uuid, p_institution_name text DEFAULT NULL::text, p_account_name text DEFAULT NULL::text, p_account_type text DEFAULT NULL::text, p_balance numeric DEFAULT NULL::numeric, p_credit_limit numeric DEFAULT NULL::numeric, p_available_credit numeric DEFAULT NULL::numeric, p_currency_code text DEFAULT NULL::text, p_access_token text DEFAULT NULL::text, p_account_number text DEFAULT NULL::text, p_plaid_item_id text DEFAULT NULL::text, p_plaid_account_id text DEFAULT NULL::text, p_minimum_payment numeric DEFAULT NULL::numeric, p_payment_due_date date DEFAULT NULL::date, p_statement_close_date date DEFAULT NULL::date, p_annual_fee numeric DEFAULT NULL::numeric, p_cash_back numeric DEFAULT NULL::numeric, p_priority integer DEFAULT NULL::integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Update with encryption for sensitive fields (RLS will enforce ownership)
  UPDATE public.credit_cards SET
    institution_name = COALESCE(p_institution_name, institution_name),
    account_name = COALESCE(p_account_name, account_name),
    account_type = COALESCE(p_account_type, account_type),
    balance = COALESCE(p_balance, balance),
    credit_limit = COALESCE(p_credit_limit, credit_limit),
    available_credit = COALESCE(p_available_credit, available_credit),
    currency_code = COALESCE(p_currency_code, currency_code),
    encrypted_access_token = CASE 
      WHEN p_access_token IS NOT NULL THEN encrypt_banking_credential(p_access_token)
      ELSE encrypted_access_token 
    END,
    encrypted_account_number = CASE 
      WHEN p_account_number IS NOT NULL THEN encrypt_banking_credential(p_account_number)
      ELSE encrypted_account_number 
    END,
    encrypted_plaid_item_id = CASE 
      WHEN p_plaid_item_id IS NOT NULL THEN encrypt_banking_credential(p_plaid_item_id)
      ELSE encrypted_plaid_item_id 
    END,
    plaid_account_id = COALESCE(p_plaid_account_id, plaid_account_id),
    minimum_payment = COALESCE(p_minimum_payment, minimum_payment),
    payment_due_date = COALESCE(p_payment_due_date, payment_due_date),
    statement_close_date = COALESCE(p_statement_close_date, statement_close_date),
    annual_fee = COALESCE(p_annual_fee, annual_fee),
    cash_back = COALESCE(p_cash_back, cash_back),
    priority = COALESCE(p_priority, priority),
    updated_at = NOW()
  WHERE id = p_card_id AND user_id = auth.uid();

  RETURN FOUND;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_secure_credit_card(p_card_id uuid, p_institution_name text DEFAULT NULL::text, p_account_name text DEFAULT NULL::text, p_account_type text DEFAULT NULL::text, p_balance numeric DEFAULT NULL::numeric, p_credit_limit numeric DEFAULT NULL::numeric, p_available_credit numeric DEFAULT NULL::numeric, p_currency_code text DEFAULT NULL::text, p_access_token text DEFAULT NULL::text, p_account_number text DEFAULT NULL::text, p_plaid_item_id text DEFAULT NULL::text, p_plaid_account_id text DEFAULT NULL::text, p_minimum_payment numeric DEFAULT NULL::numeric, p_payment_due_date date DEFAULT NULL::date, p_statement_close_date date DEFAULT NULL::date, p_annual_fee numeric DEFAULT NULL::numeric, p_interest_rate numeric DEFAULT NULL::numeric)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Update with encryption for sensitive fields (RLS will enforce ownership)
  UPDATE public.credit_cards SET
    institution_name = COALESCE(p_institution_name, institution_name),
    account_name = COALESCE(p_account_name, account_name),
    account_type = COALESCE(p_account_type, account_type),
    balance = COALESCE(p_balance, balance),
    credit_limit = COALESCE(p_credit_limit, credit_limit),
    available_credit = COALESCE(p_available_credit, available_credit),
    currency_code = COALESCE(p_currency_code, currency_code),
    encrypted_access_token = CASE 
      WHEN p_access_token IS NOT NULL THEN encrypt_banking_credential(p_access_token)
      ELSE encrypted_access_token 
    END,
    encrypted_account_number = CASE 
      WHEN p_account_number IS NOT NULL THEN encrypt_banking_credential(p_account_number)
      ELSE encrypted_account_number 
    END,
    encrypted_plaid_item_id = CASE 
      WHEN p_plaid_item_id IS NOT NULL THEN encrypt_banking_credential(p_plaid_item_id)
      ELSE encrypted_plaid_item_id 
    END,
    plaid_account_id = COALESCE(p_plaid_account_id, plaid_account_id),
    minimum_payment = COALESCE(p_minimum_payment, minimum_payment),
    payment_due_date = COALESCE(p_payment_due_date, payment_due_date),
    statement_close_date = COALESCE(p_statement_close_date, statement_close_date),
    annual_fee = COALESCE(p_annual_fee, annual_fee),
    interest_rate = COALESCE(p_interest_rate, interest_rate),
    updated_at = NOW()
  WHERE id = p_card_id AND user_id = auth.uid();

  RETURN FOUND;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_secure_credit_card(p_card_id uuid, p_institution_name text DEFAULT NULL::text, p_account_name text DEFAULT NULL::text, p_account_type text DEFAULT NULL::text, p_balance numeric DEFAULT NULL::numeric, p_statement_balance numeric DEFAULT NULL::numeric, p_credit_limit numeric DEFAULT NULL::numeric, p_available_credit numeric DEFAULT NULL::numeric, p_currency_code text DEFAULT NULL::text, p_access_token text DEFAULT NULL::text, p_account_number text DEFAULT NULL::text, p_plaid_item_id text DEFAULT NULL::text, p_plaid_account_id text DEFAULT NULL::text, p_minimum_payment numeric DEFAULT NULL::numeric, p_payment_due_date date DEFAULT NULL::date, p_statement_close_date date DEFAULT NULL::date, p_annual_fee numeric DEFAULT NULL::numeric, p_cash_back numeric DEFAULT NULL::numeric, p_priority integer DEFAULT NULL::integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Update with encryption for sensitive fields (RLS will enforce ownership)
  UPDATE public.credit_cards SET
    institution_name = COALESCE(p_institution_name, institution_name),
    account_name = COALESCE(p_account_name, account_name),
    account_type = COALESCE(p_account_type, account_type),
    balance = COALESCE(p_balance, balance),
    statement_balance = COALESCE(p_statement_balance, statement_balance),
    credit_limit = COALESCE(p_credit_limit, credit_limit),
    available_credit = COALESCE(p_available_credit, available_credit),
    currency_code = COALESCE(p_currency_code, currency_code),
    encrypted_access_token = CASE 
      WHEN p_access_token IS NOT NULL THEN encrypt_banking_credential(p_access_token)
      ELSE encrypted_access_token 
    END,
    encrypted_account_number = CASE 
      WHEN p_account_number IS NOT NULL THEN encrypt_banking_credential(p_account_number)
      ELSE encrypted_account_number 
    END,
    encrypted_plaid_item_id = CASE 
      WHEN p_plaid_item_id IS NOT NULL THEN encrypt_banking_credential(p_plaid_item_id)
      ELSE encrypted_plaid_item_id 
    END,
    plaid_account_id = COALESCE(p_plaid_account_id, plaid_account_id),
    minimum_payment = COALESCE(p_minimum_payment, minimum_payment),
    payment_due_date = COALESCE(p_payment_due_date, payment_due_date),
    statement_close_date = COALESCE(p_statement_close_date, statement_close_date),
    annual_fee = COALESCE(p_annual_fee, annual_fee),
    cash_back = COALESCE(p_cash_back, cash_back),
    priority = COALESCE(p_priority, priority),
    updated_at = NOW()
  WHERE id = p_card_id AND user_id = auth.uid();

  RETURN FOUND;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_ticket_status_on_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ticket_user_id UUID;
BEGIN
  -- Get the ticket owner's user_id
  SELECT user_id INTO v_ticket_user_id
  FROM support_tickets
  WHERE id = NEW.ticket_id;
  
  -- If message is from the ticket owner (customer), set to needs_response
  IF NEW.user_id = v_ticket_user_id THEN
    UPDATE support_tickets
    SET status = 'needs_response',
        updated_at = NOW()
    WHERE id = NEW.ticket_id
      AND status NOT IN ('resolved', 'closed');
  
  -- If message is from someone else (admin), set to open (awaiting customer response)
  ELSE
    UPDATE support_tickets
    SET status = 'open',
        updated_at = NOW()
    WHERE id = NEW.ticket_id
      AND status NOT IN ('resolved', 'closed');
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.user_belongs_to_account(_account_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE user_id = auth.uid()
    AND account_id = _account_id
  );
$function$
;

CREATE OR REPLACE FUNCTION public.validate_amazon_seller_uniqueness()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_existing_user_id UUID;
  v_existing_email TEXT;
BEGIN
  -- Only check if activating an account
  IF NEW.is_active = true THEN
    -- Check if seller_id already exists for another active account by a DIFFERENT user
    SELECT aa.user_id, au.email INTO v_existing_user_id, v_existing_email
    FROM amazon_accounts aa
    JOIN auth.users au ON au.id = aa.user_id
    WHERE aa.seller_id = NEW.seller_id 
      AND aa.is_active = true
      AND aa.id != NEW.id
      AND aa.user_id != NEW.user_id  -- CRITICAL: Only block if it's a different user
    LIMIT 1;
    
    IF v_existing_user_id IS NOT NULL THEN
      RAISE EXCEPTION 'Amazon Seller ID % is already connected to another account (%). Please log in with that account or contact support at support@auren.app', 
        NEW.seller_id, v_existing_email
      USING ERRCODE = '23505';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_recurring_expense_account_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- If account_id is not set, get it from user's profile
  IF NEW.account_id IS NULL THEN
    SELECT account_id INTO NEW.account_id
    FROM public.profiles
    WHERE user_id = NEW.user_id;
    
    IF NEW.account_id IS NULL THEN
      RAISE EXCEPTION 'Cannot create recurring expense: user profile has no account_id';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$
;

grant delete on table "public"."account_modification_audit" to "anon";

grant insert on table "public"."account_modification_audit" to "anon";

grant references on table "public"."account_modification_audit" to "anon";

grant select on table "public"."account_modification_audit" to "anon";

grant trigger on table "public"."account_modification_audit" to "anon";

grant truncate on table "public"."account_modification_audit" to "anon";

grant update on table "public"."account_modification_audit" to "anon";

grant delete on table "public"."account_modification_audit" to "authenticated";

grant insert on table "public"."account_modification_audit" to "authenticated";

grant references on table "public"."account_modification_audit" to "authenticated";

grant select on table "public"."account_modification_audit" to "authenticated";

grant trigger on table "public"."account_modification_audit" to "authenticated";

grant truncate on table "public"."account_modification_audit" to "authenticated";

grant update on table "public"."account_modification_audit" to "authenticated";

grant delete on table "public"."account_modification_audit" to "service_role";

grant insert on table "public"."account_modification_audit" to "service_role";

grant references on table "public"."account_modification_audit" to "service_role";

grant select on table "public"."account_modification_audit" to "service_role";

grant trigger on table "public"."account_modification_audit" to "service_role";

grant truncate on table "public"."account_modification_audit" to "service_role";

grant update on table "public"."account_modification_audit" to "service_role";

grant delete on table "public"."admin_permissions" to "anon";

grant insert on table "public"."admin_permissions" to "anon";

grant references on table "public"."admin_permissions" to "anon";

grant select on table "public"."admin_permissions" to "anon";

grant trigger on table "public"."admin_permissions" to "anon";

grant truncate on table "public"."admin_permissions" to "anon";

grant update on table "public"."admin_permissions" to "anon";

grant delete on table "public"."admin_permissions" to "authenticated";

grant insert on table "public"."admin_permissions" to "authenticated";

grant references on table "public"."admin_permissions" to "authenticated";

grant select on table "public"."admin_permissions" to "authenticated";

grant trigger on table "public"."admin_permissions" to "authenticated";

grant truncate on table "public"."admin_permissions" to "authenticated";

grant update on table "public"."admin_permissions" to "authenticated";

grant delete on table "public"."admin_permissions" to "service_role";

grant insert on table "public"."admin_permissions" to "service_role";

grant references on table "public"."admin_permissions" to "service_role";

grant select on table "public"."admin_permissions" to "service_role";

grant trigger on table "public"."admin_permissions" to "service_role";

grant truncate on table "public"."admin_permissions" to "service_role";

grant update on table "public"."admin_permissions" to "service_role";

grant delete on table "public"."affiliate_payouts" to "anon";

grant insert on table "public"."affiliate_payouts" to "anon";

grant references on table "public"."affiliate_payouts" to "anon";

grant select on table "public"."affiliate_payouts" to "anon";

grant trigger on table "public"."affiliate_payouts" to "anon";

grant truncate on table "public"."affiliate_payouts" to "anon";

grant update on table "public"."affiliate_payouts" to "anon";

grant delete on table "public"."affiliate_payouts" to "authenticated";

grant insert on table "public"."affiliate_payouts" to "authenticated";

grant references on table "public"."affiliate_payouts" to "authenticated";

grant select on table "public"."affiliate_payouts" to "authenticated";

grant trigger on table "public"."affiliate_payouts" to "authenticated";

grant truncate on table "public"."affiliate_payouts" to "authenticated";

grant update on table "public"."affiliate_payouts" to "authenticated";

grant delete on table "public"."affiliate_payouts" to "service_role";

grant insert on table "public"."affiliate_payouts" to "service_role";

grant references on table "public"."affiliate_payouts" to "service_role";

grant select on table "public"."affiliate_payouts" to "service_role";

grant trigger on table "public"."affiliate_payouts" to "service_role";

grant truncate on table "public"."affiliate_payouts" to "service_role";

grant update on table "public"."affiliate_payouts" to "service_role";

grant delete on table "public"."affiliate_referrals" to "anon";

grant insert on table "public"."affiliate_referrals" to "anon";

grant references on table "public"."affiliate_referrals" to "anon";

grant select on table "public"."affiliate_referrals" to "anon";

grant trigger on table "public"."affiliate_referrals" to "anon";

grant truncate on table "public"."affiliate_referrals" to "anon";

grant update on table "public"."affiliate_referrals" to "anon";

grant delete on table "public"."affiliate_referrals" to "authenticated";

grant insert on table "public"."affiliate_referrals" to "authenticated";

grant references on table "public"."affiliate_referrals" to "authenticated";

grant select on table "public"."affiliate_referrals" to "authenticated";

grant trigger on table "public"."affiliate_referrals" to "authenticated";

grant truncate on table "public"."affiliate_referrals" to "authenticated";

grant update on table "public"."affiliate_referrals" to "authenticated";

grant delete on table "public"."affiliate_referrals" to "service_role";

grant insert on table "public"."affiliate_referrals" to "service_role";

grant references on table "public"."affiliate_referrals" to "service_role";

grant select on table "public"."affiliate_referrals" to "service_role";

grant trigger on table "public"."affiliate_referrals" to "service_role";

grant truncate on table "public"."affiliate_referrals" to "service_role";

grant update on table "public"."affiliate_referrals" to "service_role";

grant delete on table "public"."affiliates" to "anon";

grant insert on table "public"."affiliates" to "anon";

grant references on table "public"."affiliates" to "anon";

grant select on table "public"."affiliates" to "anon";

grant trigger on table "public"."affiliates" to "anon";

grant truncate on table "public"."affiliates" to "anon";

grant update on table "public"."affiliates" to "anon";

grant delete on table "public"."affiliates" to "authenticated";

grant insert on table "public"."affiliates" to "authenticated";

grant references on table "public"."affiliates" to "authenticated";

grant select on table "public"."affiliates" to "authenticated";

grant trigger on table "public"."affiliates" to "authenticated";

grant truncate on table "public"."affiliates" to "authenticated";

grant update on table "public"."affiliates" to "authenticated";

grant delete on table "public"."affiliates" to "service_role";

grant insert on table "public"."affiliates" to "service_role";

grant references on table "public"."affiliates" to "service_role";

grant select on table "public"."affiliates" to "service_role";

grant trigger on table "public"."affiliates" to "service_role";

grant truncate on table "public"."affiliates" to "service_role";

grant update on table "public"."affiliates" to "service_role";

grant delete on table "public"."amazon_accounts" to "anon";

grant insert on table "public"."amazon_accounts" to "anon";

grant references on table "public"."amazon_accounts" to "anon";

grant select on table "public"."amazon_accounts" to "anon";

grant trigger on table "public"."amazon_accounts" to "anon";

grant truncate on table "public"."amazon_accounts" to "anon";

grant update on table "public"."amazon_accounts" to "anon";

grant delete on table "public"."amazon_accounts" to "authenticated";

grant insert on table "public"."amazon_accounts" to "authenticated";

grant references on table "public"."amazon_accounts" to "authenticated";

grant select on table "public"."amazon_accounts" to "authenticated";

grant trigger on table "public"."amazon_accounts" to "authenticated";

grant truncate on table "public"."amazon_accounts" to "authenticated";

grant update on table "public"."amazon_accounts" to "authenticated";

grant delete on table "public"."amazon_accounts" to "service_role";

grant insert on table "public"."amazon_accounts" to "service_role";

grant references on table "public"."amazon_accounts" to "service_role";

grant select on table "public"."amazon_accounts" to "service_role";

grant trigger on table "public"."amazon_accounts" to "service_role";

grant truncate on table "public"."amazon_accounts" to "service_role";

grant update on table "public"."amazon_accounts" to "service_role";

grant delete on table "public"."amazon_connection_audit" to "anon";

grant insert on table "public"."amazon_connection_audit" to "anon";

grant references on table "public"."amazon_connection_audit" to "anon";

grant select on table "public"."amazon_connection_audit" to "anon";

grant trigger on table "public"."amazon_connection_audit" to "anon";

grant truncate on table "public"."amazon_connection_audit" to "anon";

grant update on table "public"."amazon_connection_audit" to "anon";

grant delete on table "public"."amazon_connection_audit" to "authenticated";

grant insert on table "public"."amazon_connection_audit" to "authenticated";

grant references on table "public"."amazon_connection_audit" to "authenticated";

grant select on table "public"."amazon_connection_audit" to "authenticated";

grant trigger on table "public"."amazon_connection_audit" to "authenticated";

grant truncate on table "public"."amazon_connection_audit" to "authenticated";

grant update on table "public"."amazon_connection_audit" to "authenticated";

grant delete on table "public"."amazon_connection_audit" to "service_role";

grant insert on table "public"."amazon_connection_audit" to "service_role";

grant references on table "public"."amazon_connection_audit" to "service_role";

grant select on table "public"."amazon_connection_audit" to "service_role";

grant trigger on table "public"."amazon_connection_audit" to "service_role";

grant truncate on table "public"."amazon_connection_audit" to "service_role";

grant update on table "public"."amazon_connection_audit" to "service_role";

grant delete on table "public"."amazon_daily_draws" to "anon";

grant insert on table "public"."amazon_daily_draws" to "anon";

grant references on table "public"."amazon_daily_draws" to "anon";

grant select on table "public"."amazon_daily_draws" to "anon";

grant trigger on table "public"."amazon_daily_draws" to "anon";

grant truncate on table "public"."amazon_daily_draws" to "anon";

grant update on table "public"."amazon_daily_draws" to "anon";

grant delete on table "public"."amazon_daily_draws" to "authenticated";

grant insert on table "public"."amazon_daily_draws" to "authenticated";

grant references on table "public"."amazon_daily_draws" to "authenticated";

grant select on table "public"."amazon_daily_draws" to "authenticated";

grant trigger on table "public"."amazon_daily_draws" to "authenticated";

grant truncate on table "public"."amazon_daily_draws" to "authenticated";

grant update on table "public"."amazon_daily_draws" to "authenticated";

grant delete on table "public"."amazon_daily_draws" to "service_role";

grant insert on table "public"."amazon_daily_draws" to "service_role";

grant references on table "public"."amazon_daily_draws" to "service_role";

grant select on table "public"."amazon_daily_draws" to "service_role";

grant trigger on table "public"."amazon_daily_draws" to "service_role";

grant truncate on table "public"."amazon_daily_draws" to "service_role";

grant update on table "public"."amazon_daily_draws" to "service_role";

grant delete on table "public"."amazon_daily_rollups" to "anon";

grant insert on table "public"."amazon_daily_rollups" to "anon";

grant references on table "public"."amazon_daily_rollups" to "anon";

grant select on table "public"."amazon_daily_rollups" to "anon";

grant trigger on table "public"."amazon_daily_rollups" to "anon";

grant truncate on table "public"."amazon_daily_rollups" to "anon";

grant update on table "public"."amazon_daily_rollups" to "anon";

grant delete on table "public"."amazon_daily_rollups" to "authenticated";

grant insert on table "public"."amazon_daily_rollups" to "authenticated";

grant references on table "public"."amazon_daily_rollups" to "authenticated";

grant select on table "public"."amazon_daily_rollups" to "authenticated";

grant trigger on table "public"."amazon_daily_rollups" to "authenticated";

grant truncate on table "public"."amazon_daily_rollups" to "authenticated";

grant update on table "public"."amazon_daily_rollups" to "authenticated";

grant delete on table "public"."amazon_daily_rollups" to "service_role";

grant insert on table "public"."amazon_daily_rollups" to "service_role";

grant references on table "public"."amazon_daily_rollups" to "service_role";

grant select on table "public"."amazon_daily_rollups" to "service_role";

grant trigger on table "public"."amazon_daily_rollups" to "service_role";

grant truncate on table "public"."amazon_daily_rollups" to "service_role";

grant update on table "public"."amazon_daily_rollups" to "service_role";

grant delete on table "public"."amazon_payouts" to "anon";

grant insert on table "public"."amazon_payouts" to "anon";

grant references on table "public"."amazon_payouts" to "anon";

grant select on table "public"."amazon_payouts" to "anon";

grant trigger on table "public"."amazon_payouts" to "anon";

grant truncate on table "public"."amazon_payouts" to "anon";

grant update on table "public"."amazon_payouts" to "anon";

grant delete on table "public"."amazon_payouts" to "authenticated";

grant insert on table "public"."amazon_payouts" to "authenticated";

grant references on table "public"."amazon_payouts" to "authenticated";

grant select on table "public"."amazon_payouts" to "authenticated";

grant trigger on table "public"."amazon_payouts" to "authenticated";

grant truncate on table "public"."amazon_payouts" to "authenticated";

grant update on table "public"."amazon_payouts" to "authenticated";

grant delete on table "public"."amazon_payouts" to "service_role";

grant insert on table "public"."amazon_payouts" to "service_role";

grant references on table "public"."amazon_payouts" to "service_role";

grant select on table "public"."amazon_payouts" to "service_role";

grant trigger on table "public"."amazon_payouts" to "service_role";

grant truncate on table "public"."amazon_payouts" to "service_role";

grant update on table "public"."amazon_payouts" to "service_role";

grant delete on table "public"."amazon_sync_logs" to "anon";

grant insert on table "public"."amazon_sync_logs" to "anon";

grant references on table "public"."amazon_sync_logs" to "anon";

grant select on table "public"."amazon_sync_logs" to "anon";

grant trigger on table "public"."amazon_sync_logs" to "anon";

grant truncate on table "public"."amazon_sync_logs" to "anon";

grant update on table "public"."amazon_sync_logs" to "anon";

grant delete on table "public"."amazon_sync_logs" to "authenticated";

grant insert on table "public"."amazon_sync_logs" to "authenticated";

grant references on table "public"."amazon_sync_logs" to "authenticated";

grant select on table "public"."amazon_sync_logs" to "authenticated";

grant trigger on table "public"."amazon_sync_logs" to "authenticated";

grant truncate on table "public"."amazon_sync_logs" to "authenticated";

grant update on table "public"."amazon_sync_logs" to "authenticated";

grant delete on table "public"."amazon_sync_logs" to "service_role";

grant insert on table "public"."amazon_sync_logs" to "service_role";

grant references on table "public"."amazon_sync_logs" to "service_role";

grant select on table "public"."amazon_sync_logs" to "service_role";

grant trigger on table "public"."amazon_sync_logs" to "service_role";

grant truncate on table "public"."amazon_sync_logs" to "service_role";

grant update on table "public"."amazon_sync_logs" to "service_role";

grant delete on table "public"."amazon_transactions" to "anon";

grant insert on table "public"."amazon_transactions" to "anon";

grant references on table "public"."amazon_transactions" to "anon";

grant select on table "public"."amazon_transactions" to "anon";

grant trigger on table "public"."amazon_transactions" to "anon";

grant truncate on table "public"."amazon_transactions" to "anon";

grant update on table "public"."amazon_transactions" to "anon";

grant delete on table "public"."amazon_transactions" to "authenticated";

grant insert on table "public"."amazon_transactions" to "authenticated";

grant references on table "public"."amazon_transactions" to "authenticated";

grant select on table "public"."amazon_transactions" to "authenticated";

grant trigger on table "public"."amazon_transactions" to "authenticated";

grant truncate on table "public"."amazon_transactions" to "authenticated";

grant update on table "public"."amazon_transactions" to "authenticated";

grant delete on table "public"."amazon_transactions" to "service_role";

grant insert on table "public"."amazon_transactions" to "service_role";

grant references on table "public"."amazon_transactions" to "service_role";

grant select on table "public"."amazon_transactions" to "service_role";

grant trigger on table "public"."amazon_transactions" to "service_role";

grant truncate on table "public"."amazon_transactions" to "service_role";

grant update on table "public"."amazon_transactions" to "service_role";

grant delete on table "public"."audit_logs" to "anon";

grant insert on table "public"."audit_logs" to "anon";

grant references on table "public"."audit_logs" to "anon";

grant select on table "public"."audit_logs" to "anon";

grant trigger on table "public"."audit_logs" to "anon";

grant truncate on table "public"."audit_logs" to "anon";

grant update on table "public"."audit_logs" to "anon";

grant delete on table "public"."audit_logs" to "authenticated";

grant insert on table "public"."audit_logs" to "authenticated";

grant references on table "public"."audit_logs" to "authenticated";

grant select on table "public"."audit_logs" to "authenticated";

grant trigger on table "public"."audit_logs" to "authenticated";

grant truncate on table "public"."audit_logs" to "authenticated";

grant update on table "public"."audit_logs" to "authenticated";

grant delete on table "public"."audit_logs" to "service_role";

grant insert on table "public"."audit_logs" to "service_role";

grant references on table "public"."audit_logs" to "service_role";

grant select on table "public"."audit_logs" to "service_role";

grant trigger on table "public"."audit_logs" to "service_role";

grant truncate on table "public"."audit_logs" to "service_role";

grant update on table "public"."audit_logs" to "service_role";

grant delete on table "public"."bank_accounts" to "anon";

grant insert on table "public"."bank_accounts" to "anon";

grant references on table "public"."bank_accounts" to "anon";

grant select on table "public"."bank_accounts" to "anon";

grant trigger on table "public"."bank_accounts" to "anon";

grant truncate on table "public"."bank_accounts" to "anon";

grant update on table "public"."bank_accounts" to "anon";

grant delete on table "public"."bank_accounts" to "authenticated";

grant insert on table "public"."bank_accounts" to "authenticated";

grant references on table "public"."bank_accounts" to "authenticated";

grant select on table "public"."bank_accounts" to "authenticated";

grant trigger on table "public"."bank_accounts" to "authenticated";

grant truncate on table "public"."bank_accounts" to "authenticated";

grant update on table "public"."bank_accounts" to "authenticated";

grant delete on table "public"."bank_accounts" to "service_role";

grant insert on table "public"."bank_accounts" to "service_role";

grant references on table "public"."bank_accounts" to "service_role";

grant select on table "public"."bank_accounts" to "service_role";

grant trigger on table "public"."bank_accounts" to "service_role";

grant truncate on table "public"."bank_accounts" to "service_role";

grant update on table "public"."bank_accounts" to "service_role";

grant delete on table "public"."bank_sync_logs" to "anon";

grant insert on table "public"."bank_sync_logs" to "anon";

grant references on table "public"."bank_sync_logs" to "anon";

grant select on table "public"."bank_sync_logs" to "anon";

grant trigger on table "public"."bank_sync_logs" to "anon";

grant truncate on table "public"."bank_sync_logs" to "anon";

grant update on table "public"."bank_sync_logs" to "anon";

grant delete on table "public"."bank_sync_logs" to "authenticated";

grant insert on table "public"."bank_sync_logs" to "authenticated";

grant references on table "public"."bank_sync_logs" to "authenticated";

grant select on table "public"."bank_sync_logs" to "authenticated";

grant trigger on table "public"."bank_sync_logs" to "authenticated";

grant truncate on table "public"."bank_sync_logs" to "authenticated";

grant update on table "public"."bank_sync_logs" to "authenticated";

grant delete on table "public"."bank_sync_logs" to "service_role";

grant insert on table "public"."bank_sync_logs" to "service_role";

grant references on table "public"."bank_sync_logs" to "service_role";

grant select on table "public"."bank_sync_logs" to "service_role";

grant trigger on table "public"."bank_sync_logs" to "service_role";

grant truncate on table "public"."bank_sync_logs" to "service_role";

grant update on table "public"."bank_sync_logs" to "service_role";

grant delete on table "public"."bank_transactions" to "anon";

grant insert on table "public"."bank_transactions" to "anon";

grant references on table "public"."bank_transactions" to "anon";

grant select on table "public"."bank_transactions" to "anon";

grant trigger on table "public"."bank_transactions" to "anon";

grant truncate on table "public"."bank_transactions" to "anon";

grant update on table "public"."bank_transactions" to "anon";

grant delete on table "public"."bank_transactions" to "authenticated";

grant insert on table "public"."bank_transactions" to "authenticated";

grant references on table "public"."bank_transactions" to "authenticated";

grant select on table "public"."bank_transactions" to "authenticated";

grant trigger on table "public"."bank_transactions" to "authenticated";

grant truncate on table "public"."bank_transactions" to "authenticated";

grant update on table "public"."bank_transactions" to "authenticated";

grant delete on table "public"."bank_transactions" to "service_role";

grant insert on table "public"."bank_transactions" to "service_role";

grant references on table "public"."bank_transactions" to "service_role";

grant select on table "public"."bank_transactions" to "service_role";

grant trigger on table "public"."bank_transactions" to "service_role";

grant truncate on table "public"."bank_transactions" to "service_role";

grant update on table "public"."bank_transactions" to "service_role";

grant delete on table "public"."cash_flow_events" to "anon";

grant insert on table "public"."cash_flow_events" to "anon";

grant references on table "public"."cash_flow_events" to "anon";

grant select on table "public"."cash_flow_events" to "anon";

grant trigger on table "public"."cash_flow_events" to "anon";

grant truncate on table "public"."cash_flow_events" to "anon";

grant update on table "public"."cash_flow_events" to "anon";

grant delete on table "public"."cash_flow_events" to "authenticated";

grant insert on table "public"."cash_flow_events" to "authenticated";

grant references on table "public"."cash_flow_events" to "authenticated";

grant select on table "public"."cash_flow_events" to "authenticated";

grant trigger on table "public"."cash_flow_events" to "authenticated";

grant truncate on table "public"."cash_flow_events" to "authenticated";

grant update on table "public"."cash_flow_events" to "authenticated";

grant delete on table "public"."cash_flow_events" to "service_role";

grant insert on table "public"."cash_flow_events" to "service_role";

grant references on table "public"."cash_flow_events" to "service_role";

grant select on table "public"."cash_flow_events" to "service_role";

grant trigger on table "public"."cash_flow_events" to "service_role";

grant truncate on table "public"."cash_flow_events" to "service_role";

grant update on table "public"."cash_flow_events" to "service_role";

grant delete on table "public"."cash_flow_insights" to "anon";

grant insert on table "public"."cash_flow_insights" to "anon";

grant references on table "public"."cash_flow_insights" to "anon";

grant select on table "public"."cash_flow_insights" to "anon";

grant trigger on table "public"."cash_flow_insights" to "anon";

grant truncate on table "public"."cash_flow_insights" to "anon";

grant update on table "public"."cash_flow_insights" to "anon";

grant delete on table "public"."cash_flow_insights" to "authenticated";

grant insert on table "public"."cash_flow_insights" to "authenticated";

grant references on table "public"."cash_flow_insights" to "authenticated";

grant select on table "public"."cash_flow_insights" to "authenticated";

grant trigger on table "public"."cash_flow_insights" to "authenticated";

grant truncate on table "public"."cash_flow_insights" to "authenticated";

grant update on table "public"."cash_flow_insights" to "authenticated";

grant delete on table "public"."cash_flow_insights" to "service_role";

grant insert on table "public"."cash_flow_insights" to "service_role";

grant references on table "public"."cash_flow_insights" to "service_role";

grant select on table "public"."cash_flow_insights" to "service_role";

grant trigger on table "public"."cash_flow_insights" to "service_role";

grant truncate on table "public"."cash_flow_insights" to "service_role";

grant update on table "public"."cash_flow_insights" to "service_role";

grant delete on table "public"."categories" to "anon";

grant insert on table "public"."categories" to "anon";

grant references on table "public"."categories" to "anon";

grant select on table "public"."categories" to "anon";

grant trigger on table "public"."categories" to "anon";

grant truncate on table "public"."categories" to "anon";

grant update on table "public"."categories" to "anon";

grant delete on table "public"."categories" to "authenticated";

grant insert on table "public"."categories" to "authenticated";

grant references on table "public"."categories" to "authenticated";

grant select on table "public"."categories" to "authenticated";

grant trigger on table "public"."categories" to "authenticated";

grant truncate on table "public"."categories" to "authenticated";

grant update on table "public"."categories" to "authenticated";

grant delete on table "public"."categories" to "service_role";

grant insert on table "public"."categories" to "service_role";

grant references on table "public"."categories" to "service_role";

grant select on table "public"."categories" to "service_role";

grant trigger on table "public"."categories" to "service_role";

grant truncate on table "public"."categories" to "service_role";

grant update on table "public"."categories" to "service_role";

grant delete on table "public"."credit_card_payments" to "anon";

grant insert on table "public"."credit_card_payments" to "anon";

grant references on table "public"."credit_card_payments" to "anon";

grant select on table "public"."credit_card_payments" to "anon";

grant trigger on table "public"."credit_card_payments" to "anon";

grant truncate on table "public"."credit_card_payments" to "anon";

grant update on table "public"."credit_card_payments" to "anon";

grant delete on table "public"."credit_card_payments" to "authenticated";

grant insert on table "public"."credit_card_payments" to "authenticated";

grant references on table "public"."credit_card_payments" to "authenticated";

grant select on table "public"."credit_card_payments" to "authenticated";

grant trigger on table "public"."credit_card_payments" to "authenticated";

grant truncate on table "public"."credit_card_payments" to "authenticated";

grant update on table "public"."credit_card_payments" to "authenticated";

grant delete on table "public"."credit_card_payments" to "service_role";

grant insert on table "public"."credit_card_payments" to "service_role";

grant references on table "public"."credit_card_payments" to "service_role";

grant select on table "public"."credit_card_payments" to "service_role";

grant trigger on table "public"."credit_card_payments" to "service_role";

grant truncate on table "public"."credit_card_payments" to "service_role";

grant update on table "public"."credit_card_payments" to "service_role";

grant delete on table "public"."credit_cards" to "anon";

grant insert on table "public"."credit_cards" to "anon";

grant references on table "public"."credit_cards" to "anon";

grant select on table "public"."credit_cards" to "anon";

grant trigger on table "public"."credit_cards" to "anon";

grant truncate on table "public"."credit_cards" to "anon";

grant update on table "public"."credit_cards" to "anon";

grant delete on table "public"."credit_cards" to "authenticated";

grant insert on table "public"."credit_cards" to "authenticated";

grant references on table "public"."credit_cards" to "authenticated";

grant select on table "public"."credit_cards" to "authenticated";

grant trigger on table "public"."credit_cards" to "authenticated";

grant truncate on table "public"."credit_cards" to "authenticated";

grant update on table "public"."credit_cards" to "authenticated";

grant delete on table "public"."credit_cards" to "service_role";

grant insert on table "public"."credit_cards" to "service_role";

grant references on table "public"."credit_cards" to "service_role";

grant select on table "public"."credit_cards" to "service_role";

grant trigger on table "public"."credit_cards" to "service_role";

grant truncate on table "public"."credit_cards" to "service_role";

grant update on table "public"."credit_cards" to "service_role";

grant delete on table "public"."custom_discount_codes" to "anon";

grant insert on table "public"."custom_discount_codes" to "anon";

grant references on table "public"."custom_discount_codes" to "anon";

grant select on table "public"."custom_discount_codes" to "anon";

grant trigger on table "public"."custom_discount_codes" to "anon";

grant truncate on table "public"."custom_discount_codes" to "anon";

grant update on table "public"."custom_discount_codes" to "anon";

grant delete on table "public"."custom_discount_codes" to "authenticated";

grant insert on table "public"."custom_discount_codes" to "authenticated";

grant references on table "public"."custom_discount_codes" to "authenticated";

grant select on table "public"."custom_discount_codes" to "authenticated";

grant trigger on table "public"."custom_discount_codes" to "authenticated";

grant truncate on table "public"."custom_discount_codes" to "authenticated";

grant update on table "public"."custom_discount_codes" to "authenticated";

grant delete on table "public"."custom_discount_codes" to "service_role";

grant insert on table "public"."custom_discount_codes" to "service_role";

grant references on table "public"."custom_discount_codes" to "service_role";

grant select on table "public"."custom_discount_codes" to "service_role";

grant trigger on table "public"."custom_discount_codes" to "service_role";

grant truncate on table "public"."custom_discount_codes" to "service_role";

grant update on table "public"."custom_discount_codes" to "service_role";

grant delete on table "public"."customers" to "anon";

grant insert on table "public"."customers" to "anon";

grant references on table "public"."customers" to "anon";

grant select on table "public"."customers" to "anon";

grant trigger on table "public"."customers" to "anon";

grant truncate on table "public"."customers" to "anon";

grant update on table "public"."customers" to "anon";

grant delete on table "public"."customers" to "authenticated";

grant insert on table "public"."customers" to "authenticated";

grant references on table "public"."customers" to "authenticated";

grant select on table "public"."customers" to "authenticated";

grant trigger on table "public"."customers" to "authenticated";

grant truncate on table "public"."customers" to "authenticated";

grant update on table "public"."customers" to "authenticated";

grant delete on table "public"."customers" to "service_role";

grant insert on table "public"."customers" to "service_role";

grant references on table "public"."customers" to "service_role";

grant select on table "public"."customers" to "service_role";

grant trigger on table "public"."customers" to "service_role";

grant truncate on table "public"."customers" to "service_role";

grant update on table "public"."customers" to "service_role";

grant delete on table "public"."deleted_transactions" to "anon";

grant insert on table "public"."deleted_transactions" to "anon";

grant references on table "public"."deleted_transactions" to "anon";

grant select on table "public"."deleted_transactions" to "anon";

grant trigger on table "public"."deleted_transactions" to "anon";

grant truncate on table "public"."deleted_transactions" to "anon";

grant update on table "public"."deleted_transactions" to "anon";

grant delete on table "public"."deleted_transactions" to "authenticated";

grant insert on table "public"."deleted_transactions" to "authenticated";

grant references on table "public"."deleted_transactions" to "authenticated";

grant select on table "public"."deleted_transactions" to "authenticated";

grant trigger on table "public"."deleted_transactions" to "authenticated";

grant truncate on table "public"."deleted_transactions" to "authenticated";

grant update on table "public"."deleted_transactions" to "authenticated";

grant delete on table "public"."deleted_transactions" to "service_role";

grant insert on table "public"."deleted_transactions" to "service_role";

grant references on table "public"."deleted_transactions" to "service_role";

grant select on table "public"."deleted_transactions" to "service_role";

grant trigger on table "public"."deleted_transactions" to "service_role";

grant truncate on table "public"."deleted_transactions" to "service_role";

grant update on table "public"."deleted_transactions" to "service_role";

grant delete on table "public"."documents_metadata" to "anon";

grant insert on table "public"."documents_metadata" to "anon";

grant references on table "public"."documents_metadata" to "anon";

grant select on table "public"."documents_metadata" to "anon";

grant trigger on table "public"."documents_metadata" to "anon";

grant truncate on table "public"."documents_metadata" to "anon";

grant update on table "public"."documents_metadata" to "anon";

grant delete on table "public"."documents_metadata" to "authenticated";

grant insert on table "public"."documents_metadata" to "authenticated";

grant references on table "public"."documents_metadata" to "authenticated";

grant select on table "public"."documents_metadata" to "authenticated";

grant trigger on table "public"."documents_metadata" to "authenticated";

grant truncate on table "public"."documents_metadata" to "authenticated";

grant update on table "public"."documents_metadata" to "authenticated";

grant delete on table "public"."documents_metadata" to "service_role";

grant insert on table "public"."documents_metadata" to "service_role";

grant references on table "public"."documents_metadata" to "service_role";

grant select on table "public"."documents_metadata" to "service_role";

grant trigger on table "public"."documents_metadata" to "service_role";

grant truncate on table "public"."documents_metadata" to "service_role";

grant update on table "public"."documents_metadata" to "service_role";

grant delete on table "public"."feature_requests" to "anon";

grant insert on table "public"."feature_requests" to "anon";

grant references on table "public"."feature_requests" to "anon";

grant select on table "public"."feature_requests" to "anon";

grant trigger on table "public"."feature_requests" to "anon";

grant truncate on table "public"."feature_requests" to "anon";

grant update on table "public"."feature_requests" to "anon";

grant delete on table "public"."feature_requests" to "authenticated";

grant insert on table "public"."feature_requests" to "authenticated";

grant references on table "public"."feature_requests" to "authenticated";

grant select on table "public"."feature_requests" to "authenticated";

grant trigger on table "public"."feature_requests" to "authenticated";

grant truncate on table "public"."feature_requests" to "authenticated";

grant update on table "public"."feature_requests" to "authenticated";

grant delete on table "public"."feature_requests" to "service_role";

grant insert on table "public"."feature_requests" to "service_role";

grant references on table "public"."feature_requests" to "service_role";

grant select on table "public"."feature_requests" to "service_role";

grant trigger on table "public"."feature_requests" to "service_role";

grant truncate on table "public"."feature_requests" to "service_role";

grant update on table "public"."feature_requests" to "service_role";

grant delete on table "public"."forecast_accuracy_log" to "anon";

grant insert on table "public"."forecast_accuracy_log" to "anon";

grant references on table "public"."forecast_accuracy_log" to "anon";

grant select on table "public"."forecast_accuracy_log" to "anon";

grant trigger on table "public"."forecast_accuracy_log" to "anon";

grant truncate on table "public"."forecast_accuracy_log" to "anon";

grant update on table "public"."forecast_accuracy_log" to "anon";

grant delete on table "public"."forecast_accuracy_log" to "authenticated";

grant insert on table "public"."forecast_accuracy_log" to "authenticated";

grant references on table "public"."forecast_accuracy_log" to "authenticated";

grant select on table "public"."forecast_accuracy_log" to "authenticated";

grant trigger on table "public"."forecast_accuracy_log" to "authenticated";

grant truncate on table "public"."forecast_accuracy_log" to "authenticated";

grant update on table "public"."forecast_accuracy_log" to "authenticated";

grant delete on table "public"."forecast_accuracy_log" to "service_role";

grant insert on table "public"."forecast_accuracy_log" to "service_role";

grant references on table "public"."forecast_accuracy_log" to "service_role";

grant select on table "public"."forecast_accuracy_log" to "service_role";

grant trigger on table "public"."forecast_accuracy_log" to "service_role";

grant truncate on table "public"."forecast_accuracy_log" to "service_role";

grant update on table "public"."forecast_accuracy_log" to "service_role";

grant delete on table "public"."income" to "anon";

grant insert on table "public"."income" to "anon";

grant references on table "public"."income" to "anon";

grant select on table "public"."income" to "anon";

grant trigger on table "public"."income" to "anon";

grant truncate on table "public"."income" to "anon";

grant update on table "public"."income" to "anon";

grant delete on table "public"."income" to "authenticated";

grant insert on table "public"."income" to "authenticated";

grant references on table "public"."income" to "authenticated";

grant select on table "public"."income" to "authenticated";

grant trigger on table "public"."income" to "authenticated";

grant truncate on table "public"."income" to "authenticated";

grant update on table "public"."income" to "authenticated";

grant delete on table "public"."income" to "service_role";

grant insert on table "public"."income" to "service_role";

grant references on table "public"."income" to "service_role";

grant select on table "public"."income" to "service_role";

grant trigger on table "public"."income" to "service_role";

grant truncate on table "public"."income" to "service_role";

grant update on table "public"."income" to "service_role";

grant delete on table "public"."monthly_support_metrics" to "anon";

grant insert on table "public"."monthly_support_metrics" to "anon";

grant references on table "public"."monthly_support_metrics" to "anon";

grant select on table "public"."monthly_support_metrics" to "anon";

grant trigger on table "public"."monthly_support_metrics" to "anon";

grant truncate on table "public"."monthly_support_metrics" to "anon";

grant update on table "public"."monthly_support_metrics" to "anon";

grant delete on table "public"."monthly_support_metrics" to "authenticated";

grant insert on table "public"."monthly_support_metrics" to "authenticated";

grant references on table "public"."monthly_support_metrics" to "authenticated";

grant select on table "public"."monthly_support_metrics" to "authenticated";

grant trigger on table "public"."monthly_support_metrics" to "authenticated";

grant truncate on table "public"."monthly_support_metrics" to "authenticated";

grant update on table "public"."monthly_support_metrics" to "authenticated";

grant delete on table "public"."monthly_support_metrics" to "service_role";

grant insert on table "public"."monthly_support_metrics" to "service_role";

grant references on table "public"."monthly_support_metrics" to "service_role";

grant select on table "public"."monthly_support_metrics" to "service_role";

grant trigger on table "public"."monthly_support_metrics" to "service_role";

grant truncate on table "public"."monthly_support_metrics" to "service_role";

grant update on table "public"."monthly_support_metrics" to "service_role";

grant delete on table "public"."notification_history" to "anon";

grant insert on table "public"."notification_history" to "anon";

grant references on table "public"."notification_history" to "anon";

grant select on table "public"."notification_history" to "anon";

grant trigger on table "public"."notification_history" to "anon";

grant truncate on table "public"."notification_history" to "anon";

grant update on table "public"."notification_history" to "anon";

grant delete on table "public"."notification_history" to "authenticated";

grant insert on table "public"."notification_history" to "authenticated";

grant references on table "public"."notification_history" to "authenticated";

grant select on table "public"."notification_history" to "authenticated";

grant trigger on table "public"."notification_history" to "authenticated";

grant truncate on table "public"."notification_history" to "authenticated";

grant update on table "public"."notification_history" to "authenticated";

grant delete on table "public"."notification_history" to "service_role";

grant insert on table "public"."notification_history" to "service_role";

grant references on table "public"."notification_history" to "service_role";

grant select on table "public"."notification_history" to "service_role";

grant trigger on table "public"."notification_history" to "service_role";

grant truncate on table "public"."notification_history" to "service_role";

grant update on table "public"."notification_history" to "service_role";

grant delete on table "public"."notification_preferences" to "anon";

grant insert on table "public"."notification_preferences" to "anon";

grant references on table "public"."notification_preferences" to "anon";

grant select on table "public"."notification_preferences" to "anon";

grant trigger on table "public"."notification_preferences" to "anon";

grant truncate on table "public"."notification_preferences" to "anon";

grant update on table "public"."notification_preferences" to "anon";

grant delete on table "public"."notification_preferences" to "authenticated";

grant insert on table "public"."notification_preferences" to "authenticated";

grant references on table "public"."notification_preferences" to "authenticated";

grant select on table "public"."notification_preferences" to "authenticated";

grant trigger on table "public"."notification_preferences" to "authenticated";

grant truncate on table "public"."notification_preferences" to "authenticated";

grant update on table "public"."notification_preferences" to "authenticated";

grant delete on table "public"."notification_preferences" to "service_role";

grant insert on table "public"."notification_preferences" to "service_role";

grant references on table "public"."notification_preferences" to "service_role";

grant select on table "public"."notification_preferences" to "service_role";

grant trigger on table "public"."notification_preferences" to "service_role";

grant truncate on table "public"."notification_preferences" to "service_role";

grant update on table "public"."notification_preferences" to "service_role";

grant delete on table "public"."password_reset_tokens" to "anon";

grant insert on table "public"."password_reset_tokens" to "anon";

grant references on table "public"."password_reset_tokens" to "anon";

grant select on table "public"."password_reset_tokens" to "anon";

grant trigger on table "public"."password_reset_tokens" to "anon";

grant truncate on table "public"."password_reset_tokens" to "anon";

grant update on table "public"."password_reset_tokens" to "anon";

grant delete on table "public"."password_reset_tokens" to "authenticated";

grant insert on table "public"."password_reset_tokens" to "authenticated";

grant references on table "public"."password_reset_tokens" to "authenticated";

grant select on table "public"."password_reset_tokens" to "authenticated";

grant trigger on table "public"."password_reset_tokens" to "authenticated";

grant truncate on table "public"."password_reset_tokens" to "authenticated";

grant update on table "public"."password_reset_tokens" to "authenticated";

grant delete on table "public"."password_reset_tokens" to "service_role";

grant insert on table "public"."password_reset_tokens" to "service_role";

grant references on table "public"."password_reset_tokens" to "service_role";

grant select on table "public"."password_reset_tokens" to "service_role";

grant trigger on table "public"."password_reset_tokens" to "service_role";

grant truncate on table "public"."password_reset_tokens" to "service_role";

grant update on table "public"."password_reset_tokens" to "service_role";

grant delete on table "public"."payees" to "anon";

grant insert on table "public"."payees" to "anon";

grant references on table "public"."payees" to "anon";

grant select on table "public"."payees" to "anon";

grant trigger on table "public"."payees" to "anon";

grant truncate on table "public"."payees" to "anon";

grant update on table "public"."payees" to "anon";

grant delete on table "public"."payees" to "authenticated";

grant insert on table "public"."payees" to "authenticated";

grant references on table "public"."payees" to "authenticated";

grant select on table "public"."payees" to "authenticated";

grant trigger on table "public"."payees" to "authenticated";

grant truncate on table "public"."payees" to "authenticated";

grant update on table "public"."payees" to "authenticated";

grant delete on table "public"."payees" to "service_role";

grant insert on table "public"."payees" to "service_role";

grant references on table "public"."payees" to "service_role";

grant select on table "public"."payees" to "service_role";

grant trigger on table "public"."payees" to "service_role";

grant truncate on table "public"."payees" to "service_role";

grant update on table "public"."payees" to "service_role";

grant delete on table "public"."plan_limits" to "anon";

grant insert on table "public"."plan_limits" to "anon";

grant references on table "public"."plan_limits" to "anon";

grant select on table "public"."plan_limits" to "anon";

grant trigger on table "public"."plan_limits" to "anon";

grant truncate on table "public"."plan_limits" to "anon";

grant update on table "public"."plan_limits" to "anon";

grant delete on table "public"."plan_limits" to "authenticated";

grant insert on table "public"."plan_limits" to "authenticated";

grant references on table "public"."plan_limits" to "authenticated";

grant select on table "public"."plan_limits" to "authenticated";

grant trigger on table "public"."plan_limits" to "authenticated";

grant truncate on table "public"."plan_limits" to "authenticated";

grant update on table "public"."plan_limits" to "authenticated";

grant delete on table "public"."plan_limits" to "service_role";

grant insert on table "public"."plan_limits" to "service_role";

grant references on table "public"."plan_limits" to "service_role";

grant select on table "public"."plan_limits" to "service_role";

grant trigger on table "public"."plan_limits" to "service_role";

grant truncate on table "public"."plan_limits" to "service_role";

grant update on table "public"."plan_limits" to "service_role";

grant delete on table "public"."plan_override_audit" to "anon";

grant insert on table "public"."plan_override_audit" to "anon";

grant references on table "public"."plan_override_audit" to "anon";

grant select on table "public"."plan_override_audit" to "anon";

grant trigger on table "public"."plan_override_audit" to "anon";

grant truncate on table "public"."plan_override_audit" to "anon";

grant update on table "public"."plan_override_audit" to "anon";

grant delete on table "public"."plan_override_audit" to "authenticated";

grant insert on table "public"."plan_override_audit" to "authenticated";

grant references on table "public"."plan_override_audit" to "authenticated";

grant select on table "public"."plan_override_audit" to "authenticated";

grant trigger on table "public"."plan_override_audit" to "authenticated";

grant truncate on table "public"."plan_override_audit" to "authenticated";

grant update on table "public"."plan_override_audit" to "authenticated";

grant delete on table "public"."plan_override_audit" to "service_role";

grant insert on table "public"."plan_override_audit" to "service_role";

grant references on table "public"."plan_override_audit" to "service_role";

grant select on table "public"."plan_override_audit" to "service_role";

grant trigger on table "public"."plan_override_audit" to "service_role";

grant truncate on table "public"."plan_override_audit" to "service_role";

grant update on table "public"."plan_override_audit" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."purchase_order_line_items" to "anon";

grant insert on table "public"."purchase_order_line_items" to "anon";

grant references on table "public"."purchase_order_line_items" to "anon";

grant select on table "public"."purchase_order_line_items" to "anon";

grant trigger on table "public"."purchase_order_line_items" to "anon";

grant truncate on table "public"."purchase_order_line_items" to "anon";

grant update on table "public"."purchase_order_line_items" to "anon";

grant delete on table "public"."purchase_order_line_items" to "authenticated";

grant insert on table "public"."purchase_order_line_items" to "authenticated";

grant references on table "public"."purchase_order_line_items" to "authenticated";

grant select on table "public"."purchase_order_line_items" to "authenticated";

grant trigger on table "public"."purchase_order_line_items" to "authenticated";

grant truncate on table "public"."purchase_order_line_items" to "authenticated";

grant update on table "public"."purchase_order_line_items" to "authenticated";

grant delete on table "public"."purchase_order_line_items" to "service_role";

grant insert on table "public"."purchase_order_line_items" to "service_role";

grant references on table "public"."purchase_order_line_items" to "service_role";

grant select on table "public"."purchase_order_line_items" to "service_role";

grant trigger on table "public"."purchase_order_line_items" to "service_role";

grant truncate on table "public"."purchase_order_line_items" to "service_role";

grant update on table "public"."purchase_order_line_items" to "service_role";

grant delete on table "public"."purchased_addons" to "anon";

grant insert on table "public"."purchased_addons" to "anon";

grant references on table "public"."purchased_addons" to "anon";

grant select on table "public"."purchased_addons" to "anon";

grant trigger on table "public"."purchased_addons" to "anon";

grant truncate on table "public"."purchased_addons" to "anon";

grant update on table "public"."purchased_addons" to "anon";

grant delete on table "public"."purchased_addons" to "authenticated";

grant insert on table "public"."purchased_addons" to "authenticated";

grant references on table "public"."purchased_addons" to "authenticated";

grant select on table "public"."purchased_addons" to "authenticated";

grant trigger on table "public"."purchased_addons" to "authenticated";

grant truncate on table "public"."purchased_addons" to "authenticated";

grant update on table "public"."purchased_addons" to "authenticated";

grant delete on table "public"."purchased_addons" to "service_role";

grant insert on table "public"."purchased_addons" to "service_role";

grant references on table "public"."purchased_addons" to "service_role";

grant select on table "public"."purchased_addons" to "service_role";

grant trigger on table "public"."purchased_addons" to "service_role";

grant truncate on table "public"."purchased_addons" to "service_role";

grant update on table "public"."purchased_addons" to "service_role";

grant delete on table "public"."recurring_expense_exceptions" to "anon";

grant insert on table "public"."recurring_expense_exceptions" to "anon";

grant references on table "public"."recurring_expense_exceptions" to "anon";

grant select on table "public"."recurring_expense_exceptions" to "anon";

grant trigger on table "public"."recurring_expense_exceptions" to "anon";

grant truncate on table "public"."recurring_expense_exceptions" to "anon";

grant update on table "public"."recurring_expense_exceptions" to "anon";

grant delete on table "public"."recurring_expense_exceptions" to "authenticated";

grant insert on table "public"."recurring_expense_exceptions" to "authenticated";

grant references on table "public"."recurring_expense_exceptions" to "authenticated";

grant select on table "public"."recurring_expense_exceptions" to "authenticated";

grant trigger on table "public"."recurring_expense_exceptions" to "authenticated";

grant truncate on table "public"."recurring_expense_exceptions" to "authenticated";

grant update on table "public"."recurring_expense_exceptions" to "authenticated";

grant delete on table "public"."recurring_expense_exceptions" to "service_role";

grant insert on table "public"."recurring_expense_exceptions" to "service_role";

grant references on table "public"."recurring_expense_exceptions" to "service_role";

grant select on table "public"."recurring_expense_exceptions" to "service_role";

grant trigger on table "public"."recurring_expense_exceptions" to "service_role";

grant truncate on table "public"."recurring_expense_exceptions" to "service_role";

grant update on table "public"."recurring_expense_exceptions" to "service_role";

grant delete on table "public"."recurring_expenses" to "anon";

grant insert on table "public"."recurring_expenses" to "anon";

grant references on table "public"."recurring_expenses" to "anon";

grant select on table "public"."recurring_expenses" to "anon";

grant trigger on table "public"."recurring_expenses" to "anon";

grant truncate on table "public"."recurring_expenses" to "anon";

grant update on table "public"."recurring_expenses" to "anon";

grant delete on table "public"."recurring_expenses" to "authenticated";

grant insert on table "public"."recurring_expenses" to "authenticated";

grant references on table "public"."recurring_expenses" to "authenticated";

grant select on table "public"."recurring_expenses" to "authenticated";

grant trigger on table "public"."recurring_expenses" to "authenticated";

grant truncate on table "public"."recurring_expenses" to "authenticated";

grant update on table "public"."recurring_expenses" to "authenticated";

grant delete on table "public"."recurring_expenses" to "service_role";

grant insert on table "public"."recurring_expenses" to "service_role";

grant references on table "public"."recurring_expenses" to "service_role";

grant select on table "public"."recurring_expenses" to "service_role";

grant trigger on table "public"."recurring_expenses" to "service_role";

grant truncate on table "public"."recurring_expenses" to "service_role";

grant update on table "public"."recurring_expenses" to "service_role";

grant delete on table "public"."referral_codes" to "anon";

grant insert on table "public"."referral_codes" to "anon";

grant references on table "public"."referral_codes" to "anon";

grant select on table "public"."referral_codes" to "anon";

grant trigger on table "public"."referral_codes" to "anon";

grant truncate on table "public"."referral_codes" to "anon";

grant update on table "public"."referral_codes" to "anon";

grant delete on table "public"."referral_codes" to "authenticated";

grant insert on table "public"."referral_codes" to "authenticated";

grant references on table "public"."referral_codes" to "authenticated";

grant select on table "public"."referral_codes" to "authenticated";

grant trigger on table "public"."referral_codes" to "authenticated";

grant truncate on table "public"."referral_codes" to "authenticated";

grant update on table "public"."referral_codes" to "authenticated";

grant delete on table "public"."referral_codes" to "service_role";

grant insert on table "public"."referral_codes" to "service_role";

grant references on table "public"."referral_codes" to "service_role";

grant select on table "public"."referral_codes" to "service_role";

grant trigger on table "public"."referral_codes" to "service_role";

grant truncate on table "public"."referral_codes" to "service_role";

grant update on table "public"."referral_codes" to "service_role";

grant delete on table "public"."referral_rewards" to "anon";

grant insert on table "public"."referral_rewards" to "anon";

grant references on table "public"."referral_rewards" to "anon";

grant select on table "public"."referral_rewards" to "anon";

grant trigger on table "public"."referral_rewards" to "anon";

grant truncate on table "public"."referral_rewards" to "anon";

grant update on table "public"."referral_rewards" to "anon";

grant delete on table "public"."referral_rewards" to "authenticated";

grant insert on table "public"."referral_rewards" to "authenticated";

grant references on table "public"."referral_rewards" to "authenticated";

grant select on table "public"."referral_rewards" to "authenticated";

grant trigger on table "public"."referral_rewards" to "authenticated";

grant truncate on table "public"."referral_rewards" to "authenticated";

grant update on table "public"."referral_rewards" to "authenticated";

grant delete on table "public"."referral_rewards" to "service_role";

grant insert on table "public"."referral_rewards" to "service_role";

grant references on table "public"."referral_rewards" to "service_role";

grant select on table "public"."referral_rewards" to "service_role";

grant trigger on table "public"."referral_rewards" to "service_role";

grant truncate on table "public"."referral_rewards" to "service_role";

grant update on table "public"."referral_rewards" to "service_role";

grant delete on table "public"."referrals" to "anon";

grant insert on table "public"."referrals" to "anon";

grant references on table "public"."referrals" to "anon";

grant select on table "public"."referrals" to "anon";

grant trigger on table "public"."referrals" to "anon";

grant truncate on table "public"."referrals" to "anon";

grant update on table "public"."referrals" to "anon";

grant delete on table "public"."referrals" to "authenticated";

grant insert on table "public"."referrals" to "authenticated";

grant references on table "public"."referrals" to "authenticated";

grant select on table "public"."referrals" to "authenticated";

grant trigger on table "public"."referrals" to "authenticated";

grant truncate on table "public"."referrals" to "authenticated";

grant update on table "public"."referrals" to "authenticated";

grant delete on table "public"."referrals" to "service_role";

grant insert on table "public"."referrals" to "service_role";

grant references on table "public"."referrals" to "service_role";

grant select on table "public"."referrals" to "service_role";

grant trigger on table "public"."referrals" to "service_role";

grant truncate on table "public"."referrals" to "service_role";

grant update on table "public"."referrals" to "service_role";

grant delete on table "public"."scenarios" to "anon";

grant insert on table "public"."scenarios" to "anon";

grant references on table "public"."scenarios" to "anon";

grant select on table "public"."scenarios" to "anon";

grant trigger on table "public"."scenarios" to "anon";

grant truncate on table "public"."scenarios" to "anon";

grant update on table "public"."scenarios" to "anon";

grant delete on table "public"."scenarios" to "authenticated";

grant insert on table "public"."scenarios" to "authenticated";

grant references on table "public"."scenarios" to "authenticated";

grant select on table "public"."scenarios" to "authenticated";

grant trigger on table "public"."scenarios" to "authenticated";

grant truncate on table "public"."scenarios" to "authenticated";

grant update on table "public"."scenarios" to "authenticated";

grant delete on table "public"."scenarios" to "service_role";

grant insert on table "public"."scenarios" to "service_role";

grant references on table "public"."scenarios" to "service_role";

grant select on table "public"."scenarios" to "service_role";

grant trigger on table "public"."scenarios" to "service_role";

grant truncate on table "public"."scenarios" to "service_role";

grant update on table "public"."scenarios" to "service_role";

grant delete on table "public"."stripe_customer_audit_log" to "anon";

grant insert on table "public"."stripe_customer_audit_log" to "anon";

grant references on table "public"."stripe_customer_audit_log" to "anon";

grant select on table "public"."stripe_customer_audit_log" to "anon";

grant trigger on table "public"."stripe_customer_audit_log" to "anon";

grant truncate on table "public"."stripe_customer_audit_log" to "anon";

grant update on table "public"."stripe_customer_audit_log" to "anon";

grant delete on table "public"."stripe_customer_audit_log" to "authenticated";

grant insert on table "public"."stripe_customer_audit_log" to "authenticated";

grant references on table "public"."stripe_customer_audit_log" to "authenticated";

grant select on table "public"."stripe_customer_audit_log" to "authenticated";

grant trigger on table "public"."stripe_customer_audit_log" to "authenticated";

grant truncate on table "public"."stripe_customer_audit_log" to "authenticated";

grant update on table "public"."stripe_customer_audit_log" to "authenticated";

grant delete on table "public"."stripe_customer_audit_log" to "service_role";

grant insert on table "public"."stripe_customer_audit_log" to "service_role";

grant references on table "public"."stripe_customer_audit_log" to "service_role";

grant select on table "public"."stripe_customer_audit_log" to "service_role";

grant trigger on table "public"."stripe_customer_audit_log" to "service_role";

grant truncate on table "public"."stripe_customer_audit_log" to "service_role";

grant update on table "public"."stripe_customer_audit_log" to "service_role";

grant delete on table "public"."support_tickets" to "anon";

grant insert on table "public"."support_tickets" to "anon";

grant references on table "public"."support_tickets" to "anon";

grant select on table "public"."support_tickets" to "anon";

grant trigger on table "public"."support_tickets" to "anon";

grant truncate on table "public"."support_tickets" to "anon";

grant update on table "public"."support_tickets" to "anon";

grant delete on table "public"."support_tickets" to "authenticated";

grant insert on table "public"."support_tickets" to "authenticated";

grant references on table "public"."support_tickets" to "authenticated";

grant select on table "public"."support_tickets" to "authenticated";

grant trigger on table "public"."support_tickets" to "authenticated";

grant truncate on table "public"."support_tickets" to "authenticated";

grant update on table "public"."support_tickets" to "authenticated";

grant delete on table "public"."support_tickets" to "service_role";

grant insert on table "public"."support_tickets" to "service_role";

grant references on table "public"."support_tickets" to "service_role";

grant select on table "public"."support_tickets" to "service_role";

grant trigger on table "public"."support_tickets" to "service_role";

grant truncate on table "public"."support_tickets" to "service_role";

grant update on table "public"."support_tickets" to "service_role";

grant delete on table "public"."team_invitations" to "anon";

grant insert on table "public"."team_invitations" to "anon";

grant references on table "public"."team_invitations" to "anon";

grant select on table "public"."team_invitations" to "anon";

grant trigger on table "public"."team_invitations" to "anon";

grant truncate on table "public"."team_invitations" to "anon";

grant update on table "public"."team_invitations" to "anon";

grant delete on table "public"."team_invitations" to "authenticated";

grant insert on table "public"."team_invitations" to "authenticated";

grant references on table "public"."team_invitations" to "authenticated";

grant select on table "public"."team_invitations" to "authenticated";

grant trigger on table "public"."team_invitations" to "authenticated";

grant truncate on table "public"."team_invitations" to "authenticated";

grant update on table "public"."team_invitations" to "authenticated";

grant delete on table "public"."team_invitations" to "service_role";

grant insert on table "public"."team_invitations" to "service_role";

grant references on table "public"."team_invitations" to "service_role";

grant select on table "public"."team_invitations" to "service_role";

grant trigger on table "public"."team_invitations" to "service_role";

grant truncate on table "public"."team_invitations" to "service_role";

grant update on table "public"."team_invitations" to "service_role";

grant delete on table "public"."ticket_feedback" to "anon";

grant insert on table "public"."ticket_feedback" to "anon";

grant references on table "public"."ticket_feedback" to "anon";

grant select on table "public"."ticket_feedback" to "anon";

grant trigger on table "public"."ticket_feedback" to "anon";

grant truncate on table "public"."ticket_feedback" to "anon";

grant update on table "public"."ticket_feedback" to "anon";

grant delete on table "public"."ticket_feedback" to "authenticated";

grant insert on table "public"."ticket_feedback" to "authenticated";

grant references on table "public"."ticket_feedback" to "authenticated";

grant select on table "public"."ticket_feedback" to "authenticated";

grant trigger on table "public"."ticket_feedback" to "authenticated";

grant truncate on table "public"."ticket_feedback" to "authenticated";

grant update on table "public"."ticket_feedback" to "authenticated";

grant delete on table "public"."ticket_feedback" to "service_role";

grant insert on table "public"."ticket_feedback" to "service_role";

grant references on table "public"."ticket_feedback" to "service_role";

grant select on table "public"."ticket_feedback" to "service_role";

grant trigger on table "public"."ticket_feedback" to "service_role";

grant truncate on table "public"."ticket_feedback" to "service_role";

grant update on table "public"."ticket_feedback" to "service_role";

grant delete on table "public"."ticket_messages" to "anon";

grant insert on table "public"."ticket_messages" to "anon";

grant references on table "public"."ticket_messages" to "anon";

grant select on table "public"."ticket_messages" to "anon";

grant trigger on table "public"."ticket_messages" to "anon";

grant truncate on table "public"."ticket_messages" to "anon";

grant update on table "public"."ticket_messages" to "anon";

grant delete on table "public"."ticket_messages" to "authenticated";

grant insert on table "public"."ticket_messages" to "authenticated";

grant references on table "public"."ticket_messages" to "authenticated";

grant select on table "public"."ticket_messages" to "authenticated";

grant trigger on table "public"."ticket_messages" to "authenticated";

grant truncate on table "public"."ticket_messages" to "authenticated";

grant update on table "public"."ticket_messages" to "authenticated";

grant delete on table "public"."ticket_messages" to "service_role";

grant insert on table "public"."ticket_messages" to "service_role";

grant references on table "public"."ticket_messages" to "service_role";

grant select on table "public"."ticket_messages" to "service_role";

grant trigger on table "public"."ticket_messages" to "service_role";

grant truncate on table "public"."ticket_messages" to "service_role";

grant update on table "public"."ticket_messages" to "service_role";

grant delete on table "public"."transactions" to "anon";

grant insert on table "public"."transactions" to "anon";

grant references on table "public"."transactions" to "anon";

grant select on table "public"."transactions" to "anon";

grant trigger on table "public"."transactions" to "anon";

grant truncate on table "public"."transactions" to "anon";

grant update on table "public"."transactions" to "anon";

grant delete on table "public"."transactions" to "authenticated";

grant insert on table "public"."transactions" to "authenticated";

grant references on table "public"."transactions" to "authenticated";

grant select on table "public"."transactions" to "authenticated";

grant trigger on table "public"."transactions" to "authenticated";

grant truncate on table "public"."transactions" to "authenticated";

grant update on table "public"."transactions" to "authenticated";

grant delete on table "public"."transactions" to "service_role";

grant insert on table "public"."transactions" to "service_role";

grant references on table "public"."transactions" to "service_role";

grant select on table "public"."transactions" to "service_role";

grant trigger on table "public"."transactions" to "service_role";

grant truncate on table "public"."transactions" to "service_role";

grant update on table "public"."transactions" to "service_role";

grant delete on table "public"."trial_addon_usage" to "anon";

grant insert on table "public"."trial_addon_usage" to "anon";

grant references on table "public"."trial_addon_usage" to "anon";

grant select on table "public"."trial_addon_usage" to "anon";

grant trigger on table "public"."trial_addon_usage" to "anon";

grant truncate on table "public"."trial_addon_usage" to "anon";

grant update on table "public"."trial_addon_usage" to "anon";

grant delete on table "public"."trial_addon_usage" to "authenticated";

grant insert on table "public"."trial_addon_usage" to "authenticated";

grant references on table "public"."trial_addon_usage" to "authenticated";

grant select on table "public"."trial_addon_usage" to "authenticated";

grant trigger on table "public"."trial_addon_usage" to "authenticated";

grant truncate on table "public"."trial_addon_usage" to "authenticated";

grant update on table "public"."trial_addon_usage" to "authenticated";

grant delete on table "public"."trial_addon_usage" to "service_role";

grant insert on table "public"."trial_addon_usage" to "service_role";

grant references on table "public"."trial_addon_usage" to "service_role";

grant select on table "public"."trial_addon_usage" to "service_role";

grant trigger on table "public"."trial_addon_usage" to "service_role";

grant truncate on table "public"."trial_addon_usage" to "service_role";

grant update on table "public"."trial_addon_usage" to "service_role";

grant delete on table "public"."user_roles" to "anon";

grant insert on table "public"."user_roles" to "anon";

grant references on table "public"."user_roles" to "anon";

grant select on table "public"."user_roles" to "anon";

grant trigger on table "public"."user_roles" to "anon";

grant truncate on table "public"."user_roles" to "anon";

grant update on table "public"."user_roles" to "anon";

grant delete on table "public"."user_roles" to "authenticated";

grant insert on table "public"."user_roles" to "authenticated";

grant references on table "public"."user_roles" to "authenticated";

grant select on table "public"."user_roles" to "authenticated";

grant trigger on table "public"."user_roles" to "authenticated";

grant truncate on table "public"."user_roles" to "authenticated";

grant update on table "public"."user_roles" to "authenticated";

grant delete on table "public"."user_roles" to "service_role";

grant insert on table "public"."user_roles" to "service_role";

grant references on table "public"."user_roles" to "service_role";

grant select on table "public"."user_roles" to "service_role";

grant trigger on table "public"."user_roles" to "service_role";

grant truncate on table "public"."user_roles" to "service_role";

grant update on table "public"."user_roles" to "service_role";

grant delete on table "public"."user_settings" to "anon";

grant insert on table "public"."user_settings" to "anon";

grant references on table "public"."user_settings" to "anon";

grant select on table "public"."user_settings" to "anon";

grant trigger on table "public"."user_settings" to "anon";

grant truncate on table "public"."user_settings" to "anon";

grant update on table "public"."user_settings" to "anon";

grant delete on table "public"."user_settings" to "authenticated";

grant insert on table "public"."user_settings" to "authenticated";

grant references on table "public"."user_settings" to "authenticated";

grant select on table "public"."user_settings" to "authenticated";

grant trigger on table "public"."user_settings" to "authenticated";

grant truncate on table "public"."user_settings" to "authenticated";

grant update on table "public"."user_settings" to "authenticated";

grant delete on table "public"."user_settings" to "service_role";

grant insert on table "public"."user_settings" to "service_role";

grant references on table "public"."user_settings" to "service_role";

grant select on table "public"."user_settings" to "service_role";

grant trigger on table "public"."user_settings" to "service_role";

grant truncate on table "public"."user_settings" to "service_role";

grant update on table "public"."user_settings" to "service_role";

grant delete on table "public"."vendors" to "anon";

grant insert on table "public"."vendors" to "anon";

grant references on table "public"."vendors" to "anon";

grant select on table "public"."vendors" to "anon";

grant trigger on table "public"."vendors" to "anon";

grant truncate on table "public"."vendors" to "anon";

grant update on table "public"."vendors" to "anon";

grant delete on table "public"."vendors" to "authenticated";

grant insert on table "public"."vendors" to "authenticated";

grant references on table "public"."vendors" to "authenticated";

grant select on table "public"."vendors" to "authenticated";

grant trigger on table "public"."vendors" to "authenticated";

grant truncate on table "public"."vendors" to "authenticated";

grant update on table "public"."vendors" to "authenticated";

grant delete on table "public"."vendors" to "service_role";

grant insert on table "public"."vendors" to "service_role";

grant references on table "public"."vendors" to "service_role";

grant select on table "public"."vendors" to "service_role";

grant trigger on table "public"."vendors" to "service_role";

grant truncate on table "public"."vendors" to "service_role";

grant update on table "public"."vendors" to "service_role";


  create policy "Admins can view account modification audit"
  on "public"."account_modification_audit"
  as permissive
  for select
  to authenticated
using ((public.is_website_admin() OR public.has_admin_role(auth.uid())));



  create policy "Allow public token validation"
  on "public"."admin_permissions"
  as permissive
  for select
  to anon
using (((invitation_token IS NOT NULL) AND (account_created = false) AND (token_expires_at > now())));



  create policy "Website admins can delete admin permissions"
  on "public"."admin_permissions"
  as permissive
  for delete
  to authenticated
using (public.is_website_admin());



  create policy "Website admins can invite admins"
  on "public"."admin_permissions"
  as permissive
  for insert
  to authenticated
with check (public.is_website_admin());



  create policy "Website admins can update admin permissions"
  on "public"."admin_permissions"
  as permissive
  for update
  to authenticated
using (public.is_website_admin());



  create policy "Website admins can view admin permissions"
  on "public"."admin_permissions"
  as permissive
  for select
  to authenticated
using (public.is_website_admin());



  create policy "Admins can view all payouts"
  on "public"."affiliate_payouts"
  as permissive
  for select
  to public
using ((public.has_admin_role(auth.uid()) OR public.is_website_admin()));



  create policy "Affiliates can view their payouts"
  on "public"."affiliate_payouts"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.affiliates
  WHERE ((affiliates.id = affiliate_payouts.affiliate_id) AND (affiliates.user_id = auth.uid())))));



  create policy "Admins can manage all affiliate referrals"
  on "public"."affiliate_referrals"
  as permissive
  for all
  to public
using (public.is_website_admin())
with check (public.is_website_admin());



  create policy "Affiliates can view their own referrals"
  on "public"."affiliate_referrals"
  as permissive
  for select
  to public
using (((affiliate_id IN ( SELECT affiliates.id
   FROM public.affiliates
  WHERE (affiliates.user_id = auth.uid()))) OR public.is_website_admin()));



  create policy "Affiliates can view their referrals"
  on "public"."affiliate_referrals"
  as permissive
  for select
  to public
using (((EXISTS ( SELECT 1
   FROM public.affiliates
  WHERE ((affiliates.id = affiliate_referrals.affiliate_id) AND (affiliates.user_id = auth.uid())))) OR public.has_admin_role(auth.uid()) OR public.is_website_admin()));



  create policy "System can manage affiliate referrals"
  on "public"."affiliate_referrals"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Admins can update all affiliates"
  on "public"."affiliates"
  as permissive
  for update
  to public
using ((public.has_admin_role(auth.uid()) OR public.is_website_admin()));



  create policy "Admins can view all affiliates"
  on "public"."affiliates"
  as permissive
  for select
  to public
using ((public.has_admin_role(auth.uid()) OR public.is_website_admin()));



  create policy "Users can create their own affiliate profile"
  on "public"."affiliates"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update their own affiliate profile"
  on "public"."affiliates"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own affiliate profile"
  on "public"."affiliates"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Account members can create Amazon accounts"
  on "public"."amazon_accounts"
  as permissive
  for insert
  to authenticated
with check (public.user_belongs_to_account(account_id));



  create policy "Account members can delete Amazon accounts"
  on "public"."amazon_accounts"
  as permissive
  for delete
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Account members can update Amazon accounts"
  on "public"."amazon_accounts"
  as permissive
  for update
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Account members can view Amazon accounts"
  on "public"."amazon_accounts"
  as permissive
  for select
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Admins can view Amazon connection audit"
  on "public"."amazon_connection_audit"
  as permissive
  for select
  to authenticated
using ((public.is_website_admin() OR public.has_admin_role(auth.uid())));



  create policy "Account members can create daily draws"
  on "public"."amazon_daily_draws"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.account_id = amazon_daily_draws.account_id)))));



  create policy "Account members can delete daily draws"
  on "public"."amazon_daily_draws"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.account_id = amazon_daily_draws.account_id)))));



  create policy "Account members can update daily draws"
  on "public"."amazon_daily_draws"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.account_id = amazon_daily_draws.account_id)))));



  create policy "Account members can view daily draws"
  on "public"."amazon_daily_draws"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.account_id = amazon_daily_draws.account_id)))));



  create policy "Users can delete their own daily rollups"
  on "public"."amazon_daily_rollups"
  as permissive
  for delete
  to authenticated
using ((user_id = auth.uid()));



  create policy "Users can insert their own daily rollups"
  on "public"."amazon_daily_rollups"
  as permissive
  for insert
  to authenticated
with check ((user_id = auth.uid()));



  create policy "Users can update their own daily rollups"
  on "public"."amazon_daily_rollups"
  as permissive
  for update
  to authenticated
using ((user_id = auth.uid()));



  create policy "Users can view their own daily rollups"
  on "public"."amazon_daily_rollups"
  as permissive
  for select
  to authenticated
using ((user_id = auth.uid()));



  create policy "Admins can view all Amazon payouts"
  on "public"."amazon_payouts"
  as permissive
  for select
  to authenticated
using ((public.has_admin_role(auth.uid()) OR public.is_website_admin()));



  create policy "Users can create their Amazon payouts"
  on "public"."amazon_payouts"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can delete their Amazon payouts"
  on "public"."amazon_payouts"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can update their Amazon payouts"
  on "public"."amazon_payouts"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their Amazon payouts"
  on "public"."amazon_payouts"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Admins can manage all sync logs"
  on "public"."amazon_sync_logs"
  as permissive
  for all
  to public
using (public.is_website_admin())
with check (public.is_website_admin());



  create policy "System can create sync logs"
  on "public"."amazon_sync_logs"
  as permissive
  for insert
  to public
with check ((user_id = auth.uid()));



  create policy "System can insert sync logs"
  on "public"."amazon_sync_logs"
  as permissive
  for insert
  to public
with check (true);



  create policy "System can update sync logs"
  on "public"."amazon_sync_logs"
  as permissive
  for update
  to public
using (true);



  create policy "Users can view their own sync logs"
  on "public"."amazon_sync_logs"
  as permissive
  for select
  to public
using (((user_id = auth.uid()) OR public.is_website_admin()));



  create policy "Users can create their own Amazon transactions"
  on "public"."amazon_transactions"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can delete their own Amazon transactions"
  on "public"."amazon_transactions"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can update their own Amazon transactions"
  on "public"."amazon_transactions"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own Amazon transactions"
  on "public"."amazon_transactions"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Admins can view audit logs"
  on "public"."audit_logs"
  as permissive
  for select
  to public
using ((public.is_website_admin() OR public.has_admin_role(auth.uid())));



  create policy "Account members can create bank accounts"
  on "public"."bank_accounts"
  as permissive
  for insert
  to authenticated
with check (public.user_belongs_to_account(account_id));



  create policy "Account members can delete bank accounts"
  on "public"."bank_accounts"
  as permissive
  for delete
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Account members can update bank accounts"
  on "public"."bank_accounts"
  as permissive
  for update
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Account members can view bank accounts"
  on "public"."bank_accounts"
  as permissive
  for select
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Admins can view sync logs"
  on "public"."bank_sync_logs"
  as permissive
  for select
  to public
using ((public.has_admin_role(auth.uid()) OR public.is_website_admin()));



  create policy "Account members can create bank transactions"
  on "public"."bank_transactions"
  as permissive
  for insert
  to authenticated
with check (public.user_belongs_to_account(account_id));



  create policy "Account members can delete bank transactions"
  on "public"."bank_transactions"
  as permissive
  for delete
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Account members can update bank transactions"
  on "public"."bank_transactions"
  as permissive
  for update
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Account members can view bank transactions"
  on "public"."bank_transactions"
  as permissive
  for select
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Account members can create cash flow events"
  on "public"."cash_flow_events"
  as permissive
  for insert
  to authenticated
with check (public.user_belongs_to_account(account_id));



  create policy "Account members can delete cash flow events"
  on "public"."cash_flow_events"
  as permissive
  for delete
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Account members can update cash flow events"
  on "public"."cash_flow_events"
  as permissive
  for update
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Account members can view cash flow events"
  on "public"."cash_flow_events"
  as permissive
  for select
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Account members can create insights"
  on "public"."cash_flow_insights"
  as permissive
  for insert
  to authenticated
with check (public.user_belongs_to_account(account_id));



  create policy "Account members can update insights"
  on "public"."cash_flow_insights"
  as permissive
  for update
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Account members can view insights"
  on "public"."cash_flow_insights"
  as permissive
  for select
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Account members can create categories"
  on "public"."categories"
  as permissive
  for insert
  to public
with check (public.user_belongs_to_account(account_id));



  create policy "Account members can delete categories"
  on "public"."categories"
  as permissive
  for delete
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Account members can update categories"
  on "public"."categories"
  as permissive
  for update
  to public
using (public.user_belongs_to_account(account_id));



  create policy "Account members can view categories"
  on "public"."categories"
  as permissive
  for select
  to public
using (public.user_belongs_to_account(account_id));



  create policy "Account members can create credit card payments"
  on "public"."credit_card_payments"
  as permissive
  for insert
  to public
with check (public.user_belongs_to_account(account_id));



  create policy "Account members can delete credit card payments"
  on "public"."credit_card_payments"
  as permissive
  for delete
  to public
using (public.user_belongs_to_account(account_id));



  create policy "Account members can update credit card payments"
  on "public"."credit_card_payments"
  as permissive
  for update
  to public
using (public.user_belongs_to_account(account_id));



  create policy "Account members can view credit card payments"
  on "public"."credit_card_payments"
  as permissive
  for select
  to public
using (public.user_belongs_to_account(account_id));



  create policy "Account members can create credit cards"
  on "public"."credit_cards"
  as permissive
  for insert
  to authenticated
with check (public.user_belongs_to_account(account_id));



  create policy "Account members can delete credit cards"
  on "public"."credit_cards"
  as permissive
  for delete
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Account members can update credit cards"
  on "public"."credit_cards"
  as permissive
  for update
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Account members can view credit cards"
  on "public"."credit_cards"
  as permissive
  for select
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Admins can manage custom discount codes"
  on "public"."custom_discount_codes"
  as permissive
  for all
  to public
using ((public.is_website_admin() OR public.has_admin_role(auth.uid())))
with check ((public.is_website_admin() OR public.has_admin_role(auth.uid())));



  create policy "Account members can create customers"
  on "public"."customers"
  as permissive
  for insert
  to authenticated
with check (public.user_belongs_to_account(account_id));



  create policy "Account members can delete customers"
  on "public"."customers"
  as permissive
  for delete
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Account members can update customers"
  on "public"."customers"
  as permissive
  for update
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Account members can view customers"
  on "public"."customers"
  as permissive
  for select
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Users can delete their own deleted transactions"
  on "public"."deleted_transactions"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert their own deleted transactions"
  on "public"."deleted_transactions"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can view their own deleted transactions"
  on "public"."deleted_transactions"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Account members can create documents"
  on "public"."documents_metadata"
  as permissive
  for insert
  to authenticated
with check (public.user_belongs_to_account(account_id));



  create policy "Account members can delete documents"
  on "public"."documents_metadata"
  as permissive
  for delete
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Account members can update documents"
  on "public"."documents_metadata"
  as permissive
  for update
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Account members can view documents"
  on "public"."documents_metadata"
  as permissive
  for select
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Admins can update all feature requests"
  on "public"."feature_requests"
  as permissive
  for update
  to public
using (public.has_admin_role(auth.uid()));



  create policy "Admins can view all feature requests"
  on "public"."feature_requests"
  as permissive
  for select
  to public
using (public.has_admin_role(auth.uid()));



  create policy "Users can create feature requests"
  on "public"."feature_requests"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can view their own feature requests"
  on "public"."feature_requests"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Admins and website admin can view all logs"
  on "public"."forecast_accuracy_log"
  as permissive
  for select
  to authenticated
using ((public.is_website_admin() OR (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role))))));



  create policy "System can insert forecast accuracy logs"
  on "public"."forecast_accuracy_log"
  as permissive
  for insert
  to public
with check (true);



  create policy "Users can view their own logs"
  on "public"."forecast_accuracy_log"
  as permissive
  for select
  to authenticated
using ((auth.uid() = user_id));



  create policy "Account members can create income"
  on "public"."income"
  as permissive
  for insert
  to authenticated
with check (public.user_belongs_to_account(account_id));



  create policy "Account members can delete income"
  on "public"."income"
  as permissive
  for delete
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Account members can update income"
  on "public"."income"
  as permissive
  for update
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Account members can view income"
  on "public"."income"
  as permissive
  for select
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Admins can view monthly support metrics"
  on "public"."monthly_support_metrics"
  as permissive
  for select
  to public
using ((public.is_website_admin() OR public.has_admin_role(auth.uid())));



  create policy "System can insert monthly support metrics"
  on "public"."monthly_support_metrics"
  as permissive
  for insert
  to public
with check (true);



  create policy "Account members can create notification history"
  on "public"."notification_history"
  as permissive
  for insert
  to authenticated
with check (public.user_belongs_to_account(account_id));



  create policy "Account members can delete notification history"
  on "public"."notification_history"
  as permissive
  for delete
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Account members can update notification history"
  on "public"."notification_history"
  as permissive
  for update
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Account members can view notification history"
  on "public"."notification_history"
  as permissive
  for select
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Account members can create notification preferences"
  on "public"."notification_preferences"
  as permissive
  for insert
  to authenticated
with check (public.user_belongs_to_account(account_id));



  create policy "Account members can delete notification preferences"
  on "public"."notification_preferences"
  as permissive
  for delete
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Account members can update notification preferences"
  on "public"."notification_preferences"
  as permissive
  for update
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Account members can view notification preferences"
  on "public"."notification_preferences"
  as permissive
  for select
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "No direct access to reset tokens"
  on "public"."password_reset_tokens"
  as permissive
  for all
  to public
using (false);



  create policy "Account members can create payees"
  on "public"."payees"
  as permissive
  for insert
  to public
with check (public.user_belongs_to_account(account_id));



  create policy "Account members can delete payees"
  on "public"."payees"
  as permissive
  for delete
  to public
using (public.user_belongs_to_account(account_id));



  create policy "Account members can update payees"
  on "public"."payees"
  as permissive
  for update
  to public
using (public.user_belongs_to_account(account_id));



  create policy "Account members can view payees"
  on "public"."payees"
  as permissive
  for select
  to public
using (public.user_belongs_to_account(account_id));



  create policy "Authenticated users can view plan limits"
  on "public"."plan_limits"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Only admins can modify plan limits"
  on "public"."plan_limits"
  as permissive
  for all
  to public
using (public.is_website_admin())
with check (public.is_website_admin());



  create policy "System can insert plan override audit logs"
  on "public"."plan_override_audit"
  as permissive
  for insert
  to public
with check (true);



  create policy "Website admins can view plan override audit logs"
  on "public"."plan_override_audit"
  as permissive
  for select
  to public
using ((public.is_website_admin() OR public.has_admin_role(auth.uid())));



  create policy "Admins can view all profiles"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using (public.has_admin_role(auth.uid()));



  create policy "Allow anon to read referral codes for validation"
  on "public"."profiles"
  as permissive
  for select
  to anon
using ((my_referral_code IS NOT NULL));



  create policy "Users can insert own profile only"
  on "public"."profiles"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = user_id));



  create policy "Users can insert their own profile"
  on "public"."profiles"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update own profile only"
  on "public"."profiles"
  as permissive
  for update
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "Users can update their own profile"
  on "public"."profiles"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view own profile only"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using ((auth.uid() = user_id));



  create policy "Users can view profiles in their account"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using ((account_id = public.get_user_account_id(auth.uid())));



  create policy "Users can view their own profile"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Website admin can view all profiles"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using (public.is_website_admin());



  create policy "Users can delete their own line items"
  on "public"."purchase_order_line_items"
  as permissive
  for delete
  to authenticated
using ((auth.uid() = user_id));



  create policy "Users can insert their own line items"
  on "public"."purchase_order_line_items"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = user_id));



  create policy "Users can update their own line items"
  on "public"."purchase_order_line_items"
  as permissive
  for update
  to authenticated
using ((auth.uid() = user_id));



  create policy "Users can view their own line items"
  on "public"."purchase_order_line_items"
  as permissive
  for select
  to authenticated
using ((auth.uid() = user_id));



  create policy "Account members can create purchased addons"
  on "public"."purchased_addons"
  as permissive
  for insert
  to public
with check (public.user_belongs_to_account(account_id));



  create policy "Account members can view their purchased addons"
  on "public"."purchased_addons"
  as permissive
  for select
  to public
using (public.user_belongs_to_account(account_id));



  create policy "Account members can create exceptions"
  on "public"."recurring_expense_exceptions"
  as permissive
  for insert
  to public
with check (public.user_belongs_to_account(account_id));



  create policy "Account members can delete exceptions"
  on "public"."recurring_expense_exceptions"
  as permissive
  for delete
  to public
using (public.user_belongs_to_account(account_id));



  create policy "Account members can view exceptions"
  on "public"."recurring_expense_exceptions"
  as permissive
  for select
  to public
using (public.user_belongs_to_account(account_id));



  create policy "Account members can create recurring expenses"
  on "public"."recurring_expenses"
  as permissive
  for insert
  to authenticated
with check (public.user_belongs_to_account(account_id));



  create policy "Account members can delete recurring expenses"
  on "public"."recurring_expenses"
  as permissive
  for delete
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Account members can update recurring expenses"
  on "public"."recurring_expenses"
  as permissive
  for update
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Account members can view recurring expenses"
  on "public"."recurring_expenses"
  as permissive
  for select
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Admins can delete referral codes"
  on "public"."referral_codes"
  as permissive
  for delete
  to public
using ((public.has_admin_role(auth.uid()) OR public.is_website_admin()));



  create policy "Admins can insert referral codes"
  on "public"."referral_codes"
  as permissive
  for insert
  to public
with check ((public.has_admin_role(auth.uid()) OR public.is_website_admin()));



  create policy "Admins can update referral codes"
  on "public"."referral_codes"
  as permissive
  for update
  to public
using ((public.has_admin_role(auth.uid()) OR public.is_website_admin()))
with check ((public.has_admin_role(auth.uid()) OR public.is_website_admin()));



  create policy "Admins can view all referral codes"
  on "public"."referral_codes"
  as permissive
  for select
  to public
using ((public.has_admin_role(auth.uid()) OR public.is_website_admin()));



  create policy "Allow public to validate active referral codes"
  on "public"."referral_codes"
  as permissive
  for select
  to anon, authenticated
using ((is_active = true));



  create policy "Admins can view all referral rewards"
  on "public"."referral_rewards"
  as permissive
  for select
  to public
using ((public.has_admin_role(auth.uid()) OR public.is_website_admin()));



  create policy "System can manage rewards"
  on "public"."referral_rewards"
  as permissive
  for all
  to public
using (public.is_website_admin())
with check (public.is_website_admin());



  create policy "Users can view their own rewards"
  on "public"."referral_rewards"
  as permissive
  for select
  to public
using (((user_id = auth.uid()) OR public.is_website_admin()));



  create policy "Admins can manage all referrals"
  on "public"."referrals"
  as permissive
  for all
  to public
using (public.is_website_admin())
with check (public.is_website_admin());



  create policy "Admins can view all referrals"
  on "public"."referrals"
  as permissive
  for select
  to public
using ((public.has_admin_role(auth.uid()) OR public.is_website_admin()));



  create policy "System can create referrals"
  on "public"."referrals"
  as permissive
  for insert
  to public
with check (true);



  create policy "System can update referrals"
  on "public"."referrals"
  as permissive
  for update
  to public
using (true);



  create policy "Users can create referrals"
  on "public"."referrals"
  as permissive
  for insert
  to public
with check ((referred_user_id = auth.uid()));



  create policy "Users can view referrals they made"
  on "public"."referrals"
  as permissive
  for select
  to public
using ((auth.uid() = referrer_id));



  create policy "Users can view their own referrals"
  on "public"."referrals"
  as permissive
  for select
  to public
using (((referrer_id = auth.uid()) OR (referred_user_id = auth.uid()) OR public.is_website_admin()));



  create policy "Account members can create scenarios"
  on "public"."scenarios"
  as permissive
  for insert
  to authenticated
with check (public.user_belongs_to_account(account_id));



  create policy "Account members can delete scenarios"
  on "public"."scenarios"
  as permissive
  for delete
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Account members can update scenarios"
  on "public"."scenarios"
  as permissive
  for update
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Account members can view scenarios"
  on "public"."scenarios"
  as permissive
  for select
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Admins can insert stripe audit log"
  on "public"."stripe_customer_audit_log"
  as permissive
  for insert
  to authenticated
with check (public.is_website_admin());



  create policy "Admins can view stripe audit log"
  on "public"."stripe_customer_audit_log"
  as permissive
  for select
  to authenticated
using (public.is_website_admin());



  create policy "Admins can delete support tickets"
  on "public"."support_tickets"
  as permissive
  for delete
  to public
using (public.is_admin_staff());



  create policy "Admins can update all support tickets"
  on "public"."support_tickets"
  as permissive
  for update
  to public
using (public.is_admin_staff());



  create policy "Admins can view all support tickets"
  on "public"."support_tickets"
  as permissive
  for select
  to public
using (public.is_admin_staff());



  create policy "Users can create their own support tickets"
  on "public"."support_tickets"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update their own support tickets"
  on "public"."support_tickets"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own support tickets"
  on "public"."support_tickets"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Account admins can create invitations"
  on "public"."team_invitations"
  as permissive
  for insert
  to public
with check (public.is_account_admin(auth.uid(), account_id));



  create policy "Account admins can delete invitations"
  on "public"."team_invitations"
  as permissive
  for delete
  to public
using (public.is_account_admin(auth.uid(), account_id));



  create policy "Account admins can update invitations"
  on "public"."team_invitations"
  as permissive
  for update
  to public
using (public.is_account_admin(auth.uid(), account_id));



  create policy "Users can view invitations in their account"
  on "public"."team_invitations"
  as permissive
  for select
  to public
using ((account_id = public.get_user_account_id(auth.uid())));



  create policy "Admins can view all feedback"
  on "public"."ticket_feedback"
  as permissive
  for select
  to public
using (public.is_admin_staff());



  create policy "Users can create their own feedback"
  on "public"."ticket_feedback"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can view their own feedback"
  on "public"."ticket_feedback"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Admins can create ticket messages"
  on "public"."ticket_messages"
  as permissive
  for insert
  to public
with check (public.is_admin_staff());



  create policy "Admins can view all ticket messages"
  on "public"."ticket_messages"
  as permissive
  for select
  to public
using (public.is_admin_staff());



  create policy "Users can create messages for their tickets"
  on "public"."ticket_messages"
  as permissive
  for insert
  to public
with check (((EXISTS ( SELECT 1
   FROM public.support_tickets
  WHERE ((support_tickets.id = ticket_messages.ticket_id) AND (support_tickets.user_id = auth.uid())))) AND (auth.uid() = user_id)));



  create policy "Users can insert messages on their own tickets"
  on "public"."ticket_messages"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.support_tickets
  WHERE ((support_tickets.id = ticket_messages.ticket_id) AND (support_tickets.user_id = auth.uid())))));



  create policy "Users can view their own ticket messages"
  on "public"."ticket_messages"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.support_tickets
  WHERE ((support_tickets.id = ticket_messages.ticket_id) AND (support_tickets.user_id = auth.uid())))));



  create policy "Users can view their ticket messages"
  on "public"."ticket_messages"
  as permissive
  for select
  to public
using (((EXISTS ( SELECT 1
   FROM public.support_tickets
  WHERE ((support_tickets.id = ticket_messages.ticket_id) AND (support_tickets.user_id = auth.uid())))) AND (is_internal = false)));



  create policy "Website admins can insert messages on any ticket"
  on "public"."ticket_messages"
  as permissive
  for insert
  to public
with check (public.is_website_admin());



  create policy "Website admins can view all ticket messages"
  on "public"."ticket_messages"
  as permissive
  for select
  to public
using (public.is_website_admin());



  create policy "Account members can create transactions"
  on "public"."transactions"
  as permissive
  for insert
  to authenticated
with check (public.user_belongs_to_account(account_id));



  create policy "Account members can delete transactions"
  on "public"."transactions"
  as permissive
  for delete
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Account members can update transactions"
  on "public"."transactions"
  as permissive
  for update
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Account members can view transactions"
  on "public"."transactions"
  as permissive
  for select
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Users can insert their own trial addon usage"
  on "public"."trial_addon_usage"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update their own trial addon usage"
  on "public"."trial_addon_usage"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own trial addon usage"
  on "public"."trial_addon_usage"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Account admins can delete roles"
  on "public"."user_roles"
  as permissive
  for delete
  to public
using (public.is_account_admin(auth.uid(), account_id));



  create policy "Account admins can insert roles"
  on "public"."user_roles"
  as permissive
  for insert
  to public
with check (public.is_account_admin(auth.uid(), account_id));



  create policy "Account admins can update roles"
  on "public"."user_roles"
  as permissive
  for update
  to public
using (public.is_account_admin(auth.uid(), account_id));



  create policy "Users can view roles in their account"
  on "public"."user_roles"
  as permissive
  for select
  to public
using ((account_id = public.get_user_account_id(auth.uid())));



  create policy "Account members can create settings"
  on "public"."user_settings"
  as permissive
  for insert
  to authenticated
with check ((account_id IN ( SELECT profiles.account_id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))));



  create policy "Account members can update settings"
  on "public"."user_settings"
  as permissive
  for update
  to authenticated
using ((account_id IN ( SELECT profiles.account_id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))))
with check ((account_id IN ( SELECT profiles.account_id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))));



  create policy "Account members can view settings"
  on "public"."user_settings"
  as permissive
  for select
  to authenticated
using ((account_id IN ( SELECT profiles.account_id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))));



  create policy "Users can insert their own settings"
  on "public"."user_settings"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update their own settings"
  on "public"."user_settings"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own settings"
  on "public"."user_settings"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Account members can create vendors"
  on "public"."vendors"
  as permissive
  for insert
  to authenticated
with check (public.user_belongs_to_account(account_id));



  create policy "Account members can delete vendors"
  on "public"."vendors"
  as permissive
  for delete
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Account members can update vendors"
  on "public"."vendors"
  as permissive
  for update
  to authenticated
using (public.user_belongs_to_account(account_id));



  create policy "Account members can view vendors"
  on "public"."vendors"
  as permissive
  for select
  to authenticated
using (public.user_belongs_to_account(account_id));


CREATE TRIGGER update_admin_permissions_updated_at BEFORE UPDATE ON public.admin_permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_affiliate_payouts_updated_at BEFORE UPDATE ON public.affiliate_payouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER handle_affiliate_referral_churn AFTER UPDATE ON public.affiliate_referrals FOR EACH ROW EXECUTE FUNCTION public.handle_affiliate_churn();

CREATE TRIGGER update_affiliate_referrals_updated_at BEFORE UPDATE ON public.affiliate_referrals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_affiliate_tier_on_referral AFTER INSERT OR DELETE OR UPDATE ON public.affiliate_referrals FOR EACH ROW EXECUTE FUNCTION public.update_affiliate_tier();

CREATE TRIGGER update_affiliates_updated_at BEFORE UPDATE ON public.affiliates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_commission_on_tier_change BEFORE UPDATE OF tier ON public.affiliates FOR EACH ROW WHEN ((old.tier IS DISTINCT FROM new.tier)) EXECUTE FUNCTION public.update_affiliate_commission_rate();

CREATE TRIGGER check_seller_uniqueness BEFORE INSERT OR UPDATE ON public.amazon_accounts FOR EACH ROW EXECUTE FUNCTION public.validate_amazon_seller_uniqueness();

CREATE TRIGGER log_amazon_duplicate_attempts BEFORE INSERT OR UPDATE ON public.amazon_accounts FOR EACH ROW EXECUTE FUNCTION public.log_duplicate_amazon_attempt();

CREATE TRIGGER prevent_amazon_account_changes BEFORE UPDATE ON public.amazon_accounts FOR EACH ROW EXECUTE FUNCTION public.prevent_unauthorized_account_changes();

CREATE TRIGGER set_amazon_accounts_account_id BEFORE INSERT ON public.amazon_accounts FOR EACH ROW EXECUTE FUNCTION public.set_account_id_from_user();

CREATE TRIGGER sync_amazon_accounts_user_id BEFORE INSERT OR UPDATE OF account_id ON public.amazon_accounts FOR EACH ROW EXECUTE FUNCTION public.sync_user_id_with_account();

CREATE TRIGGER update_amazon_accounts_updated_at BEFORE UPDATE ON public.amazon_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER sync_amazon_daily_draws_user_id BEFORE INSERT OR UPDATE OF account_id ON public.amazon_daily_draws FOR EACH ROW EXECUTE FUNCTION public.sync_user_id_with_account();

CREATE TRIGGER update_amazon_daily_draws_updated_at BEFORE UPDATE ON public.amazon_daily_draws FOR EACH ROW EXECUTE FUNCTION public.update_amazon_daily_draws_updated_at();

CREATE TRIGGER sync_amazon_daily_rollups_user_id BEFORE INSERT OR UPDATE OF account_id ON public.amazon_daily_rollups FOR EACH ROW EXECUTE FUNCTION public.sync_user_id_with_account();

CREATE TRIGGER update_daily_rollups_updated_at BEFORE UPDATE ON public.amazon_daily_rollups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_amazon_payouts_account_id BEFORE INSERT ON public.amazon_payouts FOR EACH ROW EXECUTE FUNCTION public.set_account_id_from_user();

CREATE TRIGGER sync_amazon_payouts_user_id BEFORE INSERT OR UPDATE OF account_id ON public.amazon_payouts FOR EACH ROW EXECUTE FUNCTION public.sync_user_id_with_account();

CREATE TRIGGER update_amazon_payouts_updated_at BEFORE UPDATE ON public.amazon_payouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER sync_amazon_transactions_user_id BEFORE INSERT OR UPDATE OF account_id ON public.amazon_transactions FOR EACH ROW EXECUTE FUNCTION public.sync_user_id_with_account();

CREATE TRIGGER set_bank_accounts_account_id BEFORE INSERT ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION public.set_account_id_from_user();

CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION public.update_bank_accounts_updated_at();

CREATE TRIGGER set_bank_transactions_account_id BEFORE INSERT ON public.bank_transactions FOR EACH ROW EXECUTE FUNCTION public.set_account_id_from_user();

CREATE TRIGGER trigger_update_balance_on_transaction AFTER INSERT OR DELETE OR UPDATE ON public.bank_transactions FOR EACH ROW EXECUTE FUNCTION public.update_bank_account_balance();

CREATE TRIGGER trigger_update_bank_balance_on_delete AFTER DELETE ON public.bank_transactions FOR EACH ROW EXECUTE FUNCTION public.update_bank_balance_on_transaction_change();

CREATE TRIGGER trigger_update_bank_balance_on_insert AFTER INSERT ON public.bank_transactions FOR EACH ROW EXECUTE FUNCTION public.update_bank_balance_on_transaction_change();

CREATE TRIGGER trigger_update_bank_balance_on_update AFTER UPDATE ON public.bank_transactions FOR EACH ROW EXECUTE FUNCTION public.update_bank_balance_on_transaction_change();

CREATE TRIGGER trigger_update_credit_card_balance_on_delete AFTER DELETE ON public.bank_transactions FOR EACH ROW WHEN ((old.credit_card_id IS NOT NULL)) EXECUTE FUNCTION public.update_credit_card_balance_on_transaction_change();

CREATE TRIGGER trigger_update_credit_card_balance_on_insert AFTER INSERT ON public.bank_transactions FOR EACH ROW WHEN ((new.credit_card_id IS NOT NULL)) EXECUTE FUNCTION public.update_credit_card_balance_on_transaction_change();

CREATE TRIGGER trigger_update_credit_card_balance_on_update AFTER UPDATE ON public.bank_transactions FOR EACH ROW WHEN ((new.credit_card_id IS NOT NULL)) EXECUTE FUNCTION public.update_credit_card_balance_on_transaction_change();

CREATE TRIGGER set_cash_flow_events_account_id BEFORE INSERT ON public.cash_flow_events FOR EACH ROW EXECUTE FUNCTION public.set_account_id_from_user();

CREATE TRIGGER update_cash_flow_events_updated_at BEFORE UPDATE ON public.cash_flow_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_cash_flow_insights_account_id BEFORE INSERT ON public.cash_flow_insights FOR EACH ROW EXECUTE FUNCTION public.set_account_id_from_user();

CREATE TRIGGER update_cash_flow_insights_updated_at BEFORE UPDATE ON public.cash_flow_insights FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_categories_account_id BEFORE INSERT ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_account_id_from_user();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_credit_card_payments_updated_at BEFORE UPDATE ON public.credit_card_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_credit_cards_account_id BEFORE INSERT ON public.credit_cards FOR EACH ROW EXECUTE FUNCTION public.set_account_id_from_user();

CREATE TRIGGER update_credit_cards_updated_at BEFORE UPDATE ON public.credit_cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_custom_discount_codes_updated_at BEFORE UPDATE ON public.custom_discount_codes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_customers_account_id BEFORE INSERT ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_account_id_from_user();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_documents_metadata_account_id BEFORE INSERT ON public.documents_metadata FOR EACH ROW EXECUTE FUNCTION public.set_account_id_from_user();

CREATE TRIGGER update_documents_metadata_updated_at BEFORE UPDATE ON public.documents_metadata FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_feature_requests_updated_at BEFORE UPDATE ON public.feature_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_forecast_accuracy_log_updated_at BEFORE UPDATE ON public.forecast_accuracy_log FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_income_account_id BEFORE INSERT ON public.income FOR EACH ROW EXECUTE FUNCTION public.set_account_id_from_user();

CREATE TRIGGER update_income_updated_at BEFORE UPDATE ON public.income FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_notification_history_account_id BEFORE INSERT ON public.notification_history FOR EACH ROW EXECUTE FUNCTION public.set_account_id_from_user();

CREATE TRIGGER notification_preferences_updated_at BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_notification_preferences_updated_at();

CREATE TRIGGER set_notification_preferences_account_id BEFORE INSERT ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.set_account_id_from_user();

CREATE TRIGGER update_payees_updated_at BEFORE UPDATE ON public.payees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER create_default_categories_trigger AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.create_default_categories();

CREATE TRIGGER on_new_user_role AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

CREATE TRIGGER on_profile_created_assign_role AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_purchased_addons_updated_at BEFORE UPDATE ON public.purchased_addons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER log_recurring_expense_access_trigger AFTER INSERT OR DELETE OR UPDATE ON public.recurring_expenses FOR EACH ROW EXECUTE FUNCTION public.log_recurring_expense_access();

CREATE TRIGGER set_recurring_expenses_account_id BEFORE INSERT ON public.recurring_expenses FOR EACH ROW EXECUTE FUNCTION public.set_account_id_from_user();

CREATE TRIGGER update_recurring_expenses_updated_at BEFORE UPDATE ON public.recurring_expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER validate_recurring_expense_account_id_trigger BEFORE INSERT OR UPDATE ON public.recurring_expenses FOR EACH ROW EXECUTE FUNCTION public.validate_recurring_expense_account_id();

CREATE TRIGGER update_referral_codes_updated_at BEFORE UPDATE ON public.referral_codes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_referral_rewards_updated_at BEFORE UPDATE ON public.referral_rewards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_referral_created BEFORE INSERT ON public.referrals FOR EACH ROW EXECUTE FUNCTION public.apply_referred_user_discount();

CREATE TRIGGER trigger_update_referral_rewards AFTER INSERT OR UPDATE OF status ON public.referrals FOR EACH ROW EXECUTE FUNCTION public.update_referral_rewards();

CREATE TRIGGER update_referrals_updated_at BEFORE UPDATE ON public.referrals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_scenarios_account_id BEFORE INSERT ON public.scenarios FOR EACH ROW EXECUTE FUNCTION public.set_account_id_from_user();

CREATE TRIGGER update_scenarios_updated_at BEFORE UPDATE ON public.scenarios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_notify_customer_closed AFTER UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.notify_customer_on_ticket_closed();

CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ticket_feedback_updated_at BEFORE UPDATE ON public.ticket_feedback FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_notify_customer_response AFTER INSERT ON public.ticket_messages FOR EACH ROW EXECUTE FUNCTION public.notify_customer_on_staff_response();

CREATE TRIGGER update_ticket_status_on_message_trigger AFTER INSERT ON public.ticket_messages FOR EACH ROW EXECUTE FUNCTION public.update_ticket_status_on_message();

CREATE TRIGGER set_transactions_account_id BEFORE INSERT ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.set_account_id_from_user();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trial_addon_usage_updated_at BEFORE UPDATE ON public.trial_addon_usage FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_vendors_account_id BEFORE INSERT ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.set_account_id_from_user();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER track_affiliate_on_signup AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.track_affiliate_referral();


  create policy "Account members can delete purchase orders"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'purchase-orders'::text) AND ((storage.foldername(name))[1] IN ( SELECT (profiles.account_id)::text AS account_id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid())))));



  create policy "Account members can update purchase orders"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'purchase-orders'::text) AND ((storage.foldername(name))[1] IN ( SELECT (profiles.account_id)::text AS account_id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid())))));



  create policy "Account members can upload purchase orders"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'purchase-orders'::text) AND ((storage.foldername(name))[1] IN ( SELECT (profiles.account_id)::text AS account_id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid())))));



  create policy "Account members can view purchase orders"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'purchase-orders'::text) AND ((storage.foldername(name))[1] IN ( SELECT (profiles.account_id)::text AS account_id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid())))));



  create policy "Users can delete their own purchase orders"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'purchase-orders'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can update their own purchase orders"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'purchase-orders'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can upload their own purchase orders"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'purchase-orders'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can view their own purchase orders"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'purchase-orders'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



