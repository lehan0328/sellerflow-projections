import React, { createContext, useContext, useCallback } from 'react';
import { usePlanLimits } from '@/hooks/usePlanLimits';

interface LimitCheckContextType {
  triggerLimitCheck: () => void;
}

const LimitCheckContext = createContext<LimitCheckContextType | undefined>(undefined);

export const LimitCheckProvider: React.FC<{ 
  children: React.ReactNode;
  onLimitViolation: (type: 'bank_connection' | 'amazon_connection' | 'user') => void;
}> = ({ children, onLimitViolation }) => {
  const { isOverBankLimit, isOverAmazonLimit, isOverTeamLimit, currentUsage, planLimits } = usePlanLimits();

  const triggerLimitCheck = useCallback(() => {
    console.log('[LimitCheckContext] Checking limits after action:', {
      isOverBankLimit,
      isOverAmazonLimit,
      isOverTeamLimit,
      currentUsage,
      planLimits
    });
    
    // Small delay to ensure database updates have propagated
    setTimeout(() => {
      if (isOverBankLimit) {
        console.log('[LimitCheckContext] Bank limit exceeded, showing modal');
        onLimitViolation('bank_connection');
      } else if (isOverAmazonLimit) {
        console.log('[LimitCheckContext] Amazon limit exceeded, showing modal');
        onLimitViolation('amazon_connection');
      } else if (isOverTeamLimit) {
        console.log('[LimitCheckContext] Team limit exceeded, showing modal');
        onLimitViolation('user');
      }
    }, 500); // 500ms delay for DB propagation
  }, [isOverBankLimit, isOverAmazonLimit, isOverTeamLimit, currentUsage, planLimits, onLimitViolation]);

  return (
    <LimitCheckContext.Provider value={{ triggerLimitCheck }}>
      {children}
    </LimitCheckContext.Provider>
  );
};

export const useLimitCheck = () => {
  const context = useContext(LimitCheckContext);
  // Return a no-op function if not within provider (e.g., standalone pages like AmazonOAuthCallback)
  if (context === undefined) {
    return { triggerLimitCheck: () => console.log('[useLimitCheck] Not within LimitCheckProvider, skipping check') };
  }
  return context;
};
