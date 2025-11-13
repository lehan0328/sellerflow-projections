/**
 * Shared cache configuration and versioning
 * Increment versions to bust cache after backend changes
 */

// Profile cache version - increment when profile schema/data changes
export const PROFILE_CACHE_VERSION = 2;

// Subscription cache version - managed in useSubscription.ts
export const SUBSCRIPTION_CACHE_VERSION = 2;

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
