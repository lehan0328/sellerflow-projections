-- Disconnect ALL Amazon accounts (full cleanup)
DELETE FROM amazon_transactions;
DELETE FROM amazon_payouts;
DELETE FROM amazon_daily_draws;
DELETE FROM amazon_accounts;

-- Log cleanup in audit table
INSERT INTO amazon_connection_audit (
  seller_id,
  previous_user_id,
  new_user_id,
  action,
  reason,
  performed_by
) VALUES (
  'ALL_ACCOUNTS',
  NULL,
  NULL,
  'mass_disconnect_and_delete',
  'Full cleanup - starting fresh with duplicate prevention',
  NULL
);