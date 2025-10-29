-- Clean up removal orders and non-customer orders from amazon_transactions
-- These include S01- (FBA removal), D01- (liquidation), and other non-standard formats
-- Valid customer orders match format: xxx-xxxxxxx-xxxxxxx (3-7-7 digits)

DELETE FROM amazon_transactions 
WHERE transaction_id LIKE 'S01-%' 
   OR transaction_id LIKE 'D01-%'
   OR transaction_id !~ '^\d{3}-\d{7}-\d{7}$';