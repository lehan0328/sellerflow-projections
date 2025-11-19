/**
 * Shared cache configuration and versioning
 * Increment versions to bust cache after backend changes
 */

// Profile cache version - increment when profile schema/data changes
export const PROFILE_CACHE_VERSION = 2;

// Subscription cache version - managed in useSubscription.ts
export const SUBSCRIPTION_CACHE_VERSION = 2;

// Bank accounts cache version - increment when bank account schema/data changes
export const BANK_ACCOUNTS_CACHE_VERSION = 1;

// Transactions cache version - increment when transactions schema/data changes
export const TRANSACTIONS_CACHE_VERSION = 1;

// Amazon payouts cache version - increment when amazon payouts schema/data changes
export const AMAZON_PAYOUTS_CACHE_VERSION = 1;

// Bank transactions cache version - increment when bank transactions schema/data changes
export const BANK_TRANSACTIONS_CACHE_VERSION = 1;

// Credit cards cache version - increment when credit cards schema/data changes
export const CREDIT_CARDS_CACHE_VERSION = 1;

// Vendor transactions cache version - increment when vendor transactions schema/data changes
export const VENDOR_TRANSACTIONS_CACHE_VERSION = 1;

// Income cache version - increment when income schema/data changes
export const INCOME_CACHE_VERSION = 1;

// Reserve amount cache version - increment when user_settings schema/data changes
export const RESERVE_AMOUNT_CACHE_VERSION = 1;

// Vendors cache version - increment when vendors schema/data changes
export const VENDORS_CACHE_VERSION = 1;

// Customers cache version - increment when customers schema/data changes
export const CUSTOMERS_CACHE_VERSION = 1;

// Categories cache version - increment when categories schema/data changes
export const CATEGORIES_CACHE_VERSION = 1;

// Recurring expenses cache version - increment when recurring_expenses schema/data changes
export const RECURRING_EXPENSES_CACHE_VERSION = 1;

/**
 * Creates a versioned query key for profile data
 * @param userId - The user ID
 * @returns Versioned query key array
 */
export const profileQueryKey = (userId: string | undefined) => [
  'profile',
  userId,
  PROFILE_CACHE_VERSION
];

/**
 * Creates a versioned query key for profile company data
 * @param userId - The user ID
 * @returns Versioned query key array
 */
export const profileCompanyQueryKey = (userId: string | undefined) => [
  'profile-company',
  userId,
  PROFILE_CACHE_VERSION
];

/**
 * Creates a versioned query key for bank accounts data
 * @param userId - The user ID
 * @returns Versioned query key array
 */
export const bankAccountsQueryKey = (userId: string | undefined) => [
  'bank-accounts',
  userId,
  BANK_ACCOUNTS_CACHE_VERSION
];

/**
 * Creates a versioned query key for transactions data
 * @param userId - The user ID
 * @returns Versioned query key array
 */
export const transactionsQueryKey = (userId: string | undefined) => [
  'transactions',
  userId,
  TRANSACTIONS_CACHE_VERSION
];

/**
 * Creates a versioned query key for amazon payouts data
 * @param userId - The user ID
 * @returns Versioned query key array
 */
export const amazonPayoutsQueryKey = (userId: string | undefined) => [
  'amazon_payouts',
  userId,
  AMAZON_PAYOUTS_CACHE_VERSION
];

/**
 * Creates a versioned query key for bank transactions data
 * @param accountId - The account ID (optional)
 * @param accountType - The account type
 * @returns Versioned query key array
 */
export const bankTransactionsQueryKey = (accountId: string | undefined, accountType: 'bank' | 'credit') => [
  'bank_transactions',
  accountId,
  accountType,
  BANK_TRANSACTIONS_CACHE_VERSION
];

/**
 * Creates a versioned query key for credit cards data
 * @param userId - The user ID
 * @returns Versioned query key array
 */
export const creditCardsQueryKey = (userId: string | undefined) => [
  'credit_cards',
  userId,
  CREDIT_CARDS_CACHE_VERSION
];

/**
 * Creates a versioned query key for vendor transactions data
 * @param userId - The user ID
 * @returns Versioned query key array
 */
export const vendorTransactionsQueryKey = (userId: string | undefined) => [
  'vendor_transactions',
  userId,
  VENDOR_TRANSACTIONS_CACHE_VERSION
];

/**
 * Creates a versioned query key for income data
 * @param userId - The user ID
 * @returns Versioned query key array
 */
export const incomeQueryKey = (userId: string | undefined) => [
  'income',
  userId,
  INCOME_CACHE_VERSION
];

/**
 * Creates a versioned query key for reserve amount data
 * @param userId - The user ID
 * @returns Versioned query key array
 */
export const reserveAmountQueryKey = (userId: string | undefined) => [
  'reserve_amount',
  userId,
  RESERVE_AMOUNT_CACHE_VERSION
];

/**
 * Creates a versioned query key for vendors data
 * @param userId - The user ID
 * @returns Versioned query key array
 */
export const vendorsQueryKey = (userId: string | undefined) => [
  'vendors',
  userId,
  VENDORS_CACHE_VERSION
];

/**
 * Creates a versioned query key for customers data
 * @param userId - The user ID
 * @returns Versioned query key array
 */
export const customersQueryKey = (userId: string | undefined) => [
  'customers',
  userId,
  CUSTOMERS_CACHE_VERSION
];

/**
 * Creates a versioned query key for categories data
 * @param userId - The user ID
 * @param type - The category type
 * @param isRecurring - Whether it's recurring
 * @returns Versioned query key array
 */
export const categoriesQueryKey = (userId: string | undefined, type: string, isRecurring?: boolean) => [
  'categories',
  userId,
  type,
  isRecurring,
  CATEGORIES_CACHE_VERSION
];

/**
 * Creates a versioned query key for recurring expenses data
 * @param userId - The user ID
 * @returns Versioned query key array
 */
export const recurringExpensesQueryKey = (userId: string | undefined) => [
  'recurring_expenses',
  userId,
  RECURRING_EXPENSES_CACHE_VERSION
];
