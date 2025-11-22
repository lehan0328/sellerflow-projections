alter table "public"."amazon_payouts" drop constraint "unique_payout_account_date_status";

drop index if exists "public"."unique_payout_account_date_status";


