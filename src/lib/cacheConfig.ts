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
