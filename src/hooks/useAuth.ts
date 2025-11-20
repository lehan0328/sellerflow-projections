import { useContext, useMemo } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export const useUserId = () => {
  const { user } = useAuth();
  return useMemo(() => user?.id ?? null, [user?.id]);
};