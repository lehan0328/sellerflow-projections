-- Remove Inventory as a default expense category
DELETE FROM categories 
WHERE name = 'Inventory' 
AND type = 'expense' 
AND is_default = true;